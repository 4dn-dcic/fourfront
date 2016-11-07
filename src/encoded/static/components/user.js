/** @preventMunge */
/* ^ see http://stackoverflow.com/questions/30110437/leading-underscore-transpiled-wrong-with-es6-classes */

'use strict';

var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var { Modal, Alert } = require('react-bootstrap');
var { ItemStore } = require('./lib/store');
var { ajaxLoad, DateUtility, console, isServerSide } = require('./objectutils');
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
        console.log('AccessKeyTable: ', this); 

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

                        <div className="col-sm-9 col-md-7">

                            <div className="panel user-info shadow-border">
                                <div className="user-title-container">
                                    <div className="row title-row">
                                        <div className="col-sm-3 gravatar-container">
                                            { User.gravatar(user.email, 70) }
                                        </div>
                                        <div className="col-sm-9">
                                            <h1 className="user-title">{ user.title }</h1>
                                        </div>
                                    </div>
                                </div>
                                <ProfileContactFields user={user}/>
                            </div>

                        </div>
                        <div className="col-sm-9 col-md-5">
                            <ProfileWorkFields user={user} containerClassName="panel user-work-info shadow-border" />
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

    render: function(){
        var user = this.props.user;
        return (
            <div>
                
                <EditableProfileField label="Email" labelID="email" fallbackText="No email address" fieldType="email">
                    <a href={'mailto:' + user.email}>{ user.email }</a>
                </EditableProfileField>

                <EditableProfileField label="Phone" labelID="phone" fallbackText="No phone number" fieldType="phone">
                    { user.phone }
                </EditableProfileField>
                
                <EditableProfileField label="Fax" labelID="fax" fallbackText="No fax number" fieldType="phone">
                    { user.fax }
                </EditableProfileField>
                
                <EditableProfileField label="Skype" labelID="skype" fallbackText="No skype ID" fieldType="string">
                    { user.skype }
                </EditableProfileField>
                
            </div>
        );
    }

});

var EditableProfileField = React.createClass({

    propTypes : {
        label : React.PropTypes.string,
        labelID : React.PropTypes.string,
        fallbackText : React.PropTypes.string,
        fieldType : React.PropTypes.string, // ToDo : Use for validation
        children : React.PropTypes.any // Saved Value
    },

    getInitialState : function(){
        return {
            isEditing : false
        }
    },

    enterEditState : function(e){
        e.preventDefault();
        this.setState({ isEditing : true });
    },

    renderSaved : function(){
        return (
            <div className={"row profile-field-entry " + this.props.labelID}>
                <div className="col-sm-3 text-right text-left-xs">
                    <label htmlFor={ this.props.labelID }>{ this.props.label }</label>
                </div>
                <div className="col-sm-9 value">
                    <a href={ "#edit-" + this.props.labelID } className="right edit-button" onClick={this.enterEditState}>
                        <i className="icon icon-pencil icon-fw"></i>
                    </a>
                    { this.props.children ?
                        <span id={ this.props.labelID } className="set">{ this.props.children }</span>
                        :
                        <span className="not-set">{ this.props.fallbackText || ('No ' + this.props.labelID) }</span> 
                    }
                </div>
            </div>
        );
    },

    inputField : function(){
        var inputType;
        if (!this.props.fieldType) inputType = 'text';

        if (this.props.fieldType == 'string'){
            return (
                <input type="text" id={ this.props.labelID } name={ this.props.labelID }  />
            );
        }
        return <span>No edit field created yet.</span>;
    },

    renderEditing : function(){
        return (
            <div className={"row profile-field-entry editing " + this.props.labelID}>
                <div className="col-sm-3 text-right text-left-xs">
                    <label htmlFor={ this.props.labelID }>{ this.props.label }</label>
                </div>
                <div className="col-sm-9 value editing">
                    { this.inputField() }
                </div>
            </div>
        );
    },

    render : function(){
        if (this.state.isEditing) {
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
                <div className="row profile-field-entry lab">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="lab">Primary Lab</label>
                    </div>
                    <div id="lab" className="col-sm-9 value">
                        { this.renderLabInfo(user) }
                    </div>
                </div>
                <div className="row profile-field-entry job_title">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="job_title">Role</label>
                    </div>
                    <div id="job_title" className="col-sm-9 value">
                        { user.job_title || <span className="not-set">No Job Title</span> }
                    </div>
                </div>
                <div className="row profile-field-entry submits_for">
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
