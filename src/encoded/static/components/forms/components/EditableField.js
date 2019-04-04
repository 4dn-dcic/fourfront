'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import * as store from './../../../store';
import { ajax, console, object, isServerSide, navigate } from './../../util';




/**
 * FieldSet allows to group EditableFields together.
 * Will apply pass props to all child EditableFields which it wraps, including
 * context (JSON graph/output from server) and parent, if any.
 * Can also act as host of state.currentlyEditing (== props.labelID of
 * current EditableField being edited, if any) if props.parent is not supplied.
 *
 * @see EditableField
 */
export class FieldSet extends React.PureComponent {

    static propTypes = {
        children    : PropTypes.node,       // Inner fieldset content, should have at least 1 EditableField, probably more.
        context     : PropTypes.object,     // JSON graph/output from server representing page data. Passed to child EditableFields.
        endpoint    : PropTypes.string,     // Override context['@id'] (if doesn't exist, dif endpoint, etc.)
        inputSize   : PropTypes.oneOf(['sm', 'md', 'lg']),
        style       : PropTypes.oneOf(['row', 'minimal', 'inline']),
        parent      : PropTypes.any,        // Pass a parent React component, i.e. supply 'this' from a parent's render method,
                                            // to have it act as host of state.currentlyEditing. Use when there are other EditableFields
                                            // available on view/page which act on same props.context but not all within this FieldSet.
        className   : PropTypes.string,     // Additional className to prepend.
        schemas     : PropTypes.object      // Schemas to use for validation. If not provided, EditableField attempts to get from context
    }

    static defaultProps = {
        parent      : null, // if null, use own state
        context     : {},
        className   : null,
        endpoint    : null
    };

    static extractChildrenIds = memoize(function(children){
        var childIDs = [];
        React.Children.map(children, (child) => {
            if (child.props && child.props.labelID) {
                childIDs.push(child.props.labelID);
            }
        });
        return childIDs;
    });

    constructor(props){
        super(props);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.fullClassName = this.fullClassName.bind(this);
    }

    adjustedChildren(){
        var { children, endpoint, href, objectType, schemas, disabled, inputSize, style, absoluteBox, context, parent, windowWidth } = this.props;
        // Add shared props to children EditableField elements.
        return React.Children.map(children, (child)=>{
            if (child.type && child.type.displayName === 'EditableField'){
                var newProps = {};
                if (!child.props.context || _.isEmpty(child.props.context)) newProps.context = context;
                if (!child.props.parent)                          newProps.parent       = parent || this;
                if (!child.props.endpoint && endpoint)            newProps.endpoint     = endpoint;
                if (!child.props.href && href)                    newProps.href         = href;
                if (!child.props.objectType && objectType)        newProps.objectType   = objectType;
                if (!child.props.schemas && schemas)              newProps.schemas      = schemas;
                if (typeof child.props.disabled === 'undefined' && typeof disabled === 'boolean') newProps.disabled = disabled;
                if (inputSize)                                    newProps.inputSize    = inputSize; // Overwrite, since EditableField has default props.
                if (style)                                        newProps.style        = style;
                if (absoluteBox)                                  newProps.absoluteBox  = absoluteBox;
                if (windowWidth)                                  newProps.windowWidth  = windowWidth;

                return React.cloneElement(child, newProps);
            }
            return child;
        });
    }

    fullClassName(){
        var { className, style, inputSize, parent, children } = this.props,
            stateHolder = parent || this,
            childIDs    = FieldSet.extractChildrenIds(children); // Fallback to using self as state holder.

        return (
            (className ? className + ' ' : '') +
            "editable-fields fieldset" +
            (style ? ' ' + style : '') +
            (inputSize ? ' size-' + inputSize : '') +
            (
                stateHolder.state &&
                stateHolder.state.currentlyEditing &&
                childIDs.indexOf(stateHolder.state.currentlyEditing) > -1 ?
                    ' editing' : ''
            )
        );
    }

    render(){
        if (this.props.style === 'inline'){
            return <span className={this.fullClassName()}>{ this.adjustedChildren() }</span>;
        }
        return <div className={this.fullClassName()}>{ this.adjustedChildren() }</div>;
    }

}



/**
 * Display a field which may be edited & saved to server.
 * Currently can only be used on pages/views which have a context, i.e. JSON graph/output
 * from server, and only edit fields in that context.
 *
 * @see EditableField.propTypes for more info of props to provide.
 */
export class EditableField extends React.PureComponent {

