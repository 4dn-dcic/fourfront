'use strict';

var React = require('react');
var _ = require('underscore');
var store = require('../store');
var { ajaxLoad, console, getNestedProperty, isServerSide } = require('./objectutils');

/**
 * FieldSet allows to group EditableFields together.
 * Will apply pass props to all child EditableFields which it wraps, including 
 * context (JSON graph/output from server) and parent, if any.
 * Can also act as host of state.currentlyEditing (== props.labelID of 
 * current EditableField being edited, if any) if props.parent is not supplied.
 * 
 * @see EditableField
 */

var FieldSet = module.exports.FieldSet = React.createClass({

    propTypes : {
        children : React.PropTypes.node,    // Inner fieldset content, should have at least 1 EditableField, probably more.
        context : React.PropTypes.object,   // JSON graph/output from server representing page data. Passed to child EditableFields.
        endpoint : React.PropTypes.string,  // Override context['@id'] (if doesn't exist, dif endpoint, etc.)
        inputSize : React.PropTypes.oneOf(['sm', 'md', 'lg']),
        style : React.PropTypes.oneOf(['row', 'minimal', 'inline']),
        parent : React.PropTypes.any,       // Pass a parent React component, i.e. supply 'this' from a parent's render method, 
                                            // to have it act as host of state.currentlyEditing. Use when there are other EditableFields
                                            // available on view/page which act on same props.context but not all within this FieldSet.
        className : React.PropTypes.string, // Additional className to prepend.
    },

    getDefaultProps : function(){
        return {
            parent : null, // if null, use own state
            context : {},
            className : null,
            endpoint : null
        };
    },

    children : null,
    childrenIDs : [],

    componentWillMount : function(){
        this.children = this.adjustedChildren();
        this.childrenIDs = this.getChildrenIDs();
    },

    componentWillUpdate : function(newProps){
        if (this.props.children !== newProps.children){
            this.children = this.adjustedChildren();
            this.childrenIDs = this.getChildrenIDs();
        }
    },

    adjustedChildren : function(){
        // Add shared props to children EditableField elements.
        return React.Children.map(this.props.children, (child)=>{
            if (child.type && child.type.displayName == 'EditableField'){
                var newProps = {};
                if (!child.props.context || _.isEmpty(child.props.context)) newProps.context = this.props.context;
                if (!child.props.parent) newProps.parent = this.props.parent || this;
                if (!child.props.endpoint && this.props.endpoint) newProps.endpoint = this.props.endpoint;
                if (!child.props.objectType && this.props.objectType) newProps.objectType = this.props.endpoint;
                if (
                    typeof child.props.disabled === 'undefined' &&
                    typeof this.props.disabled === 'boolean'
                ) newProps.disabled = this.props.disabled;
                if (this.props.inputSize) newProps.inputSize = this.props.inputSize; // Overwrite, since EditableField has default props.
                if (this.props.style) newProps.style = this.props.style;
                if (this.props.absoluteBox) newProps.absoluteBox = this.props.absoluteBox;

                child = React.cloneElement(child, newProps);
            };
            return child;
        });
    },

    getChildrenIDs : function(){
        var childIDs = [];
        React.Children.map((this.children || this.props.children), (child) => { 
            if (child.props && child.props.labelID) childIDs.push(child.props.labelID);
        });
        return childIDs;
    },

    fullClassName : function(){
        var stateHolder = this.props.parent || this; // Fallback to using self as state holder.
        return (
            (this.props.className ? this.props.className + ' ' : '') + 
            "editable-fields fieldset" + 
            (this.props.style ? ' ' + this.props.style : '') +
            (this.props.inputSize ? ' size-' + this.props.inputSize : '') +
            (
                stateHolder.state && 
                stateHolder.state.currentlyEditing && 
                this.childrenIDs.indexOf(stateHolder.state.currentlyEditing) > -1 ? 
                    ' editing' : ''
            )
        );
    },

    render : function(){
        if (this.props.style === 'inline'){
            return <span className={this.fullClassName()}>{ this.children }</span>;
        }
        return <div className={this.fullClassName()}>{ this.children }</div>;
    }

});

/**
 * Display a field which may be edited & saved to server.
 * Currently can only be used on pages/views which have a context, i.e. JSON graph/output
 * from server, and only edit fields in that context.
 * 
 * @see EditableField.propTypes for more info of props to provide.
 */
