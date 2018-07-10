/** @preventMunge */
/* ^ see http://stackoverflow.com/questions/30110437/leading-underscore-transpiled-wrong-with-es6-classes */

'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Modal, Alert } from 'react-bootstrap';
var jwt = require('jsonwebtoken');
import { ItemStore } from './../lib/store';
import { panel_views, content_views } from './../globals';
var store = require('./../../store');
import { ajax, JWT, console, DateUtility, navigate, object } from './../util';
import { FormattedInfoBlock } from './components';
import { EditableField, FieldSet } from './../forms';


/**
 * Contains the User profile page view as well as Impersonate User form.
 * Only the User view is exported.
 *
 * @module item-pages/user
 */


/**
 * Extends ItemStore to help manage collection of Access Keys from back-end.
 *
 * @memberof module:item-pages/user
 * @extends module:lib/store.ItemStore
 * @private
 */
class AccessKeyStore extends ItemStore {
    resetSecret(id) {
        this.fetch(id + 'reset-secret', {
            method: 'POST',
        }, response => this.dispatch('onResetSecret', response));
    }
}

/**
 * Component which fetches, saves, and show access keys that user may use to submit
 * experiments and other data.
 *
 * @memberof module:item-pages/user
 * @namespace
 * @type {Component}
 * @private
 */


class AccessKeyTable extends React.Component {

    static propTypes = {
        'access_keys' : PropTypes.array.isRequired,
        'session' : PropTypes.bool,
        'user' : PropTypes.shape({
            '@id' : PropTypes.string.isRequired,
            'access_keys' : PropTypes.array.isRequired,
            'email' : PropTypes.string,
            'first_name' : PropTypes.string,
            'last_name' : PropTypes.string,
            'groups' : PropTypes.array,
            'status' : PropTypes.string,
            'timezone' : PropTypes.string,
            'job_title' : PropTypes.string,
            'submits_for' : PropTypes.array
        })
    }

    constructor(props){
        super(props);
        this.create = this.create.bind(this);
        this.doAction = this.doAction.bind(this);
        this.onCreate = this.onCreate.bind(this);
        this.onResetSecret = this.onResetSecret.bind(this);
        this.showNewSecret = this.showNewSecret.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onError = this.onError.bind(this);
        this.hideModal = this.hideModal.bind(this);

        this.renderTable = this.renderTable.bind(this);
        this.render = this.render.bind(this);
        
        this.store = new AccessKeyStore(props.access_keys, this, 'access_keys');
        this.state = {
            access_keys : props.access_keys
        };
    }


    /**
     * Add new access key for user via AJAX.
     *
     * @param {MouseEvent} e - Click event.
     */
    create(e) {
        e.preventDefault();
        var item = {};
        if(this.props.session){
            var idToken = JWT.get();
            if (idToken){
                var decoded = jwt.decode(idToken);
                item['user'] = decoded.email_verified ? decoded.email : "";
            } else {
                console.warn("Access key aborted");
                return;
            }
        }
        this.store.create('/access-keys/', item);
    }

    doAction(action, arg, e) {
        e.preventDefault();
        this.store[action](arg);
    }

    onCreate(response) {
        this.showNewSecret('Your secret key has been created.', response);
    }

    onResetSecret(response) {
        this.showNewSecret('Your secret key has been reset.', response);
    }

    showNewSecret(title, response) {
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
    }


    onDelete(item) {
        this.setState({modal:
            <Modal show={true} onHide={this.hideModal}>
                <Modal.Header>
                    <Modal.Title>{'Access key ' + item['access_key_id'] + ' has been deleted.'}</Modal.Title>
                </Modal.Header>
            </Modal>
        });
    }

    onError(error) {
        var View = content_views.lookup(error);
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
    }

    hideModal() {
        this.setState({modal: null});
    }


    renderTable(){
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
                    <td>
                        { key.date_created ?
                            <DateUtility.LocalizedTime
                                timestamp={key.date_created}
                                formatType="date-time-md"
                                dateTimeSeparator=" - "
                            />
                            :
                            'N/A'
                        }
                    </td>
                    <td>{ key.description }</td>
                    <td className="access-key-buttons">
                        <a href="#" className="btn btn-xs btn-success" onClick={this.doAction.bind(this, 'resetSecret', key['@id'])}>Reset</a>
                        <a href="#" className="btn btn-xs btn-danger" onClick={this.doAction.bind(this, 'delete', {'@id':key['@id'],'uuid':key.uuid})}>Delete</a>
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

    }


    render() {
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
    }

}