    static displayName = 'EditableField';

    static propTypes = {
        label           : PropTypes.string,
        labelID         : PropTypes.string, // Property in context to be edited. Allows dot notation for nested values.
        parent          : PropTypes.any,    // Holds 'currentlyEditing' state (== labelID of field being edited.)
        fallbackText    : PropTypes.string, // Fallback text to display when no value is set/available.
        context         : PropTypes.object, // ToDo : validate context obj has property labelID.
        endpoint        : PropTypes.string, // Endpoint to PATCH update to. Defaults to props.context['@id'] if not set.
        fieldType       : PropTypes.string, // Type of field, used for rendering of input element & validation.
        style           : PropTypes.string, // Markup style, e.g. render row with label (default), minimal (just input field w/ buttons).
        inputSize       : PropTypes.oneOf(['sm', 'md', 'lg']), // Size of Bootstrap input field to use. Defaults to sm.
        children        : PropTypes.any,    // Rendered value of field, use custom formatting on a per-field basis. ToDo : create fallback.
        placeholder     : PropTypes.string,
        objectType      : PropTypes.string, // Class name of object being edited, e.g. User, Biosource, AccessKey, etc. for schema-based validation.
        pattern         : PropTypes.any,    // Optional pattern to use in lieu of one derived from schema or default field pattern.
                                            // If set to false, will skip (default or schema-based) validation.
        required        : PropTypes.bool,   // Optionally set if field is required, overriding setting derived from schema (if any). Defaults to false.
        schemas         : PropTypes.object.isRequired,
        debug           : PropTypes.bool    // Verbose lifecycle log messages.
    };

    static defaultProps = {
        fieldType : 'text',
        context : {},
        fallbackText : 'Not set',
        style : 'row',
        inputSize : 'sm',
        parent : null,
        pattern: null,
        required: false,
        schemas: null,
        debug: true
    };

    constructor(props){
        super(props);
        this.onResizeStateChange = this.onResizeStateChange.bind(this);
        this.objectType = this.objectType.bind(this);
        this.isSet = this.isSet.bind(this);
        this.isRequired = this.isRequired.bind(this);
        this.isValid = this.isValid.bind(this);
        this.fieldSchema = this.fieldSchema.bind(this);
        this.validationPattern = this.validationPattern.bind(this);
        this.validationFeedbackMessage = this.validationFeedbackMessage.bind(this);
        this.save = this.save.bind(this);
        this.enterEditState = this.enterEditState.bind(this);
        this.cancelEditState = this.cancelEditState.bind(this);
        this.saveEditState = this.saveEditState.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.renderActionIcon = this.renderActionIcon.bind(this);
        this.renderSavedValue = this.renderSavedValue.bind(this);
        this.renderSaved = this.renderSaved.bind(this);
        this.inputField = this.inputField.bind(this);
        this.renderEditing = this.renderEditing.bind(this);

        var initialValue = null;
        try {
            initialValue = object.getNestedProperty(props.context, props.labelID); // Returns undefined if doesn't exist in context
        } catch (e){
            console.error(e);
        }
        this.state = {
            'value'             : initialValue || null, // Changes on input field change
            'savedValue'        : initialValue || null, // Changes only on sync w/ server.
            'valueExistsOnObj'  : typeof initialValue !== 'undefined', // If undefined then field doesn't exist on props.context
            'validationPattern' : props.pattern || this.validationPattern(),
            'required'          : props.required || this.isRequired(),
            'valid'             : null,                 // Must distinguish between true, false, and null.
            'serverErrors'      : [],                   // Validation state sent from server.
            'serverErrorsMessage' : null,
            'loading'           : false,                // True if in middle of save or fetch request.
            'dispatching'       : false,                // True if dispatching to Redux store.
            'leanTo'            : null,                 // Re: inline style
            'leanOffset'        : 0                     // Re: inline style
        };

        this.fieldRef = React.createRef();          // Field container element
        this.inputElementRef = React.createRef();   // Input element
    }

    onResizeStateChange(){
        var fieldElem = this.fieldRef.current;
        if (!fieldElem || !fieldElem.offsetParent){
            return;
        }

        this.setState(function(currState){
            var parentWidth = fieldElem.offsetParent.offsetWidth,
                selfWidth   = fieldElem.offsetWidth,
                offsetLeft  = fieldElem.offsetLeft,
                offsetRight = (parentWidth - offsetLeft) - selfWidth,
                leanTo      = offsetLeft > offsetRight ? 'left' : 'right',
                leanOffset  = 280 - (parentWidth - Math.min(offsetLeft, offsetRight));

            if (currState.leanTo === leanTo && currState.leanOffset === leanOffset){
                return null;
            }

            return { leanTo, leanOffset };
        });
    }

