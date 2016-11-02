/** @preventMunge */
/* ^ see http://stackoverflow.com/questions/30110437/leading-underscore-transpiled-wrong-with-es6-classes */

'use strict';

var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var { Modal, Alert } = require('react-bootstrap');
var { ItemStore } = require('./lib/store');
var { ajaxLoad, console } = require('./objectutils');
var { FormattedInfoBlock } = require('./experiment-set-view');
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

    render: function() {
        console.log('AccessKeyTable: ', this);
        return (
            <div>
                <a className="btn btn-success" onClick={this.create}>Add Access Key</a>
                {this.state.access_keys.length ?
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Access Key ID</th>
                          <th>Description</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {this.state.access_keys.map(k =>
                            <tr key={k.access_key_id}>
                              <td>{k.access_key_id}</td>
                              <td>{k.description}</td>
                              <td>
                                <a href="" onClick={this.doAction.bind(this, 'resetSecret', k['@id'])}>reset</a>
                                {' '}<a href="" onClick={this.doAction.bind(this, 'delete', k['@id'])}>delete</a>
                              </td>
                            </tr>
                            )}
                      </tbody>
                    </table>
                : ''}
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

    componentDidMount : function(){
        if (typeof this.props.context.lab == 'string' && !this.state.details_lab){
            // Fetch lab info & update into User instance state via the -for mixin-like-usage ajaxPropertyDetails func.
            FormattedInfoBlock.ajaxPropertyDetails.call(this, this.props.context.lab, 'lab');
        }
    },

    render: function() {

        console.log('User', this);

        var usr = this.props.context;
        var crumbs = [
            {id: 'Users'}
        ];

        var labInfo = function(){
            if (typeof usr.lab !== 'string') { // Probably no lab
                return (
                    <div>
                        <h4 className="text-300">No Labs</h4>
                    </div>
                );
            }
            return (
                <FormattedInfoBlock
                    title={this.state.details_lab ? this.state.details_lab.title : null }
                    titleHref={this.state.details_lab ? this.state.details_lab['@id'] : null }
                    detailContent={ this.state.details_lab ? (
                            (this.state.details_lab.city) + 
                            (this.state.details_lab.state ? ', ' + this.state.details_lab.state : '') + 
                            (this.state.details_lab.postal_code ? ' ' + this.state.details_lab.postal_code : '' ) +
                            (this.state.details_lab.country ? ', ' + this.state.details_lab.country : '')
                        ) : null
                    }
                    extraContainerClassName="lab"
                    extraDetailClassName="address"
                    loading={!this.state.details_lab}
                />
            );
        }.bind(this);

        return (
            <div className="user-profile-page">

                <header className="row">
                    <div className="col-sm-12">
                    </div>
                </header>

                <div className="page-container data-display">

                    <h1 className="page-title">Profile</h1>

                    <div className="row first-row">

                        <div className="col-sm-9 col-md-7">

                            <div className="panel user-info">
                                <h2 className="user-title">{usr.title}</h2>
                                <div className="row email">
                                    <div className="col-sm-3 text-right text-left-xs">
                                        <label htmlFor="email">Email</label>
                                    </div>
                                    <div id="email" className="col-sm-9">
                                        <a href={'mailto:' + usr.email}>{usr.email}</a>
                                    </div>
                                </div>
                                <div className="row lab">
                                    <div className="col-sm-3 text-right text-left-xs">
                                        <label htmlFor="lab">Lab</label>
                                    </div>
                                    <div id="lab" className="col-sm-9">
                                        { labInfo() }
                                    </div>
                                </div>
                                <div className="row job_title">
                                    <div className="col-sm-3 text-right text-left-xs">
                                        <label htmlFor="job_title">Role</label>
                                    </div>
                                    <div id="job_title" className="col-sm-9">
                                        { usr.job_title }
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="col-sm-9 col-md-5 col-lg-6" style={{ paddingTop : '15px' }}>
                            {/* labInfo() */}
                        </div>

                    </div>
                    
                    {usr.access_keys ?
                        <div className="access-keys panel">
                            <h3 className="text-300">Access Keys</h3>
                            <div className="data-display">
                                <AccessKeyTable user={usr} access_keys={usr.access_keys} />
                            </div>
                        </div>
                    : ''}

                </div>
            </div>
        );
    }
});


globals.content_views.register(User, 'User');

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