/**
 * Draws a User Profile page.
 *
 * @public
 * @type {Component}
 * @prop {Object} context - Context value for user, e.g. from Redux store. AKA user object.
 * @prop {Object} schemas - Object of schemas, e.g. passed from app state.
 * @memberof module:item-pages/user
 */

export default class UserView extends React.Component {

    static propTypes = {
        'context' : PropTypes.shape({
            '@id' : PropTypes.string.isRequired,
            'access_keys' : PropTypes.array,
            'email' : PropTypes.string,
            'first_name' : PropTypes.string,
            'last_name' : PropTypes.string,
            'title' : PropTypes.string,
            'groups' : PropTypes.array,
            'lab' : PropTypes.object,
            'status' : PropTypes.string,
            'timezone' : PropTypes.string,
            'job_title' : PropTypes.string
        }),
        'href' : PropTypes.string.isRequired,
        'listActionsFor' : PropTypes.func.isRequired,
        'schemas' : PropTypes.shape({
            'User' : PropTypes.shape({
                'required' : PropTypes.array,
                'properties' : PropTypes.shape({
                    'first_name' : PropTypes.object,
                    'last_name' : PropTypes.object,
                    'email' : PropTypes.object,
                    'phone1' : PropTypes.object,
                    'fax' : PropTypes.object,
                    'skype' : PropTypes.object,
                    // etc.
                })
            })
        })
    }

    mayEdit(){
        return this.props.listActionsFor('context').filter(function(action){
            return action.name && action.name === 'edit';
        }).length > 0 ? true : false;
    }

    render() {

        var user = this.props.context;

        var crumbs = [
            {id: 'Users'}
        ];

        var mayEdit = this.mayEdit();
        var ifCurrentlyEditingClass = this.state && this.state.currentlyEditing ? ' editing editable-fields-container' : '';

        return (
            <div className="user-profile-page">

                <header className="row">
                    <div className="col-sm-12">
                    </div>
                </header>

                <div className={"page-container data-display" + ifCurrentlyEditingClass}>

                    <div className="row first-row row-eq-height-md">

                        <div className="col-sm-10 col-sm-offset-1 col-md-offset-0 col-md-6 col-lg-7">

                            <div className="panel user-info shadow-border">
                                <div className="user-title-row-container">
                                    <div className="row title-row">
                                        <div className="col-sm-3 gravatar-container">
                                            { object.itemUtil.User.gravatar(user.email, 70) }
                                            <a className="edit-button-remote text-center" target="_blank" href="https://gravatar.com"><i className="icon icon-pencil"/></a>
                                        </div>
                                        <div className="col-sm-9 user-title-col">
                                            <h1 className="user-title">
                                                <FieldSet
                                                    context={user}
                                                    parent={this}
                                                    style="inline"
                                                    inputSize="lg"
                                                    absoluteBox={true}
                                                    objectType="User"
                                                    schemas={this.props.schemas}
                                                    disabled={!mayEdit}
                                                    href={this.props.href}
                                                >
                                                    <EditableField
                                                        labelID="first_name"
                                                        fallbackText="No first name set"
                                                        placeholder="First name"
                                                    />
                                                    {' '}
                                                    <EditableField
                                                        labelID="last_name"
                                                        fallbackText="No last name set"
                                                        placeholder="Last name"
                                                    />
                                                </FieldSet>
                                            </h1>
                                        </div>
                                    </div>
                                </div>
                                <ProfileContactFields user={user} parent={this} mayEdit={mayEdit} href={this.props.href} />
                            </div>

                        </div>
                        <div className="col-sm-10 col-sm-offset-1 col-md-offset-0 col-md-6 col-lg-5">
                            <ProfileWorkFields user={user} parent={this} href={this.props.href} />
                        </div>

                    </div>

                    {
                        typeof user.access_keys !== 'undefined' ?

                        <div className="access-keys-container">
                            <h3 className="text-300">Access Keys</h3>
                            <div className="data-display">
                                <AccessKeyTable user={user} access_keys={user.access_keys} />
                            </div>
                        </div>

                    : '' }

                </div>
            </div>
        );
    }

}

content_views.register(UserView, 'User');


/**
 * Renders out the contact fields for user, which are editable.
 * Shows Gravatar and User's first and last name at top.
 *
 * @private
 * @type {Component}
 */
class ProfileContactFields extends React.Component {

    static icon(iconName){
        return <i className={"visible-lg-inline icon icon-fw icon-" + iconName }></i>;
    }