    componentWillReceiveProps(newProps, newContext){
        var newState = {},
            stateChangeCallback = null;

        // Reset value/savedValue if props.context or props.labelID changes for some reason.
        if (
            !this.state.dispatching && (
                (this.props.context !== newProps.context) ||
                (this.props.labelID !== newProps.labelID)
            )
        ) {
            var newVal = object.getNestedProperty(newProps.context, this.props.labelID, true);
            newState.savedValue = newState.value = newVal || null;
            newState.valueExistsOnObj = typeof newVal !== 'undefined';
        }
        // Update state.validationPattern && state.isRequired if this.props.schemas becomes available
        // (loaded via ajax by app.js) or from props if is provided.
        if (
            newProps.schemas !== this.props.schemas ||
            newProps.pattern !== this.props.pattern ||
            newProps.required !== this.props.required
        ){
            newState.validationPattern = newProps.pattern || this.validationPattern(newProps.schemas);
            newState.required = newProps.required || this.isRequired(newProps.schemas);
            // Also, update state.valid if in editing mode
            if (this.props.parent.state && this.props.parent.state.currentlyEditing && this.inputElementRef.current){
                stateChangeCallback = this.handleChange;
            }
        }
        // Apply state edits, if any
        if (_.keys(newState).length > 0) this.setState(newState, stateChangeCallback);
    }

    componentDidUpdate(oldProps, oldState){
        // If state change but not onChange event -- e.g. change to/from editing state
        if (
            oldState.value === this.state.value &&
            oldState.loading === this.state.loading &&
            oldState.dispatching === this.state.dispatching &&
            oldState.savedValue === this.state.savedValue
        ){
            if (this.justUpdatedLayout){
                this.justUpdatedLayout = false;
                return false;
            }
            if (this.props.parent.state && this.props.parent.state.currentlyEditing === this.props.labelID){
                this.onResizeStateChange();
            } else {
                this.setState({ 'leanTo' : null });
            }
            this.justUpdatedLayout = true;
        }
    }

    objectType(){
        if (this.props.objectType) return this.props.objectType;
        if (this.props.context && this.props.context['@type'] && this.props.context['@type'].length > 0){
            return this.props.context['@type'][0];
        }
        return null;
    }

    isSet(){
        var { context } = this.props, { savedValue } = this.state;
        return (
            typeof context === 'object' &&
            !_.isEmpty(context) &&
            typeof savedValue !== 'undefined' &&
            savedValue !== null &&
            savedValue !== ''
        );
    }

    /** Check if field is required based on schemas. */
    isRequired(schemas = this.props.schemas){
        if (!schemas) return false;
        var objectType = this.objectType();
        if (!objectType) return false;
        var objectSchema = schemas[objectType];
        if (
            objectSchema &&
            typeof objectSchema.required !== 'undefined' &&
            Array.isArray(objectSchema.required) &&
            objectSchema.required.indexOf(this.props.labelID) > -1
        ) return true;
        return false;
    }

    isValid(checkServer = false){
        if (typeof this.state.valid === 'boolean' && this.state.valid === false){
            return false;
        }
        if (checkServer && this.state.serverErrors && this.state.serverErrors.length > 0) {
            return false;
        }
        return true;
    }

    /** Return the schema for the provided props.labelID and (props.objectType or props.context['@type'][0]) */
    fieldSchema(schemas = this.props.schemas){
        // We do not handle nested, linked or embedded properties for now.
        if (!this.props.labelID || this.props.labelID.indexOf('.') > -1) return null;
        if (schemas === null) return null;

        // We don't know what type of schema to get w/o objecttype.
        var objectType = this.objectType();
        if (!objectType) return null;

        return object.getNestedProperty(
            schemas,
            [objectType, 'properties', this.props.labelID],
            true
        ) || null;
    }

