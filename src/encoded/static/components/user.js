/** @preventMunge */
/* ^ see http://stackoverflow.com/questions/30110437/leading-underscore-transpiled-wrong-with-es6-classes */

'use strict';

var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var store = require('../store');
var { Modal, Alert } = require('react-bootstrap');
var { ItemStore } = require('./lib/store');
var { ajaxLoad, DateUtility, console, isServerSide, getNestedProperty } = require('./objectutils');
var FormattedInfoBlock = require('./formatted-info-block');
var jwt = require('jsonwebtoken');


class AccessKeyStore extends ItemStore {
    resetSecret(id) {
        this.fetch(id + 'reset-secret', {
            method: 'POST',
        }, response => this.dispatch('onResetSecret', response));
    }
}


var AccessKeyTable = React.createClass({

    propTypes : {
        access_keys : React.PropTypes.array.isRequired,
        user : React.PropTypes.shape({
            '@id' : React.PropTypes.string.isRequired,
            'access_keys' : React.PropTypes.array.isRequired,
            'email' : React.PropTypes.string,
            'first_name' : React.PropTypes.string,
            'last_name' : React.PropTypes.string,
            'groups' : React.PropTypes.array,
            'lab' : React.PropTypes.string,
            'status' : React.PropTypes.string,
            'timezone' : React.PropTypes.string,
            'job_title' : React.PropTypes.string,
            'submits_for' : React.PropTypes.array
        })
    },

    contextTypes: {
        fetch: React.PropTypes.func,
        session: React.PropTypes.bool
    },

    getInitialState: function() {
        var access_keys = this.props.access_keys;
        this.store = new AccessKeyStore(access_keys, this, 'access_keys');
        return {
            access_keys: access_keys
        };
    },

    renderTable : function(){
        if (!this.state.access_keys || !this.state.access_keys.length){
            return (
                <div className="no-access-keys">
                    <hr/><span>No access keys set.</span>
                </div>
            );
        }
        var row = function(key){
            return (
                <tr key={key.access_key_id}>
                    <td className="access-key-id">{ key.access_key_id }</td>
                    <td>{ key.date_created ? DateUtility.format(key.date_created, 'date-time-md', ' - ') : 'N/A' }</td>
                    <td>{ key.description }</td>
                    <td className="access-key-buttons">
                        <a href="#" className="btn btn-xs btn-success" onClick={this.doAction.bind(this, 'resetSecret', key['@id'])}>Reset</a>
                        <a href="#" className="btn btn-xs btn-danger" onClick={this.doAction.bind(this, 'delete', key['@id'])}>Delete</a>
                    </td>
                </tr>
            );
        }.bind(this);

        return (
            <table className="table access-keys-table">
                <thead>
                    <tr>
                        <th>Access Key ID</th>
                        <th>Created</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    { this.state.access_keys.map(row) }
                </tbody>
            </table>
        );

    },

    render: function() {
        return (
            <div className="access-keys-table-container clearfix">
                { this.state.access_keys.length ?
                    this.renderTable()
                    : 
                    <div className="no-access-keys"><hr/>No access keys set.</div> 
                }
                <a href="#add-access-key" id="add-access-key" className="btn btn-success" onClick={this.create}>Add Access Key</a>
                {this.state.modal}
            </div>
        );
    },

    create: function(e) {
        e.preventDefault();
        var item = {};
        if(this.context.session){
            if(typeof(Storage) !== 'undefined'){
                if(localStorage && localStorage.user_info){
                    var idToken = JSON.parse(localStorage.getItem('user_info')).id_token;
                    var decoded = jwt.decode(idToken);
                    item['user'] = decoded.email_verified ? decoded.email : "";
                }else{
                    console.log("Access key aborted");
                    return;
                }
            }
        }
        this.store.create('/access-keys/', item);
    },

    doAction: function(action, arg, e) {
        e.preventDefault();
        this.store[action](arg);
    },

    onCreate: function(response) {
        this.showNewSecret('Your secret key has been created.', response);
    },
    onResetSecret: function(response) {
        this.showNewSecret('Your secret key has been reset.', response);
    },
    showNewSecret: function(title, response) {
        this.setState({modal:
            <Modal show={true} onHide={this.hideModal}>
            <Modal.Header>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
                <Modal.Body>
                    Please make a note of the new secret access key.
                    This is the last time you will be able to view it.
                    <dl className="key-value">
                        <div>
                            <dt>Access Key ID</dt>
                            <dd>{response.access_key_id}</dd>
                        </div>
                        <div>
                            <dt>Secret Access Key</dt>
                            <dd>{response.secret_access_key}</dd>
                        </div>
                    </dl>
                </Modal.Body>
            </Modal>
        });
    },

    onDelete: function(item) {
        this.setState({modal:
            <Modal show={true} onHide={this.hideModal}>
                <Modal.Header>
                    <Modal.Title>{'Access key ' + item['access_key_id'] + ' has been deleted.'}</Modal.Title>
                </Modal.Header>
            </Modal>
        });
    },

    onError: function(error) {
        var View = globals.content_views.lookup(error);
        this.setState({modal:
            <Modal show={true} onHide={this.hideModal}>
                <Modal.Header>
                    <Modal.Title>Error</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <View context={error} loadingComplete={true} />
                </Modal.Body>
            </Modal>
        });
    },

    hideModal: function() {
        this.setState({modal: null});
    },
});