    render(){
        var user = this.props.user;

        return (
            <FieldSet
                context={user}
                parent={this.props.parent}
                className="profile-contact-fields"
                disabled={!this.props.mayEdit}
                objectType="User"
                schemas={this.props.schemas}
                href={this.props.href}
            >

                <EditableField label="Email" labelID="email" placeholder="name@example.com" fallbackText="No email address" fieldType="email" disabled={true}>
                    { ProfileContactFields.icon('envelope') }&nbsp; <a href={'mailto:' + user.email}>{ user.email }</a>
                </EditableField>

                <EditableField label="Phone" labelID="phone1" placeholder="17775551234 x47" fallbackText="No phone number" fieldType="phone">
                    { ProfileContactFields.icon('phone') }&nbsp; { user.phone1 }
                </EditableField>

                <EditableField label="Fax" labelID="fax" placeholder="17775554321" fallbackText="No fax number" fieldType="phone">
                    { ProfileContactFields.icon('fax') }&nbsp; { user.fax }
                </EditableField>

                <EditableField label="Skype" labelID="skype" fallbackText="No skype ID" fieldType="username">
                    { ProfileContactFields.icon('skype') }&nbsp; { user.skype }
                </EditableField>

            </FieldSet>
        );
    }

}


/**
 * Renders out the lab and awards fields for user, which are not editable.
 * Uses AJAX to fetch details for fields which are not embedded.
 *
 * @private
 * @type {Component}
 */

class ProfileWorkFields extends React.Component {


    static defaultProps = {
        containerClassName : 'panel user-work-info shadow-border'
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.getAwardsList = this.getAwardsList.bind(this);
        this.updateAwardsList = this.updateAwardsList.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            details_lab : null,        // Use FormattedInfoBlock.ajaxPropertyDetails.call(this, args...) to set.
            awards_list : null
        };
    }

    /**
     * If Lab details are not embedded, fetch them.
     */
    componentDidMount(){

        if (!this.state.details_lab){
            this.isLabFetched = FormattedInfoBlock.onMountMaybeFetch.call(this, 'lab', this.props.user.lab, (detail) => this.updateAwardsList([detail]) );
            if (!this.isLabFetched){
                this.updateAwardsList([this.props.user.lab]);
            }
        }

        if (typeof this.props.user.lab == 'string' && !this.state.details_lab){
            // Fetch lab info & update into User instance state via the -for mixin-like-usage ajaxPropertyDetails func.

            //FormattedInfoBlock.ajaxPropertyDetails.call(this, this.props.user.lab, 'lab', (detail) => this.updateAwardsList([detail]) );
        }
    }

    componentWillUnmount(){ delete this.isLabFetched; }

    /**
     * Get list of all awards (unique) from list of labs.
     * ToDo : Migrate somewhere more static-cy.
     * 
     * @param {Object[]} labDetails - Array of lab objects with embedded award details.
     * @return {Object[]} List of all unique awards in labs.
     */
    getAwardsList(labDetails){
        // Awards are embedded within labs, so we get full details.
        var awardsList = [];

        function addAwardToList(award){
            if (_.pluck(awardsList, 'uuid').indexOf(labDetails[i].awards[j].uuid) === -1){
                awardsList.push(labDetails[i].awards[j]);
            }
        }

        for (var i = 0; i < labDetails.length; i++){
            if (typeof labDetails[i].awards !== 'undefined' && Array.isArray(labDetails[i].awards)){
                for (var j = 0; j < labDetails[i].awards.length; j++){
                    addAwardToList(labDetails[i].awards[j]);
                }
            }
        }

        return awardsList;
    }

    /**
     * Update state.awards_list with award details from list of lab details.
     *
     * @param {Object[]} labDetails - Array of lab objects with embedded award details.
     * @returns {undefined} Nothing.
     */
    updateAwardsList(labDetails){
        var currentAwardsList = (this.state.awards_list || []).slice(0);
        var currentAwardsListIDs = currentAwardsList.map((awd) => {
            if (typeof awd === 'string') return awd;
            return object.atIdFromObject(awd);
        });
        var newAwards = this.getAwardsList(labDetails);
        for (var i = 0; i < newAwards.length; i++){
            if (currentAwardsListIDs.indexOf(object.atIdFromObject(newAwards[i])) === -1){
                currentAwardsList.push(newAwards[i]);
            }
        }
        if (!Array.isArray(this.state.awards_list )|| !_.isEqual(this.state.awards_list, currentAwardsList)){
            this.setState({'awards_list' : currentAwardsList});
        }
    }


    render(){
        var user = this.props.user;
        if (user.submits_for && user.submits_for.length > 0){
            var submits_for = user.submits_for;
        }

        // THESE FIELDS ARE NOT EDITABLE.
        // To be modified by admins, potentially w/ exception of 'Primary Lab' (e.g. select from submits_for list).
        return (
            <div className={this.props.containerClassName}>
                <h3 className="text-300 block-title">
                    <i className="icon icon-users icon-fw"></i> Organizations
                </h3>
                <div className="row field-entry lab">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="lab">Primary Lab</label>
                    </div>
                    <div id="lab" className="col-sm-9 value text-500">
                        { typeof user.lab !== 'undefined' ?
                            (object.linkFromItem(this.isLabFetched ? this.state.details_lab : user.lab))
                            :
                            <span className="not-set">No Labs</span>
                        }
                    </div>
                </div>
                <div className="row field-entry job_title">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="job_title">Role</label>
                    </div>
                    <div id="job_title" className="col-sm-9 value">
                        { user.job_title || <span className="not-set">No Job Title</span> }
                    </div>
                </div>
                <div className="row field-entry submits_for">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="submits_for">Submits For</label>
                    </div>
                    <div className="col-sm-9 value text-500">
                        <FormattedInfoBlock.List
                            renderItem={object.linkFromItem}
                            endpoints={(user && user.submits_for && user.submits_for.map(function(o){
                                if (typeof o === 'string') return o;
                                if (typeof o.link_id === 'string') return o.link_id.replace(/~/g,'/');
                                if (typeof o['@id'] === 'string') return o['@id'];
                            })) || []}
                            propertyName="submits_for"
                            fallbackMsg="Not submitting for any organizations"
                            ajaxCallback={this.updateAwardsList}
                        />
                    </div>
                </div>
                <div className="row field-entry awards">
                    <div className="col-sm-3 text-right text-left-xs">
                        <label htmlFor="awards">Awards</label>
                    </div>
                    <div className="col-sm-9 value text-500">
                        <FormattedInfoBlock.List
                            details={this.state.awards_list}
                            renderItem={object.linkFromItem}
                            propertyName="awards"
                            fallbackMsg="No awards"
                            loading={this.state.awards_list === null && (
                                user.lab || (user.submits_for && user.submits_for > 0)
                            ) ? true : false}
                        />
                    </div>
                </div>
            </div>
        );
    }

}