    /**
     * Get a validation pattern to check input against for text(-like) fields.
     * Try to get from this.props.schemas based on object type (User, ExperimentHIC, etc.) and props.labelID.
     * Defaults to generic per-fieldType validation pattern if available and pattern not set schemas, or null if not applicable.
     *
     * @todo Maybe move part of this to util/Schemas.js
     * @return {RegExp|null} Pattern to input validate against.
     */
    validationPattern(schemas = this.props.schemas){
        const { labelID, fieldType, debug } = this.props;

        const getPatternFromSchema = () => { // TODO: Maybe move to util/Schemas.js
            // We do not handle nested, linked or embedded properties for now.
            if (!schemas || !labelID || labelID.indexOf('.') > -1) return null;

            var fieldSchema = this.fieldSchema(schemas);

            if (!fieldSchema || typeof fieldSchema.pattern === 'undefined') return null; // No pattern set.
            if (debug) console.info('Obtained EditableField validationPattern from schema (' + [this.objectType(), 'properties', labelID].join('.') + ')');
            return fieldSchema.pattern;
        };

        var schemaDerivedPattern = getPatternFromSchema();
        if (schemaDerivedPattern) return schemaDerivedPattern;

        // Fallback to generic pattern, if applicable for props.fieldType.
        if      (fieldType === 'phone') return object.itemUtil.User.localRegexValidation.phone;
        else if (fieldType === 'email') return object.itemUtil.User.localRegexValidation.email;
        else return null;
    }

    validationFeedbackMessage(){
        var { fieldType } = this.props,
            { required, valid, validationMessage, serverErrors, serverErrorsMessage } = this.state;
        //if (this.isValid(true)) return null;
        // ^ Hide via CSS instead.

        if (required && valid === false && validationMessage){
            // Some validationMessages provided by browser don't give much info, so use it selectively (if at all).
            return <span className="help-block">{ validationMessage }</span>;
        }

        if (Array.isArray(serverErrors) && serverErrors.length > 0) {
            return (
                <span className="help-block">
                    { serverErrorsMessage ? <b>{ serverErrorsMessage }</b> : null }
                    { _.map(serverErrors, (err, i) =>
                        <div key={'error-' + i}>{ (serverErrors.length === 1 ? '' : (i + 1) + '. ') + err.description }</div>
                    ) }
                </span>
            );
        }

        switch(fieldType){

            case 'phone':
                return (
                    <span className="help-block">
                        Only use digits &mdash; no dashes, spaces, or parantheses.
                        Optionally may include leading '+' or extension.<br/>
                        <b>e.g.:</b> <code>+######### x###</code>
                    </span>
                );
            case 'email':
                return <span className="help-block">Please enter a valid email address.</span>;
            case 'username':
            case 'text':
            default:
                return null;
        }
    }

    save(successCallback = null, errorCallback = null){
        const { labelID, endpoint, context, parent } = this.props;

        const errorFallback = (res) => {
            // ToDo display (bigger?) errors
            console.error("Error: ", res);
            this.setState({ 'serverErrors' : res.errors, 'serverErrorsMessage' : res.description, 'loading' : false }, errorCallback);
            return;
        };

        this.setState({ 'loading' : true }, ()=>{
            const value = this.state.value;
            const timestamp   = Math.floor(Date.now ? Date.now() / 1000 : (new Date()).getTime() / 1000);

            let ajaxEndpoint = (endpoint || object.itemUtil.atId(context) ) + '?ts=' + timestamp;
            let patchData = null;

            if (value === ''){ // Send delete fields request instd of normal patch
                ajaxEndpoint += '&delete_fields=' + labelID;
                patchData = object.generateSparseNestedProperty(labelID, undefined);
            } else {
                patchData = object.generateSparseNestedProperty(labelID, value);
            }

            ajax.load(ajaxEndpoint, (r) => {
                console.info('EditableField Save Result:', r);

                if (r.status !== 'success') return errorFallback(r);

                var nextContext     = _.clone(context),
                    extendSuccess   = object.deepExtend(nextContext, patchData);

                if (extendSuccess){
                    this.setState({ 'savedValue' : value, 'value' : value, 'dispatching' : true }, ()=> {
                        var unsubscribe = store.subscribe(()=>{
                            unsubscribe();
                            setTimeout(()=>{
                                parent.setState({ 'currentlyEditing' : null }, ()=> {
                                    this.setState({ 'loading' : false, 'dispatching' : false });
                                    if (typeof successCallback === 'function') successCallback(r);
                                });
                            },0);
                        });
                        store.dispatch({
                            type: { 'context': nextContext }
                        });
                    });

                } else {
                    // Couldn't insert into current context, refetch from server :s.
                    console.warn("Couldn't update current context, fetching from server.");
                    navigate('', {'inPlace':true});
                }

            }, 'PATCH', errorFallback, JSON.stringify(patchData));
        });
    }

