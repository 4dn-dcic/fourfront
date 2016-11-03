/** @preventMunge */
/* ^ see http://stackoverflow.com/questions/30110437/leading-underscore-transpiled-wrong-with-es6-classes */

'use strict';

var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var { Modal, Alert } = require('react-bootstrap');
var { ItemStore } = require('./lib/store');
var { ajaxLoad, DateUtility, console, isServerSide } = require('./objectutils');
var { FormattedInfoBlock } = require('./experiment-set-view');
var md5 = require('js-md5');
// var navigation = require('./navigation');
// var Breadcrumbs = navigation.Breadcrumbs;


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
            'job_title' : React.PropTypes.string
        })
    },

    contextTypes: {
        fetch: React.PropTypes.func,
        session: React.PropTypes.object
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
                    <td>{ DateUtility.format(key.date_created, 'date-time-md', ' - ') }</td>
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
        item['user'] = this.context.session['auth.userid'];
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

    getInitialState : function(){
        return {
            details_lab : null
        };
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
                    
                    {user.access_keys ?
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
                <div className="row profile-field-entry email">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="email">Email</label>
                    </div>
                    <div id="email" className="col-sm-9">
                        { user.email ? 
                            <a href={'mailto:' + user.email}>{user.email}</a> 
                            :
                            <span className="not-set">No email address</span>
                        }
                    </div>
                </div>
                <div className="row profile-field-entry phone">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="phone">Phone</label>
                    </div>
                    <div id="phone" className="col-sm-9">
                        { user.phone || <span className="not-set">No phone number</span> }
                    </div>
                </div>
                <div className="row profile-field-entry fax">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="fax">Fax</label>
                    </div>
                    <div id="fax" className="col-sm-9">
                        { user.fax || <span className="not-set">No fax number</span> }
                    </div>
                </div>
                <div className="row profile-field-entry skype">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="skype">Skype</label>
                    </div>
                    <div id="skype" className="col-sm-9">
                        { user.skype || <span className="not-set">No skype ID</span> }
                    </div>
                </div>
                
            </div>
        );
    }

});

var EditableField = React.createClass({

    propTypes : {
        
    },

    getInitialState : function(){
        return {
            isEditing : false
        }
    },

    render : function(){
        return null;
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
                    <div id="lab" className="col-sm-9">
                        { this.renderLabInfo(user) }
                    </div>
                </div>
                <div className="row profile-field-entry job_title">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="job_title">Role</label>
                    </div>
                    <div id="job_title" className="col-sm-9">
                        { user.job_title || <span className="not-set">No Job Title</span> }
                    </div>
                </div>
                <div className="row profile-field-entry submits_for">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="submits_for">Submit For</label>
                    </div>
                    <ul id="submits_for" className="col-sm-9">
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
        var callbackFxn = function() {
            alert('Success! ' + data + ' is being impersonated.');
            this.context.navigate('/');
        }.bind(this);
        var fallbackFxn = function() {
            alert('Impersonation unsuccessful.\nPlease check to make sure the provided email is correct.');
        };
        ajaxLoad(url, callbackFxn, 'POST', fallbackFxn, jsonData);
    }
});
globals.content_views.register(ImpersonateUserForm, 'Portal', 'impersonate-user');