/**
 * @private
 * @type {Component}
 */
class BasicForm extends React.Component {

    constructor(props){
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.state = {
            'value' : ''
        };
    }

    handleChange(e) {
        this.setState({ value: e.target.value });
    }

    handleSubmit(e){
        e.preventDefault();
        if(this.state.value.length == 0){
            return;
        }
        this.props.submitImpersonate(this.state.value);
        this.setState({ value: '' });
    }

    render() {
        return(
            <form onSubmit={this.handleSubmit}>
                <input className="impersonate-user impersonate-user-field" type='text' placeholder='Enter an email to impersonate...'
                    onChange={this.handleChange} value={this.state.value}/>
                <input className="impersonate-user" type="submit" value="Submit" />
            </form>
        );
    }

}


/**
 * @private
 * @type {Component}
 */
export class ImpersonateUserForm extends React.Component {

    static propTypes = {
        updateUserInfo: PropTypes.func.isRequired
    }

    /**
     * Handler for Impersonate User submit button/action.
     * Performs AJAX request to '/impersonate-user' endpoint then saves returned JWT
     * as own and in order to pretend to be impersonated user.
     *
     * @instance
     * @param {Object} data - User ID or email address.
     */
    handleSubmit(data) {
        var url = "/impersonate-user";
        var jsonData = JSON.stringify({'userid':data});
        var callbackFxn = function(payload) {
            alert('Success! ' + data + ' is being impersonated.');
            //if(typeof(Storage) !== 'undefined'){ // check if localStorage supported
            //    localStorage.setItem("user_info", JSON.stringify(payload));
            //}
            JWT.saveUserInfo(payload);
            this.props.updateUserInfo();
            navigate('/');
        }.bind(this);
        var fallbackFxn = function() {
            alert('Impersonation unsuccessful.\nPlease check to make sure the provided email is correct.');
        };

        //var userInfo = localStorage.getItem('user_info') || null;
        //var idToken = userInfo ? JSON.parse(userInfo).id_token : null;
        //var reqHeaders = {'Accept': 'application/json'};
        //if(userInfo){
        //    reqHeaders['Authorization'] = 'Bearer '+idToken;
        //}
        ajax.load(url, callbackFxn, 'POST', fallbackFxn, jsonData);
    }

    render() {
        var form = <BasicForm submitImpersonate={this.handleSubmit} />;
        return (
            <div style={{marginTop : 30}}>
                <h2>Impersonate User</h2>
                {form}
            </div>
        );
    }

}

content_views.register(ImpersonateUserForm, 'Portal', 'impersonate-user');
