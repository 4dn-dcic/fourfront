/** @preventMunge */
/* ^ see http://stackoverflow.com/questions/30110437/leading-underscore-transpiled-wrong-with-es6-classes */

'use strict';
var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var parseAndLogError = require('./parseError').parseAndLogError;
// var navigation = require('./navigation');
var Modal = require('react-bootstrap').Modal;
var Alert = require('react-bootstrap').Alert;
var ItemStore = require('./lib/store').ItemStore;
var ObjectPicker = require('./inputs').ObjectPicker;

// var Breadcrumbs = navigation.Breadcrumbs;


class AccessKeyStore extends ItemStore {
    resetSecret(id) {
        this.fetch(id + 'reset-secret', {
            method: 'POST',
        }, response => this.dispatch('onResetSecret', response));
    }
}


var AccessKeyTable = React.createClass({

    contextTypes: {
        fetch: React.PropTypes.func,
        session_properties: React.PropTypes.object
    },

    getInitialState: function() {
        var access_keys = this.props.access_keys;
        this.store = new AccessKeyStore(access_keys, this, 'access_keys');
        return {access_keys: access_keys};
    },

    render: function() {
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
        if (this.props.user['@id'] != this.context.session_properties.user['@id']) {
            item['user'] = this.props.user['@id'];
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
    render: function() {
        var context = this.props.context;
        var crumbs = [
            {id: 'Users'}
        ];
        return (
            <div>
                <header className="row">
                    <div className="col-sm-12">
                        <h1 className="page-title">{context.title}</h1>
                    </div>
                </header>
                <div className="panel data-display">
                    <dl className="key-value">
                        <div>
                            <dt>Title</dt>
                            <dd>{context.job_title}</dd>
                        </div>
                        <div>
                            <dt>Lab</dt>
                            <dd>{context.lab ? context.lab.title : ''}</dd>
                        </div>
                    </dl>
                </div>
                {context.email ?
                    <div>
                        <h3>Contact Info</h3>
                        <div className="panel data-display">
                            <dl className="key-value">
                                <dt>Email</dt>
                                <dd><a href={'mailto:' + context.email}>{context.email}</a></dd>
                            </dl>
                        </div>
                    </div>
                : ''}
                {context.access_keys ?
                    <div className="access-keys">
                        <h3>Access Keys</h3>
                        <div className="panel data-display">
                            <AccessKeyTable user={context} access_keys={context.access_keys} />
                        </div>
                    </div>
                : ''}
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
        var xmlhttp = new XMLHttpRequest();
        var url = "/impersonate-user";
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
                if (xmlhttp.status == 200) {
                    this.context.navigate('/');
                    alert('Success! ' + data + ' is being impersonated.');
                } else if (xmlhttp.status == 400) {
                    console.error('There was an error 400');
                    alert('Impersonation unsuccessful.\nPlease check to make sure the provided email is correct.');
                } else {
                    console.error('something else other than 200 was returned');
                    alert('Impersonation unsuccessful.\nPlease check to make sure the provided email is correct.');
                }
            }
        }.bind(this);
        xmlhttp.open("POST", url, true);
        xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xmlhttp.send(JSON.stringify({'userid':data}));
    }
});
globals.content_views.register(ImpersonateUserForm, 'Portal', 'impersonate-user');