var User = module.exports.User = React.createClass({

    statics : {
        buildGravatarURL : function(email, size=null){
            var md5 = require('js-md5');
            var url = 'https://www.gravatar.com/avatar/' + md5(email);
            url += "?d=https://media.giphy.com/media/PcFPiuGZVqK2I/giphy.gif";
            if (size) url += '&s=' + size;
            return url;
        },
        gravatar : function(email, size=null, className=null){
            return (
                <img 
                    src={ User.buildGravatarURL(email, size)}
                    className={'gravatar ' + className}
                    title="Obtained via Gravatar"
                />
            );
        }
    },

    propTypes : {
        'context' : React.PropTypes.shape({
            '@id' : React.PropTypes.string.isRequired,
            'access_keys' : React.PropTypes.array,
            'email' : React.PropTypes.string,
            'first_name' : React.PropTypes.string,
            'last_name' : React.PropTypes.string,
            'title' : React.PropTypes.string,
            'groups' : React.PropTypes.array,
            'lab' : React.PropTypes.string,
            'status' : React.PropTypes.string,
            'timezone' : React.PropTypes.string,
            'job_title' : React.PropTypes.string
        })
    },

    render: function() {

        console.log('User', this);

        var user = this.props.context;
        var crumbs = [
            {id: 'Users'}
        ];

        return (
            <div className="user-profile-page">

                <header className="row">
                    <div className="col-sm-12">
                    </div>
                </header>

                <div className="page-container data-display">

                    <h1 className="page-title">Profile</h1>

                    <div className="row first-row row-eq-height-md">

                        <div className="col-sm-10 col-sm-offset-1 col-md-offset-0 col-md-6 col-lg-7">

                            <div className="panel user-info shadow-border">
                                <div className="user-title-row-container">
                                    <div className="row title-row">
                                        <div className="col-sm-3 gravatar-container">
                                            { User.gravatar(user.email, 70) }
                                        </div>
                                        <div className="col-sm-9 user-title-col">
                                            <h1 className="user-title">{ user.first_name } { user.last_name }</h1>
                                        </div>
                                    </div>
                                </div>
                                <ProfileContactFields user={user} parent={this} />
                            </div>

                        </div>
                        <div className="col-sm-10 col-sm-offset-1 col-md-offset-0 col-md-6 col-lg-5">
                            <ProfileWorkFields user={user} containerClassName="panel user-work-info shadow-border" parent={this} />
                        </div>

                    </div>
                    
                    {user.access_keys && user.submits_for && user.submits_for.length ?
                        <div className="access-keys-container">
                            <h3 className="text-300">Access Keys</h3>
                            <div className="data-display">
                                <AccessKeyTable user={user} access_keys={user.access_keys} />
                            </div>
                        </div>
                    : ''}

                </div>
            </div>
        );
    }
});

globals.content_views.register(User, 'User');