    enterEditState(e){
        e.preventDefault();
        if (this.props.parent.state && this.props.parent.state.currentlyEditing) return null;
        this.props.parent.setState({ currentlyEditing : this.props.labelID });
    }

    cancelEditState(e){
        var parent = this.props.parent;
        e.preventDefault();
        if (!parent.state || !parent.state.currentlyEditing) {
            throw new Error('No state was set on parent.');
        }
        this.setState(function({ savedValue }){
            return { 'value' : savedValue, 'valid' : null, 'validationMessage' : null };
        });
        parent.setState({ 'currentlyEditing' : null });
    }

    saveEditState(e){
        e.preventDefault();
        if (!this.isValid()){
            // ToDo : Bigger notification to end user that something is wrong.
            console.error("Cannot save " + this.props.labelID + "; value is not valid:", this.state.value);
            return;
        } else if (this.state.value === this.state.savedValue){
            return this.cancelEditState(e);
        }

        this.save(()=>{
            // Success callback
            console.info("Saved " + this.props.labelID + " : " + this.state.savedValue);
        });
    }

    /** Update state.value on each keystroke/input and check validity. */
    handleChange(e){
        var inputElement = e && e.target ? e.target : this.inputElementRef.current;
        var state = {
            'value' : inputElement.value // ToDo: change to (inputElement.value === '' ? null : inputElement.value)  and enable to process it on backend.
        };
        if (inputElement.validity){
            if (typeof inputElement.validity.valid == 'boolean') {
                state.valid = inputElement.validity.valid;
            }
        }
        if (inputElement.validationMessage){
            state.validationMessage = inputElement.validationMessage;
        }

        // Reset serverErrors if any
        if (this.state.serverErrors && this.state.serverErrors.length > 0) {
            state.serverErrors = [];
            state.serverErrorsMessage = null;
        }

        // ToDo : cross-browser validation check + set error state then use for styling, etc.
        this.setState(state);
    }

    renderActionIcon(type = 'edit'){

        var extClass = "right";
        if (this.props.style === 'inline') extClass = "inline";

        if (this.state.loading){
            switch (type){
                case 'save' : return null;
                case 'cancel' : return (
                    <span className={extClass + " field-loading-icon"}>
                        <i className="icon icon-spin icon-circle-o-notch icon-fw"></i>
                    </span>
                );
            }
        }

        switch (type){
            case 'edit' :
                if (this.props.disabled) {
                    if (!this.props.info) return null;
                    // ToDo info popup or tooltip
                    return (
                        <span className={extClass + " edit-button info disabled"}>
                            <i className="icon icon-info-circle icon-fw"></i>
                        </span>
                    );
                }
                return (
                    <a href={ "#edit-" + this.props.labelID } className={extClass + " edit-button"} onClick={ this.enterEditState } title="Edit">
                        <i className="icon icon-pencil icon-fw"></i>
                    </a>
                );
            case 'save' :
                if (!this.isValid(false)) return null;
                return (
                    <a href={ "#save-" + this.props.labelID } className={extClass + " save-button"} onClick={this.saveEditState} title="Save">
                        <i className="icon icon-check icon-fw"></i>
                    </a>
                );
            case 'cancel': return (
                <a href="#" className={extClass + " cancel-button"} onClick={this.cancelEditState} title="Cancel">
                    <i className="icon icon-times-circle-o icon-fw"></i>
                </a>
            );
        }
    }

    renderSavedValue(){
        var renderedValue = this.props.children || this.state.savedValue,
            classes = ['value', 'saved'];

        switch (this.props.style){

            case 'row':
            case 'minimal':
                if (this.props.style === 'row') classes.push('col-sm-9');
                return (
                    <div className={classes.join(' ')}>
                        { this.renderActionIcon('edit') }
                        { this.isSet() ?
                            <span id={ this.props.labelID } className="set">{ renderedValue }</span>
                            :
                            <span className="not-set">{ this.props.fallbackText || ('No ' + this.props.labelID) }</span>
                        }
                    </div>
                );

            case 'inline':
                return (
                    <span className={classes.join(' ')}>
                        { this.isSet() ?
                            <span id={ this.props.labelID } className="set">{ renderedValue }</span>
                            :
                            <span className="not-set">{ this.props.fallbackText || ('No ' + this.props.labelID) }</span>
                        }
                        { this.renderActionIcon('edit') }
                    </span>
                );
        }
        return null;
    }

