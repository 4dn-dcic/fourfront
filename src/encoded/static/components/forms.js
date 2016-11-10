'use strict';

var React = require('react');
var _ = require('underscore');
var store = require('../store');
var { ajaxLoad, console, getNestedProperty } = require('./objectutils');



var FieldSet = module.exports.FieldSet = React.createClass({

    propTypes : {
        children : React.PropTypes.node,     // Inner fieldset content, should have some EditableFields.
        context : React.PropTypes.object, // ToDo: Validate that has req'd properties
        endpoint : React.PropTypes.string,   // Override context['@id'] (if doesn't exist, dif endpoint, etc.)
        parent : React.PropTypes.any,
        className : React.PropTypes.string // Additional className to prepend.
    },

    getDefaultProps : function(){
        return {
            parent : null, // if null, use own state
            context : {},
            className : '',
            endpoint : null
        };
    },

    children : null,

    componentWillMount : function(){
        this.children = this.adjustedChildren();
    },

    componentWillUpdate : function(newProps){
        if (this.props.children !== newProps.children){
            this.children = this.adjustedChildren();
        }
    },

    adjustedChildren : function(){
        // Add common props to children EditableField elements.
        return React.Children.map(this.props.children, (child)=>{
            if (child.type.displayName == 'EditableField'){
                var newProps = {};
                if (!child.props.context) newProps.context = this.props.context;
                if (!child.props.parent) newProps.parent = this.props.parent || this;
                if (!child.props.endpoint && this.props.endpoint) newProps.endpoint = this.props.endpoint;
                child = React.cloneElement(child, newProps);
            };
            return child;
        });
    },

    fullClassName : function(){
        var stateHolder = this.props.parent || this; // Fallback to using self as state holder.
        return (
            this.props.className + 
            " editable-fields fieldset" + 
            (stateHolder.state && stateHolder.state.currentlyEditing ? ' editing' : '')
        );
    },

    render : function(){
        return (
            <div className={this.fullClassName()}>
                { this.children }
            </div>
        );
    }

});


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

        deepInsertObj : function(hostObj, nestedObj, depth = 0){
            var nKey = Object.keys(nestedObj)[0]; // Should only be 1.
            if (depth > 10){
                // Doubt we'd go this deep... so cancel out (probably error)
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
                // Field doesn't exist on hostObj, but does on nestedObj == new field.
                hostObj[nKey] = nestedObj[nKey];
                return true;
            } else {
                // Whoops, doesn't seem like fields match.
                return false;
            }
        }
    },

    contextTypes: {
        navigate: React.PropTypes.func
    },

    propTypes : {
        label : React.PropTypes.string,
        labelID : React.PropTypes.string, // ToDo : allow use of dot notation.
        parent : React.PropTypes.any, // Holds 'currentlyEditing' state (== labelID of field being edited.)
        fallbackText : React.PropTypes.string,
        context : React.PropTypes.object, // ToDo : validate context obj has property labelID.
        fieldType : React.PropTypes.string, // ToDo : Use for validation
        children : React.PropTypes.any // Rendered value
    },

    getDefaultProps : function(){
        return {
            fieldType : 'text',
            context : null,
            fallbackText : 'Not set'
        };
    },

    getInitialState : function(){
        var value = getNestedProperty(this.props.context, this.props.labelID);
        return {
            value : value || null,  // Changes on input field change
            savedValue : value,     // Changes only on sync w/ server.
            serverErrors : [],      // Validation state sent from server.
            serverErrorsMessage : null,
            loading : false         // True if in middle of save or fetch request.
        };
    },

    isSet : function(){ return this.props.context && this.state.savedValue; },

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
        this.props.parent.setState({ currentlyEditing : null });
    },

    saveEditState : function(e){
        e.preventDefault();
        if (typeof this.state.valid === 'boolean' && !this.state.valid){
            // ToDo : Bigger notification to end user that something is wrong.
            console.error("Cannot save " + this.props.labelID + "; value is not valid:", this.state.value);
            return;
        }  

        this.save(()=>{
            // Success callback
            this.props.parent.setState({ currentlyEditing : null }, ()=> {
                console.info("Saved " + this.props.labelID + " : " + this.state.savedValue);
            });
        });
    },

    fetch : function(){
        ajaxLoad(this.props.endpoint || this.props.context['@id'], (r)=>{
            var val = getNestedProperty(r, this.props.labelID);
            this.setState({ value : val, savedValue : val });
        }, 'GET');
    },

    save : function(successCallback = null, errorCallback = null){

        this.setState({ loading : true }, ()=>{
            var patchData = EditableField.generateNestedProperty(this.props.labelID, this.state.value);
            ajaxLoad(this.props.endpoint || this.props.context['@id'], (r)=>{
                if (r.status === 'error'){
                    // ToDo display errors
                    console.error("Error: ", r);
                    this.setState({ serverErrors : r.errors, serverErrorsMessage : r.description, loading : false }, errorCallback);
                    return;
                } else if (r.status === 'success') {
                    // Update context (yes, tis modifying a prop)
                    var updatedContext = _.clone(this.props.context);
                    var inserted = EditableField.deepInsertObj(updatedContext, patchData);
                    console.log(patchData, updatedContext);
                    if (inserted){
                        store.dispatch({
                            type: { 'context': updatedContext }
                        });
                        this.setState({ savedValue : this.state.value, loading : false }, ()=> {
                            if (typeof successCallback === 'function') successCallback(r);
                        });
                    } else {
                        // Couldn't insert into current context, refetch from server :s.
                        console.warn("Couldn't update current context, fetching from server.");
                        this.context.navigate('', {'inPlace':true});
                        // ToDo : ...navigate(inPlace)...
                    }
                }
            }, 'PATCH', null, JSON.stringify(patchData));
        });
    },

    handleChange : function(e){
        var state = { value : e.target.value };
        if (e.target.validity){
            if (typeof e.target.validity.valid == 'boolean') {
                state.valid = e.target.validity.valid;
            }
        }
        if (e.target.validationMessage){
            state.validationMessage = e.target.validationMessage;
        }
        // ToDo : cross-browser validation check + set error state then use for styling, etc.
        this.setState(state);
    },

    renderActionIcon : function(type = 'edit'){

        if (this.state.loading){
            switch (type){
                case 'save' : return null;
                case 'cancel' : return (
                    <span className="right field-loading-icon">
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
                        <span className="right edit-button info disabled">
                            <i className="icon icon-info-circle icon-fw"></i>
                        </span>
                    );
                }
                return (
                    <a href={ "#edit-" + this.props.labelID } className="right edit-button" onClick={ this.enterEditState }>
                        <i className="icon icon-pencil icon-fw"></i>
                    </a>
                );
            case 'save' : 
                if (this.state.valid === false) return null;
                return (
                    <a href={ "#save-" + this.props.labelID } className="right save-button" onClick={this.saveEditState}>
                        <i className="icon icon-save icon-fw"></i>
                    </a>
                );
            case 'cancel': return (
                <a href="#" className="right cancel-button" onClick={this.cancelEditState}>
                    <i className="icon icon-times-circle-o icon-fw"></i>
                </a>
            );
        }
    },

    renderSaved : function(){
        return (
            <div className={"row editable-field-entry " + this.props.labelID}>
                <div className="col-sm-3 text-right text-left-xs">
                    <label htmlFor={ this.props.labelID }>{ this.props.label }</label>
                </div>
                <div className="col-sm-9 value">
                    { this.renderActionIcon('edit') }
                    { this.isSet() ?
                        <span id={ this.props.labelID } className="set">{ this.props.children }</span>
                        :
                        <span className="not-set">{ this.props.fallbackText || ('No ' + this.props.labelID) }</span> 
                    }
                </div>
            </div>
        );
    },

    hasErrors : function(){
        return ( this.state.valid === false || this.state.serverErrors.length > 0 );
    },

    inputField : function(){
        // ToDo : Select boxes, radios, checkboxes, etc.
        var commonProps = {
            id : this.props.labelID,
            required : this.props.required || false,
            disabled : this.props.disabled || false
        };
        var commonPropsTextField = _.extend({
            className : 'form-control input-sm',
            value : this.state.value || '',
            onChange : this.handleChange,
            name : this.props.labelID
        }, commonProps);

        switch(this.props.fieldType){

            case 'phone': return <input
                type="text"
                autoComplete="tel"
                pattern={EditableField.regex.phone}
                {...commonPropsTextField}
            />;
            case 'email': return <input
                type="email"
                autoComplete="email"
                pattern={EditableField.regex.email}
                {...commonPropsTextField}
            />;
            case 'username' : return <input
                type="text"
                inputMode="latin-name"
                autoComplete="username"
                {...commonPropsTextField}
            />;
            case 'text' : return <input
                type="text"
                inputMode="latin"
                {...commonPropsTextField}
            />;
        }
        // Fallback (?)
        return <span>No edit field created yet.</span>;
    },

    renderEditing : function(){
        return (
            <div className={"row editable-field-entry editing has-feedback " + this.props.labelID + (this.hasErrors() ? ' has-error' : ' has-success') }>
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
    },

    render : function(){
        if (this.props.parent && this.props.parent.state && this.props.parent.state.currentlyEditing === this.props.labelID) {
            return this.renderEditing();
        } else {
            return this.renderSaved();
        }
    }

});