var ProfileContactFields = React.createClass({

    icon : function(iconName){
        return <i className={"visible-lg-inline icon icon-fw icon-" + iconName }></i>;
    },

    render: function(){
        var user = this.props.user;
        return (
            <FieldSet context={user} parent={this.props.parent} className="profile-contact-fields">
                
                <EditableField label="Email" labelID="email" fallbackText="No email address" fieldType="email" disabled={true}>
                    { this.icon('envelope') }&nbsp; <a href={'mailto:' + user.email}>{ user.email }</a>
                </EditableField>

                <EditableField label="Phone" labelID="phone1" fallbackText="No phone number" fieldType="phone">
                    { this.icon('phone') }&nbsp; { user.phone1 }
                </EditableField>
                
                <EditableField label="Fax" labelID="fax" fallbackText="No fax number" fieldType="phone">
                    { this.icon('fax') }&nbsp; { user.fax }
                </EditableField>
                
                <EditableField label="Skype" labelID="skype" fallbackText="No skype ID" fieldType="username">
                    { this.icon('skype') }&nbsp; { user.skype }
                </EditableField>
                
            </FieldSet>
        );
    }

});

var FieldSet = React.createClass({

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

var EditableField = React.createClass({

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
            if (hostObj.hasOwnProperty(nKey)){
                if (typeof nestedObj[nKey] === 'object' && !Array.isArray(hostObj[nKey]) ){
                    return EditableField.deepInsertObj(hostObj[nKey], nestedObj[nKey], depth + 1);
                } else {
                    // No more nested objects, insert here.
                    hostObj[nKey] = nestedObj[nKey];
                    return true;
                }
            } else {
                // Whoops, doesn't seem like fields match.
                return false;
            }
        }
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
                    this.setState({ serverErrors : r.errors, serverErrorsMessage : r.description, loading : false }, errorCallback);
                    return;
                } else if (r.status === 'success') {
                    // Update context (yes, tis modifying a prop)
                    var updatedContext = _.clone(this.props.context);
                    var inserted = EditableField.deepInsertObj(updatedContext, patchData);
                    if (inserted){
                        store.dispatch({
                            type: { 'context': updatedContext }
                        });
                        this.setState({ savedValue : this.state.value, loading : false }, ()=> {
                            if (typeof successCallback === 'function') successCallback(r);
                        });
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

var ProfileWorkFields = React.createClass({

    getDefaultProps : function(){
        return {
            containerClassName : 'panel'
        };
    },

    getInitialState : function(){
        return {
            details_lab : null,         // Use FormattedInfoBlock.ajaxPropertyDetails.call(this, args...) to set.
            details_submits_for : null  // Use custom ajax func to set, b/c is an array.
        };
    },

    componentDidMount : function(){
        if (typeof this.props.user.lab == 'string' && !this.state.details_lab){
            // Fetch lab info & update into User instance state via the -for mixin-like-usage ajaxPropertyDetails func.
            FormattedInfoBlock.ajaxPropertyDetails.call(this, this.props.user.lab, 'lab');
        }
        if (Array.isArray(this.props.user.submits_for) && this.props.user.submits_for.length && !this.state.details_submits_for) {
            var submitsForArray = [];
            this.props.user.submits_for.forEach(function(orgID, i){

                // Check if lab/org is same as state.details_lab, reuse it if so
                // Probably doesn't execute since AJAX requests sent @ about same time (ToDo)
                if (this.state.details_lab && this.state.details_lab['@id'] == orgID){
                    submitsForArray[i] = this.state.details_lab;
                    return;
                }

                // Load w. AJAX otherwise.
                console.log('Obtaining submitsForArray[' + i + '] via AJAX.');
                ajaxLoad(orgID + '?format=json', function(result){
                    submitsForArray[i] = result;
                    console.log('Obtained submitsForArray[' + i + '] via AJAX.');
                    if (submitsForArray.length == this.props.user.submits_for.length){
                        // All loaded
                        this.setState({ details_submits_for : submitsForArray });
                        console.log('Obtained details_submits_for via AJAX: ', submitsForArray);
                    }
                }.bind(this), 'GET');
            }.bind(this));
        }
    },

    renderLabInfo : function(user = this.props.user){
        if (typeof user.lab !== 'string') { // Probably no lab
            return (
                <span className="not-set">No Labs</span>
            );
        }
        return FormattedInfoBlock.Lab(this.state.details_lab, false, false);
    },

    renderSubmitsFor : function(user = this.props.user){
        // No labs/orgs in user.submits_for
        if (!Array.isArray(user.submits_for) || user.submits_for.length == 0){
            return (
                <span className="not-set">Not submitting for any organizations.</span>
            );
        }

        // Labs/orgs in user.submits_for exist, but not loaded to state yet.
        if (!this.state.details_submits_for){
            return user.submits_for.map((orgID,i)=>
                <li key={'submits_for-' + i} className="submit_for-item loading">
                    <i className="icon icon-spin icon-circle-o-notch"></i>
                </li>
            );
        }

        // All loaded
        return this.state.details_submits_for.map((org,i) =>
            <li key={'submits_for-' + i} className="submit_for-item">{ FormattedInfoBlock.Lab(org, false, false, false) }</li>
        );
    },

    render : function(){
        var user = this.props.user;
        return (
            <div className={this.props.containerClassName}>
                <h3 className="text-300 block-title">
                    <i className="icon icon-users icon-fw"></i> Organizations
                </h3>
                <div className="row editable-field-entry lab">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="lab">Primary Lab</label>
                    </div>
                    <div id="lab" className="col-sm-9 value">
                        { this.renderLabInfo(user) }
                    </div>
                </div>
                <div className="row editable-field-entry job_title">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="job_title">Role</label>
                    </div>
                    <div id="job_title" className="col-sm-9 value">
                        { user.job_title || <span className="not-set">No Job Title</span> }
                    </div>
                </div>
                <div className="row editable-field-entry submits_for">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="submits_for">Submit For</label>
                    </div>
                    <ul id="submits_for" className="col-sm-9 value">
                        { this.renderSubmitsFor() }
                    </ul>
                </div>
            </div>
        );
    }

});


var BasicForm = React.createClass({
    getInitialState: function() {
        return({
            value: ''
        })
    },

    handleChange: function(e) {
        this.setState({ value: e.target.value });
    },

    handleSubmit: function(e){
        e.preventDefault();
        if(this.state.value.length == 0){
            return;
        }
        this.props.submitImpersonate(this.state.value);
        this.setState({ value: '' });
    },

    render: function() {
        return(
            <form onSubmit={this.handleSubmit}>
                <input className="impersonate-user impersonate-user-field" type='text' placeholder='Enter an email to impersonate...'
                    onChange={this.handleChange} value={this.state.value}/>
                <input className="impersonate-user" type="submit" value="Submit" />
            </form>
        );
    }
});

var ImpersonateUserForm = React.createClass({
    contextTypes: {
        navigate: React.PropTypes.func
    },

    render: function() {
        var form = <BasicForm submitImpersonate={this.handleSubmit} />;
        return (
            <div>
                <h2>Impersonate User</h2>
                {form}
            </div>
        );
    },

    handleSubmit: function(data) {
        var url = "/impersonate-user";
        var jsonData = JSON.stringify({'userid':data});
        var callbackFxn = function(payload) {
            alert('Success! ' + data + ' is being impersonated.');
            console.log(JSON.stringify(payload))
            if(typeof(Storage) !== 'undefined'){ // check if localStorage supported
                localStorage.setItem("user_info", JSON.stringify(payload));
            }
            this.context.navigate('/');
        }.bind(this);
        var fallbackFxn = function() {
            alert('Impersonation unsuccessful.\nPlease check to make sure the provided email is correct.');
        };

        var userInfo = localStorage.getItem('user_info') || null;
        var idToken = userInfo ? JSON.parse(userInfo).id_token : null;
        var reqHeaders = {'Accept': 'application/json'};
        if(userInfo){
            reqHeaders['Authorization'] = 'Bearer '+idToken;
        }
        ajaxLoad(url, callbackFxn, 'POST', fallbackFxn, jsonData, reqHeaders);
    }
});
globals.content_views.register(ImpersonateUserForm, 'Portal', 'impersonate-user');