    renderSaved(){
        if (this.props.style === 'row'){
            return (
                <div className={"row editable-field-entry " + this.props.labelID}>
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor={ this.props.labelID }>{ this.props.label }</label>
                    </div>
                    { this.renderSavedValue() }
                </div>
            );
        }
        if (this.props.style === 'minimal'){
            return (
                <div className={"editable-field-entry " + this.props.labelID}>
                    { this.renderSavedValue() }
                </div>
            );
        }
        if (this.props.style === 'inline'){
            return (
                <span className={"editable-field-entry inline " + this.props.labelID}>
                    { this.renderSavedValue() }
                </span>
            );
        }

    }

    /** Render an input field; for usage in this.renderEditing() */
    inputField(){
        // ToDo : Select boxes, radios, checkboxes, etc.
        var commonProps = {
            'id'        : this.props.labelID,
            'required'  : this.state.required,
            'disabled'  : this.props.disabled || false,
            'ref'       : this.inputElementRef
        };
        var commonPropsTextInput = _.extend({
            'className'     : 'form-control input-' + this.props.inputSize,
            'value'         : this.state.value || '',
            'onChange'      : this.handleChange,
            'name'          : this.props.labelID,
            'autoFocus'     : true,
            'placeholder'   : this.props.placeholder,
            'pattern'       : this.state.validationPattern
        }, commonProps);

        switch(this.props.fieldType){

            case 'phone': return (
                <span className="input-wrapper">
                    <input type="text" inputMode="tel" autoComplete="tel" {...commonPropsTextInput} />
                    { this.validationFeedbackMessage() }
                </span>
            );
            case 'email': return (
                <span className="input-wrapper">
                    <input type="email" autoComplete="email" {...commonPropsTextInput} />
                    { this.validationFeedbackMessage() }
                </span>
            );
            case 'username' : return (
                <span className="input-wrapper">
                    <input type="text" inputMode="latin-name" autoComplete="username" {...commonPropsTextInput} />
                    { this.validationFeedbackMessage() }
                </span>
            );
            case 'text' : return (
                <span className="input-wrapper">
                    <input type="text" inputMode="latin" {...commonPropsTextInput} />
                    { this.validationFeedbackMessage() }
                </span>
            );
        }
        // Fallback (?)
        return <span>No edit field created yet.</span>;
    }

    /** Render 'in edit state' view */
    renderEditing(){
        var { inputSize, style, labelID, label, absoluteBox } = this.props,
            { leanTo, leanOffset } = this.state,
            outerBaseClass = "editable-field-entry editing has-feedback" +
                (!this.isValid(true) ? ' has-error ' : ' has-success ') +
                ('input-size-' + inputSize + ' ');

        if (style == 'row') {
            return (
                <div className={outerBaseClass + labelID + ' row'}>
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor={labelID }>{ label }</label>
                    </div>
                    <div className="col-sm-9 value editing">
                        { this.renderActionIcon('cancel') }
                        { this.renderActionIcon('save') }
                        { this.inputField() }
                    </div>
                </div>
            );
        }

        if (style == 'minimal') {
            return (
                <div className={ outerBaseClass + labelID }>
                    <div className="value editing">
                        { this.renderActionIcon('cancel') }
                        { this.renderActionIcon('save') }
                        { this.inputField() }
                    </div>
                </div>
            );
        }

        if (style == 'inline') {
            var valStyle = {};
            if (absoluteBox){
                if (leanTo === null){
                    valStyle.display = 'none';
                } else {
                    valStyle[leanTo === 'left' ? 'right' : 'left'] = (leanOffset > 0 ? (0 - leanOffset) : 0) + 'px';
                }
            }
            return (
                <span ref={absoluteBox ? this.fieldRef : null} className={ outerBaseClass + labelID + ' inline' + (absoluteBox ? ' block-style' : '') }>
                    { absoluteBox ? this.renderSavedValue() : null }
                    <span className="value editing clearfix" style={valStyle}>
                        { this.inputField() }
                        { this.renderActionIcon('cancel') }
                        { this.renderActionIcon('save') }
                    </span>
                </span>
            );
        }

    }

    render(){
        if (this.props.disabled && !this.state.valueExistsOnObj && !this.props.forceVisible) {
            // Field is empty (not returned in object) & not allowed to be edited, so assume end-user doesn't have permission to view.
            return null;
        }
        if (this.props.parent && this.props.parent.state && this.props.parent.state.currentlyEditing === this.props.labelID) {
            return this.renderEditing();
        } else {
            return this.renderSaved();
        }
    }

}
