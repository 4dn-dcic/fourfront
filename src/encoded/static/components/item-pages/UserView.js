/** @preventMunge */
/* ^ see http://stackoverflow.com/questions/30110437/leading-underscore-transpiled-wrong-with-es6-classes */

'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Modal, Alert, FormControl, Button } from 'react-bootstrap';
var jwt = require('jsonwebtoken');
import { ItemStore } from './../lib/store';
import { content_views } from './../globals';
import { ajax, JWT, console, DateUtility, navigate, object } from './../util';
import { FormattedInfoBlock } from './components';
import { EditableField, FieldSet } from './../forms/components';

import { Item } from './../util/typedefs';


/**
 * Contains the User profile page view as well as Impersonate User form.
 * Only the User view is exported.
 *
 * @module item-pages/user
 */


/**
 * Extends ItemStore to help manage collection of Access Keys from back-end.
 *
 * @todo Remove/refactor this and the ItemStore dependency in favor of using a React Component to wrap and provide state to some child view in UserView.
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
        'access_keys' : PropTypes.array,
        'session' : PropTypes.bool,
        'user' : PropTypes.shape({
            '@id' : PropTypes.string.isRequired,
            'uuid' : PropTypes.string.isRequired,
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
        this.syncAccessKeysFromSearch = this.syncAccessKeysFromSearch.bind(this);
        this.create = this.create.bind(this);
        this.doAction = this.doAction.bind(this);
        this.onCreate = this.onCreate.bind(this);
        this.onResetSecret = this.onResetSecret.bind(this);
        this.showNewSecret = this.showNewSecret.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onError = this.onError.bind(this);
        this.hideModal = this.hideModal.bind(this);

        this.renderTableRow = this.renderTableRow.bind(this);
        this.renderTable = this.renderTable.bind(this);
        this.render = this.render.bind(this);

        var accessKeys = props.access_keys || null;
        if (accessKeys){
            this.store = new AccessKeyStore(props.access_keys, this, 'access_keys');
        } else {
            this.store = null;
        }
        this.state = {
            'access_keys'   : accessKeys,
            'loadingStatus' : accessKeys ? 'loaded' : 'loading',
            'modal'         : null
        };
    }

    componentDidMount(){
        if (!this.state.access_keys || !this.store){
            this.syncAccessKeysFromSearch();
        }
    }

    syncAccessKeysFromSearch(){
        var { user } = this.props;
        if (!user || !user.uuid || !object.isUUID(user.uuid)){
            throw new Error("No user, or invalid user.uuid supplied.");
        }
        var requestFailed = () => {
                this.setState({ 'loadingStatus' : 'failed', 'access_keys' : null });
            },
            requestSucceeded = (resp) => { // Use for both load success+fail ajax callback in case of 404 (no results)
                if (!resp || !Array.isArray(resp['@graph'])) return requestFailed();
                this.store = new AccessKeyStore(resp['@graph'], this, 'access_keys');
                this.setState({
                    'loadingStatus' :' loaded',
                    'access_keys' : resp['@graph']
                });
            },
            loadFxn = () => {
                var hrefToRequest = '/search/?type=AccessKey&limit=500&user.uuid=' + user.uuid;
                ajax.load(hrefToRequest, requestSucceeded, 'GET', requestSucceeded);
            };

        if (this.state.loadingStatus !== 'loading'){
            this.setState({ 'loadingStatus' : 'loading' }, loadFxn);
        } else {
            loadFxn();
        }
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

    showNewSecret(response, reset = false) {
        this.setState({ 'modal' :
            <Modal show onHide={this.hideModal}>
                <Modal.Header>{ reset ? <Modal.Title>Your secret key has been created.</Modal.Title> : <Modal.Title>Your secret key has been reset.</Modal.Title> }</Modal.Header>
                <Modal.Body>
                    Please make a note of the new secret access key.
                    This is the last time you will be able to view it.
                    <br/>(It might take a few minutes for the access key to show up in table after page refresh.)

                    <div className="row mt-15">
                        <div className="col-xs-4 text-600 text-right no-user-select">
                            Access Key ID
                        </div>
                        <div className="col-xs-8">
                            <code>{response.access_key_id}</code>
                        </div>
                    </div>
                    <div className="row mt-05">
                        <div className="col-xs-4 text-600 text-right no-user-select">
                            Secret Access Key
                        </div>
                        <div className="col-xs-8">
                            <code>{response.secret_access_key}</code>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        });
    }

    /**** Methods which are CALLED BY ITEMSTORE VIA DISPATCH(); TODO: Refactor, more Reactful ****/

    onCreate(response) { this.showNewSecret(response); }

    onResetSecret(response) { this.showNewSecret(response, true); }

    onDelete(item) {
        this.setState({ 'modal' :
            <Modal show onHide={this.hideModal}>
                <Modal.Header>
                    <Modal.Title className="text-400">Access key <span className="mono-text">{ item['access_key_id'] }</span> has been deleted.</Modal.Title>
                </Modal.Header>
            </Modal>
        });
    }

    onError(error) {
        var errorViewComponent = content_views.lookup(error);
        this.setState({ 'modal' :
            <Modal onHide={this.hideModal}>
                <Modal.Header><Modal.Title>Error</Modal.Title></Modal.Header>
                <Modal.Body><errorViewComponent context={error} loadingComplete /></Modal.Body>
            </Modal>
        });
    }

    hideModal() {
        this.setState({modal: null});
    }


    renderTableRow(key){
        return (
            <tr key={key.access_key_id}>
                <td className="access-key-id">{ key.access_key_id }</td>
                <td>{ key.date_created ? <DateUtility.LocalizedTime timestamp={key.date_created} formatType="date-time-md" dateTimeSeparator=" - " /> : 'N/A' }</td>
                <td>{ key.description }</td>
                <td className="access-key-buttons">
                    <a href="#" className="btn btn-xs btn-success" onClick={this.doAction.bind(this, 'resetSecret', key['@id'])}>Reset</a>
                    <a href="#" className="btn btn-xs btn-danger" onClick={this.doAction.bind(this, 'delete', {'@id':key['@id'],'uuid':key.uuid})}>Delete</a>
                </td>
            </tr>
        );
    }


    renderTable(){
        var { access_keys, loadingStatus } = this.state;

        if (!access_keys.length){
            return (
                <div className="no-access-keys">
                    <hr/><span>No access keys set.</span>
                </div>
            );
        }

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
                <tbody children={_.map(access_keys, this.renderTableRow)} />
            </table>
        );

    }

    wrapInContainer(children){
        return (
            <div className="access-keys-container">
                <h3 className="text-300">Access Keys</h3>
                <div className="access-keys-table-container clearfix" children={children}/>
            </div>
        );
    }


    render() {
        var { access_keys, loadingStatus, modal } = this.state;
        var className = "access-keys-table-container clearfix";

        if (!Array.isArray(access_keys) || !this.store){
            if (loadingStatus === 'loading'){
                return this.wrapInContainer(
                    <div className="text-center pt-3 pb-3">
                        <i className="icon icon-2x icon-fw icon-circle-o-notch icon-spin" style={{ 'color' : '#999' }}/>
                    </div>
                );
            } else if (loadingStatus === 'failed'){
                return this.wrapInContainer(
                    <div className="text-center pt-3 pb-3">
                        <i className="icon icon-2x icon-fw icon-times" style={{ 'color' : 'maroon' }}/>
                        <h4 className="text-400">Failed to load Access Keys</h4>
                    </div>
                );
            } else if (loadingStatus === 'loaded'){
                return this.wrapInContainer(
                    <div className="text-center pt-3 pb-3">
                        <i className="icon icon-2x icon-fw icon-times" style={{ 'color' : 'maroon' }}/>
                        <h4 className="text-400">Unknown Error</h4>
                    </div>
                );
            }
        }

        return this.wrapInContainer(
            <React.Fragment>
                { this.renderTable() }
                <a href="#add-access-key" id="add-access-key" className="btn btn-success mb-2" onClick={this.create}>Add Access Key</a>
                { modal }
            </React.Fragment>
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
                                                    windowWidth={this.props.windowWidth}>
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

                    <AccessKeyTable user={user} access_keys={user.access_keys} />

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
            <FieldSet context={user}
                parent={this.props.parent} className="profile-contact-fields"
                disabled={!this.props.mayEdit} objectType="User" windowWidth={this.props.windowWidth}
                schemas={this.props.schemas} href={this.props.href}>

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

    /**
    * Get list of all awards (unique) from list of labs.
    * ToDo : Migrate somewhere more static-cy.
    *
    * @param {Item[]} labDetails - Array of lab objects with embedded award details.
    * @return {Item[]} List of all unique awards in labs.
    */
    static getAwardsList(labDetails){

        if (!labDetails || !Array.isArray(labDetails) || labDetails.length === 0){
            return [];
        }

        // Awards are embedded within labs, so we get full details.
        var awardsList = [];

        function addAwardToList(award){
            if (!award || typeof award['@id'] !== 'string' || _.pluck(awardsList, '@id').indexOf(award['@id']) > -1) return;
            awardsList.push(award);
        }

        _.forEach(labDetails, function(lab){
            if (!lab || !lab.awards || !Array.isArray(lab.awards) || lab.awards.length === 0) return;
            _.forEach(lab.awards, addAwardToList);
        });

        return awardsList;
    }


    static defaultProps = {
        containerClassName : 'panel user-work-info shadow-border'
    }

    constructor(props){
        super(props);
        this.updateAwardsList = this.updateAwardsList.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'awards_list' : []
        };

        if (props.user && props.user.lab && props.user.lab.awards){
            this.state.awards_list = props.user.lab.awards.slice(0);
        }
    }

    /**
     * Update state.awards_list with award details from list of lab details.
     *
     * @param {Item[]} labDetails - Array of lab objects with embedded award details.
     * @returns {void} Nothing.
     */
    updateAwardsList(labDetails){

        if (!labDetails || !Array.isArray(labDetails) || labDetails.length === 0){
            return;
        }

        this.setState(function(currState){
            // As of React 16 we can return null in setState func to cancel out of state update.
            var currAwardsList      = (currState.awards_list && currState.awards_list.slice(0)) || [],
                currAwardsListIDs   = new Set(currAwardsList.map(object.atIdFromObject)),
                newAwards           = ProfileWorkFields.getAwardsList(labDetails);

            for (var i = 0; i < newAwards.length; i++){
                var award   = newAwards[i],
                    awardID = award && object.atIdFromObject(award);
                if (!awardID) continue; // Error ?
                if (!currAwardsListIDs.has(awardID)) currAwardsList.push(award);
            }

            if (currAwardsList.length > (currState.awards_list || []).length){
                return { 'awards_list' : currAwardsList };
            } else {
                return null;
            }

        });
    }


    render(){
        var user        = this.props.user,
            awards      = this.state.awards_list,
            submits_for = null;

        if (user.submits_for && user.submits_for.length > 0){
            submits_for = user.submits_for;
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
                        { user.lab ? object.itemUtil.generateLink(user.lab) : <span className="not-set">No Labs</span> }
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
                            renderItem={object.itemUtil.generateLink}
                            endpoints={(submits_for && _.filter(_.map(submits_for, object.itemUtil.atId))) || []}
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
                            details={awards}
                            renderItem={object.linkFromItem}
                            propertyName="awards"
                            fallbackMsg="No awards"
                            loading={false}
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
        this.setState({ 'value': e.target.value });
    }

    handleSubmit(e){
        e.preventDefault();
        if(this.state.value.length == 0){
            return;
        }
        this.props.onSubmit(this.state.value);
        this.setState({ 'value': '' });
    }

    render() {
        return(
            <form onSubmit={this.handleSubmit}>
                <FormControl className="mt-08" type='text' placeholder='Enter an email to impersonate...'
                    onChange={this.handleChange} value={this.state.value}/>
                <Button className="mt-15 pull-right" type="submit" bsStyle="primary" bsSize="md">
                    <i className="icon icon-fw icon-user"/>&nbsp; Impersonate
                </Button>
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
        'updateUserInfo': PropTypes.func.isRequired
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
        var url = "/impersonate-user",
            postData = { 'userid' : data },
            callbackFxn = (resp) => {
                alert('Success! ' + data + ' is being impersonated.');
                //if(typeof(Storage) !== 'undefined'){ // check if localStorage supported
                //    localStorage.setItem("user_info", JSON.stringify(payload));
                //}
                JWT.saveUserInfo(resp);
                this.props.updateUserInfo();
                navigate('/');
            },
            fallbackFxn = function() {
                alert('Impersonation unsuccessful.\nPlease check to make sure the provided email is correct.');
            };

        //var userInfo = localStorage.getItem('user_info') || null;
        //var idToken = userInfo ? JSON.parse(userInfo).id_token : null;
        //var reqHeaders = {'Accept': 'application/json'};
        //if(userInfo){
        //    reqHeaders['Authorization'] = 'Bearer '+idToken;
        //}
        ajax.load(url, callbackFxn, 'POST', fallbackFxn, JSON.stringify(postData));
    }

    render() {
        return (
            <div className="mt-3">
                <hr />
                <h2 className="text-400 mt-5">Impersonate a User</h2>
                <div className="row">
                    <div className="col-xs-12 col-lg-6">
                        <BasicForm onSubmit={this.handleSubmit} />
                    </div>
                </div>
            </div>
        );
    }

}

content_views.register(ImpersonateUserForm, 'Portal', 'impersonate-user');