var EditableField = module.exports.EditableField = React.createClass({

    statics : {
        regex : {
            // http://www.regular-expressions.info/email.html -> changed capital A to lowercase
            email : '^[a-Z0-9][a-Z0-9._%+-]{0,63}@(?:(?=[a-Z0-9-]{1,63}\.)[a-Z0-9]+(?:-[a-Z0-9]+)*\.){1,8}[a-Z]{2,63}$',
            // Digits only, with optional extension (space + x, ext, extension + [space?] + 1-7 digits) and 
            // optional leading plus sign (for international)
            phone : '[+]?[\\d]{10,36}((\\sx|\\sext|\\sextension)(\\s)?[\\d]{1,7})?$'
        },

        /**
         * Sets value to be deeply nested within an otherwise empty object, given a field with dot notation.
         * Use for creating objects for PATCH requests. Does not currently support arrays.
         * If want to update a full object rather than create an empty one, use @see EditableField.deepInsertObj with output.
         * 
         * @param {string|string[]} field - Property name of object of where to nest value, in dot-notation or pre-split into array.
         * @param {*} value - Any value to nest.
         * @returns {Object} - Object with deepy-nested value.
         * @example 
         *   EditableField.generateNestedProperty('human.body.leftArm.indexFinger', 'Orange') returns
         *   { human : { body : { leftArm : { indexFinger : 'Orange' } } } }
         */
        generateNestedProperty : function(field, value){
            if (typeof field === 'string') field = field.split('.');
            if (!Array.isArray(field)) throw new Error("Could not create nested field in object. Check field name.");

            var currObj = {};
            currObj[field.pop()] = value;

            if (field.length === 0) return currObj;
            return EditableField.generateNestedProperty(field, currObj);
        },

        /**
         * Performs a 'deep merge' of a small object (one property per level, max) into a host object.
         */
        deepInsertObj : function(hostObj, nestedObj, depth = 0){
            var nKey = Object.keys(nestedObj)[0]; // Should only be 1.
            if (depth > 10){
                // Doubt we'd go this deep... so cancel out
                return false;
            }
            if (typeof hostObj[nKey] !== 'undefined'){
                if (typeof nestedObj[nKey] === 'object' && !Array.isArray(hostObj[nKey]) ){
                    return EditableField.deepInsertObj(hostObj[nKey], nestedObj[nKey], depth + 1);
                } else {
                    // No more nested objects, insert here.
                    hostObj[nKey] = nestedObj[nKey];
                    return true;
                }
            } else if (typeof nestedObj[nKey] !== 'undefined') {
                // Field doesn't exist on hostObj, but does on nestedObj, == new field.
                hostObj[nKey] = nestedObj[nKey];
                return true;
            } else {
                // Whoops, doesn't seem like fields match.
                return false;
            }
        }
    },

    contextTypes: {
        navigate: React.PropTypes.func,
        schemas : React.PropTypes.object    // @see app.js > App.loadSchemas
    },

    propTypes : {
        label : React.PropTypes.string,
        labelID : React.PropTypes.string,   // Property in context to be edited. Allows dot notation for nested values.
        parent : React.PropTypes.any,       // Holds 'currentlyEditing' state (== labelID of field being edited.)
        fallbackText : React.PropTypes.string, // Fallback text to display when no value is set/available.
        context : React.PropTypes.object,   // ToDo : validate context obj has property labelID.
        endpoint : React.PropTypes.string,  // Endpoint to PATCH update to. Defaults to props.context['@id'] if not set.
        fieldType : React.PropTypes.string, // Type of field, used for rendering of input element & validation.
        style : React.PropTypes.string,     // Markup style, e.g. render row with label (default), minimal (just input field w/ buttons).
        inputSize : React.PropTypes.oneOf(['sm', 'md', 'lg']), // Size of Bootstrap input field to use. Defaults to sm.
        children : React.PropTypes.any,     // Rendered value of field, use custom formatting on a per-field basis. ToDo : create fallback.
        placeholder : React.PropTypes.string,
        objectType: React.PropTypes.string, // Class name of object being edited, e.g. User, Biosource, AccessKey, etc. for schema-based validation.
        pattern : React.PropTypes.any,      // Optional pattern to use in lieu of one derived from schema or default field pattern. 
                                            // If set to false, will skip (default or schema-based) validation.
        required : React.PropTypes.bool,    // Optionally set if field is required, overriding setting derived from schema (if any). Defaults to false.
        debug : React.PropTypes.bool        // Verbose lifecycle log messages.
    },

    getDefaultProps : function(){
        return {
            fieldType : 'text',
            context : {},
            fallbackText : 'Not set',
            style : 'row',
            inputSize : 'sm',
            parent : null,
            pattern: null,
            required: false,
            debug: true
        };
    },

    getInitialState : function(){
        var value = getNestedProperty(this.props.context, this.props.labelID);
        return {
            'value' : value || null,        // Changes on input field change
            'savedValue' : value || null,   // Changes only on sync w/ server.
            'validationPattern' : this.props.pattern || this.validationPattern(),
            'required' : this.props.required || this.isRequired(),
            'valid' : null,                 // Must distinguish between true, false, and null.
            'serverErrors' : [],            // Validation state sent from server.
            'serverErrorsMessage' : null,
            'loading' : false,              // True if in middle of save or fetch request.
            'dispatching' : false,          // True if dispatching to Redux store.
            'leanTo' : null,                // Re: inline style
            'leanOffset' : 0                // Re: inline style
        };
    },

    componentDidMount: function(){
        if (this.props.style === 'inline' && this.props.absoluteBox && !isServerSide()){

            this.debouncedLayoutResizeStateChange = _.debounce(() => {
                if (this.refs.field && this.refs.field.offsetParent){
                    var offsetRight = (this.refs.field.offsetParent.offsetWidth - this.refs.field.offsetLeft) - this.refs.field.offsetWidth;
                    //var inputOffsetRight = (this.refs.field.offsetParent.offsetWidth - this.refs.field.nextElementSibling.offsetLeft) - this.refs.field.nextElementSibling.offsetWidth;
                    this.setState({ 
                        'leanTo' : 
                            this.refs.field.offsetLeft > offsetRight ?
                            'left' : 'right',
                        'leanOffset' : 280 - (this.refs.field.offsetParent.offsetWidth - Math.min(this.refs.field.offsetLeft, offsetRight))
                    });
                }
            }, 300, false);

            window.addEventListener('resize', this.debouncedLayoutResizeStateChange);

        }
    },

    componentWillUnmount : function(){
        if (typeof this.debouncedLayoutResizeStateChange !== 'undefined'){
            window.removeEventListener('resize', this.debouncedLayoutResizeStateChange);
        }
    },

    componentDidUpdate : function(oldProps, oldState){
        // If state change but not onChange event -- e.g. change to/from editing state
        if (
            typeof this.debouncedLayoutResizeStateChange !== 'undefined' &&
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
                this.debouncedLayoutResizeStateChange();
            } else {
                this.setState({ 'leanTo' : null });
            }
            this.justUpdatedLayout = true;
        }
    },

    componentWillReceiveProps : function(newProps, newContext){
        var newState = {},
            stateChangeCallback = null;

        // Reset value/savedValue if props.context or props.labelID changes for some reason.
        if (
            !this.state.dispatching && (
                (this.props.context !== newProps.context) ||
                (this.props.labelID !== newProps.labelID)
            )
        ) {
            newState.savedValue = newState.value = getNestedProperty(newProps.context, this.props.labelID) || null;
        }
        // Update state.validationPattern && state.isRequired if this.context.schemas becomes available 
        // (loaded via ajax by app.js) or from props if is provided.
        if (newContext.schemas !== this.context.schemas || newProps.pattern !== this.props.pattern || newProps.required !== this.props.required){
            newState.validationPattern = newProps.pattern || this.validationPattern(newContext.schemas);
            newState.required = newProps.required || this.isRequired(newContext.schemas);
            // Also, update state.valid if in editing mode
            if (this.props.parent.state && this.props.parent.state.currentlyEditing && this.refs && this.refs.inputElement){
                stateChangeCallback = this.handleChange;
            }
        }
        // Apply state edits, if any
        if (Object.keys(newState).length > 0) this.setState(newState, stateChangeCallback);
    },

    isSet : function(){ return typeof this.props.context === 'object' && !_.isEmpty(this.props.context) && this.state.savedValue !== null && this.state.savedValue !== '' ; },

    enterEditState : function(e){
        e.preventDefault();
        if (this.props.parent.state && this.props.parent.state.currentlyEditing) return null;
        this.props.parent.setState({ currentlyEditing : this.props.labelID });
    },

    cancelEditState : function(e){
        e.preventDefault();
        if (!this.props.parent.state || !this.props.parent.state.currentlyEditing) {
            throw new Error('No state was set on parent.');
        }
        this.setState({ value : this.state.savedValue, valid : null, validationMessage : null });
        this.props.parent.setState({ currentlyEditing : null });
    },

    isValid : function(checkServer = false){
        if (typeof this.state.valid === 'boolean' && this.state.valid === false){
            return false;
        };
        if (checkServer && this.state.serverErrors && this.state.serverErrors.length > 0) {
            return false;
        }
        return true;
    },

    saveEditState : function(e){
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
    },

    fetch : function(){
        ajaxLoad(this.props.endpoint || this.props.context['@id'], (r)=>{
            var val = getNestedProperty(r, this.props.labelID);
            this.setState({ value : val, savedValue : val });
        }, 'GET');
    },

    save : function(successCallback = null, errorCallback = null){

        var errorFallback = function(r){
            // ToDo display (bigger?) errors
            console.error("Error: ", r);
            this.setState({ serverErrors : r.errors, serverErrorsMessage : r.description, loading : false }, errorCallback);
            return;
        }.bind(this);

        this.setState({ loading : true }, ()=>{
            var value = this.state.value;
            var patchData = EditableField.generateNestedProperty(this.props.labelID, value);
            var timestamp = Math.floor(Date.now ? Date.now() / 1000 : (new Date()).getTime() / 1000);
            ajaxLoad((this.props.endpoint || this.props.context['@id']) + '?ts=' + timestamp, (r)=>{
                console.log('EditableField Save Result:', r);

                if (r.status !== 'success'){
                    return errorFallback(r);
                } 

                var updatedContext = _.clone(this.props.context);
                var inserted = EditableField.deepInsertObj(updatedContext, patchData);
                if (inserted){
                    this.setState({ 'savedValue' : value, 'value' : value, 'dispatching' : true }, ()=> {
                        var unsubscribe = store.subscribe(()=>{
                            unsubscribe();
                            setTimeout(()=>{
                                this.props.parent.setState({ currentlyEditing : null }, ()=> {
                                    this.setState({ 'loading' : false, 'dispatching' : false });
                                    if (typeof successCallback === 'function') successCallback(r);
                                });
                            },0);
                        });
                        store.dispatch({
                            type: { 'context': updatedContext }
                        });
                    });
                    
                } else {
                    // Couldn't insert into current context, refetch from server :s.
                    console.warn("Couldn't update current context, fetching from server.");
                    this.context.navigate('', {'inPlace':true});
                    // ToDo : ...navigate(inPlace)...
                }

            }, 'PATCH', errorFallback, JSON.stringify(patchData));
        });
    },

    /** Update state.value on each keystroke/input and check validity. */
    handleChange : function(e){
        var inputElement = e && e.target ? e.target : this.refs.inputElement;
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
    },

    renderActionIcon : function(type = 'edit'){

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
                        <i className="icon icon-save icon-fw"></i>
                    </a>
                );
            case 'cancel': return (
                <a href="#" className={extClass + " cancel-button"} onClick={this.cancelEditState} title="Cancel">
                    <i className="icon icon-times-circle-o icon-fw"></i>
                </a>
            );
        }
    },

    renderSavedValue : function(){
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
    },

    renderSaved : function(){
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

    },

    objectType : function(){
        if (this.props.objectType) return this.props.objectType;        
        if (this.props.context && this.props.context['@type'] && this.props.context['@type'].length > 0){
            return this.props.context['@type'][0];
        } 
        return null;
    },

    /** Return the schema for the provided props.labelID and (props.objectType or props.context['@type'][0]) */
    fieldSchema : function(schemas = this.context.schemas){
        // We do not handle nested, linked or embedded properties for now.
        if (!this.props.labelID || this.props.labelID.indexOf('.') > -1) return null;
        if (schemas === null) return null;

        // We don't know what type of schema to get w/o objecttype.
        var objectType = this.objectType();
        if (!objectType) return null;

        return getNestedProperty(
            schemas,
            [objectType, 'properties', this.props.labelID]
        ) || null;
    },

    /** 
     * Get a validation pattern to check input against for text(-like) fields.
     * Try to get from this.context.schemas based on object type (User, ExperimentHIC, etc.) and props.labelID.
     * Defaults to generic per-fieldType validation pattern if available and pattern not set schemas, or null if not applicable.
     * 
     * @return {*} Pattern to input validate against.
     */
    validationPattern : function(schemas = this.context.schemas){
        
        function getPatternFromSchema(){
            // We do not handle nested, linked or embedded properties for now.
            if (!schemas || !this.props.labelID || this.props.labelID.indexOf('.') > -1) return null;

            var fieldSchema = this.fieldSchema(schemas);

            if (!fieldSchema || typeof fieldSchema.pattern === 'undefined') return null; // No pattern set.
            if (this.props.debug) console.info('Obtained EditableField validationPattern from schema (' + [this.objectType(), 'properties', this.props.labelID].join('.') + ')');
            return fieldSchema.pattern;
        }

        var schemaDerivedPattern = getPatternFromSchema.call(this);
        if (schemaDerivedPattern) return schemaDerivedPattern;

        // Fallback to generic pattern, if applicable for props.fieldType.
        if (this.props.fieldType === 'phone') return EditableField.regex.phone;
        if (this.props.fieldType === 'email') return EditableField.regex.email;
        return null;
    },

    /** Check if field is required based on schemas. */
    isRequired : function(schemas = this.context.schemas){
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
    },

    validationFeedbackMessage : function(){
        //if (this.isValid(true)) return null;
        // ^ Hide via CSS instead.

        if (this.state.required && this.state.valid === false && this.state.validationMessage){ 
            // Some validationMessages provided by browser don't give much info, so use it selectively (if at all).
            return (
                <span className="help-block">
                    { this.state.validationMessage }
                </span>
            );
        }

        if (this.state.serverErrors && this.state.serverErrors.length > 0) {
            return (
                <span className="help-block">
                    { this.state.serverErrorsMessage ? <b>{ this.state.serverErrorsMessage }</b> : null }
                    { this.state.serverErrors.map((e, i)=> (
                        <div key={'error-' + i}>
                            { (this.state.serverErrors.length === 1 ? '' : (i + 1) + '. ') + e.description }
                        </div>
                    ) ) }
                </span>
            );
        }

        switch(this.props.fieldType){

            case 'phone': 
                return (
                    <span className="help-block">
                        Only use digits &mdash; no dashes, spaces, or parantheses.
                        Optionally may include leading '+' or extension.<br/>
                        <b>e.g.:</b> <code>+######### x###</code>
                    </span>
                );
            case 'email': return (
                <span className="help-block">
                    Please enter a valid email address.
                </span>
            );
            case 'username' : return (
                null
            );
            case 'text' : return (
                null
            );
        }
    },

    /** Render an input field; for usage in this.renderEditing() */
    inputField : function(){
        // ToDo : Select boxes, radios, checkboxes, etc.
        var commonProps = {
            'id' : this.props.labelID,
            'required' : this.state.required,
            'disabled' : this.props.disabled || false,
            'ref' : "inputElement"
        };
        var commonPropsTextInput = _.extend({
            'className' : 'form-control input-' + this.props.inputSize,
            'value' : this.state.value || '',
            'onChange' : this.handleChange,
            'name' : this.props.labelID,
            'autoFocus': true,
            'placeholder' : this.props.placeholder,
            'pattern' : this.state.validationPattern
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
    },

    /** Render 'in edit state' view */
    renderEditing : function(){
        
        var outerBaseClass = "editable-field-entry editing has-feedback" + 
            (!this.isValid(true) ? ' has-error ' : ' has-success ') +
            ('input-size-' + this.props.inputSize + ' ');

        if (this.props.style == 'row') {
            return (
                <div className={outerBaseClass + this.props.labelID + ' row'}>
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor={ this.props.labelID }>{ this.props.label }</label>
                    </div>
                    <div className="col-sm-9 value editing">
                        { this.renderActionIcon('cancel') }
                        { this.renderActionIcon('save') }
                        { this.inputField() }
                    </div>
                </div>
            );
        }

        if (this.props.style == 'minimal') {
            return (
                <div className={ outerBaseClass + this.props.labelID }>
                    <div className="value editing">
                        { this.renderActionIcon('cancel') }
                        { this.renderActionIcon('save') }
                        { this.inputField() }
                    </div>
                </div>
            );
        }

        if (this.props.style == 'inline') {
            var valStyle = {};
            if (this.props.absoluteBox){
                if (this.state.leanTo === null){
                    valStyle.display = 'none';
                } else {
                    valStyle[this.state.leanTo === 'left' ? 'right' : 'left'] = (this.state.leanOffset > 0 ? (0-this.state.leanOffset) : 0) + 'px';
                }
            }
            return (
                <span ref={this.props.absoluteBox ? "field" : null} className={ outerBaseClass + this.props.labelID + ' inline' + (this.props.absoluteBox ? ' block-style' : '') }>
                    { this.props.absoluteBox ? this.renderSavedValue() : null }
                    <span className="value editing clearfix" style={valStyle}>
                        { this.inputField() }
                        { this.renderActionIcon('cancel') }
                        { this.renderActionIcon('save') }
                    </span>
                </span>
            );
        }

    },

    render : function(){
        if (this.props.parent && this.props.parent.state && this.props.parent.state.currentlyEditing === this.props.labelID) {
            return this.renderEditing();
        } else {
            return this.renderSaved();
        }
    }

});