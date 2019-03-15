'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import {  Button, Fade } from 'react-bootstrap';
import _ from 'underscore';
import * as store from '../store';
import { typedefs } from './util';

var { AlertObj } = typedefs;

const defaultNavigateDisappearThreshold = 1;

let alertNavigatationCountMap = {};


/**
 * A Component and utility (via Component's 'statics' property & functions) to
 * queue and dequeue alerts from appearing at top of pages. Alerts, once queued, will persist until they are closed by
 * the end user, which is the same functionality as calling Alerts.deQueue(alert) from anywhere in application, supplying the same
 * title for alert that was queued.
 */
export default class Alerts extends React.Component {

    /**
     * Open an alert box.
     * More specifically, saves a new alert to Redux store 'alerts' field.
     *
     * @public
     * @param {AlertObj} alert              Object used to represent alert message element contents at top of page.
     * @param {function} [callback]         Optional function to be ran after queuing.
     * @param {AlertObj[]} [currentAlerts]  Current alerts, if any. Pass in for performance, else will retrieve them from Redux.
     * @returns {void} Nothing
     */
    static queue(alert, callback, currentAlerts = null){
        if (!Array.isArray(currentAlerts)) currentAlerts = store.getState().alerts;
        var duplicateTitleAlertIdx = _.findIndex(currentAlerts, { 'title' : alert.title }),
            newAlerts = currentAlerts.slice(0);

        if (typeof duplicateTitleAlertIdx === 'number' && duplicateTitleAlertIdx > -1){
            // Same alert already set, lets update it instead of adding new one.
            newAlerts.splice(duplicateTitleAlertIdx, 1, alert);
        } else {
            newAlerts.push(alert);
        }
        store.dispatch({
            type: { 'alerts' : newAlerts }
        });
    }

    /**
     * Close an alert box.
     *
     * @public
     * @param {AlertObj} alert - Object with at least 'title'.
     * @param {AlertObj[]} [currentAlerts] - Current alerts, if any. Pass in for performance, else will retrieve them from Redux.
     * @returns {void} Nothing
     */
    static deQueue(alert, currentAlerts = null){
        if (!Array.isArray(currentAlerts)) currentAlerts = store.getState().alerts;
        currentAlerts = currentAlerts.filter(function(a){ return a.title != alert.title; });
        store.dispatch({
            type: { 'alerts' : currentAlerts }
        });
    }

    /**
     * This is called after each navigation within the portal.
     * It increments counter per each alert title, and if counter exceeds
     * limit of any `alert.navigateDisappearThreshold`, the alerts is dequeued.
     *
     * @static
     * @param {AlertObj[]} [currentAlerts=null] Current alerts, if any. Pass in for performance, else will retrieve them from Redux.
     * @returns {undefined} Nothing
     */
    static updateCurrentAlertsTitleMap(currentAlerts = null){
        if (!Array.isArray(currentAlerts)) currentAlerts = store.getState().alerts;
        var titles = _.pluck(currentAlerts, 'title').sort();
        var removedTitles = _.difference(_.keys(alertNavigatationCountMap).sort(), titles);
        removedTitles.forEach(function(rt){
            delete alertNavigatationCountMap[rt];
        });
        currentAlerts.forEach(function(a){
            if (typeof alertNavigatationCountMap[a.title] === 'undefined'){
                alertNavigatationCountMap[a.title] = [ 1, a.navigateDisappearThreshold || defaultNavigateDisappearThreshold ];
            } else {
                alertNavigatationCountMap[a.title][0]++;
            }
            if (alertNavigatationCountMap[a.title][0] >= alertNavigatationCountMap[a.title][1]){
                Alerts.deQueue(a, currentAlerts);
            }
        });
    }

    /**
     * Alert definition for person having been logged out.
     *
     * @type {AlertObj}
     * @public
     * @constant
     */
    static LoggedOut = {
        "title"     : "Logged Out",
        "message"   : "You have been logged out due to an expired session.",
        "style"     : 'danger',
        'navigateDisappearThreshold' : 2
    };

    /**
     * Alert definition for 0 results being returned from /browse/ or /search/ endpoint.
     *
     * @type {AlertObj}
     * @public
     * @constant
     */
    static NoFilterResults = {
        'title'     : "No Results",
        'message'   : "Selecting this filter returned no results so it was deselected.",
        'style'     : "warning",
        'navigateDisappearThreshold' : 3
    };

    /**
     * Alert definition for a connection error, e.g. as detected by an AJAX call.
     *
     * @type {AlertObj}
     * @public
     * @constant
     */
    static ConnectionError = {
        "title" : "Connection Error",
        "message" : "Check your internet connection",
        "style" : "danger",
        'navigateDisappearThreshold' : 1
    };

    /**
     * Alert definition for person failing to log in.
     *
     * @type {AlertObj}
     * @public
     * @constant
     */
    static LoginFailed = {
        "title" : "Login Failed",
        "message" : "Your attempt to login failed - please check your credentials or try again later.",
        "style" : "danger",
        'navigateDisappearThreshold' : 1
    };

    /**
     * @ignore
     * @constant
     * @type {Object}
     */
    static propTypes = {
        /**
         * List of Alert objects currently being displayed. Should be passed down from Redux store from App.
         *
         * @type {AlertObj[]}
         */
        'alerts' : PropTypes.arrayOf(PropTypes.shape({
            'title' : PropTypes.string.isRequired,
            'message' : PropTypes.string.isRequired,
            'style' : PropTypes.string,
            'navigationDissappearThreshold' : PropTypes.number
        }))
    };

    /** @ignore */
    constructor(props){
        super(props);
        this.setDismissing = this.setDismissing.bind(this);
        this.render = this.render.bind(this);

        /**
         * State object for component.
         *
         * @type {Object}
         * @private
         * @property {AlertObj[]} state.dismissing - List of alerts currently being faded out.
         */
        this.state = {
            'dismissing' : []
        };
    }

    /**
     * Called when 'fade out' of an alert is initialized.
     * @private
     */
    setDismissing(dismissing){ this.setState({ dismissing }); }

    /**
     * Renders out Bootstrap Alerts for any queued alerts.
     *
     * @private
     * @returns {JSX.Element} A `<div>` element containing AlertItems as children.
     */
    render(){
        if (this.props.alerts.length === 0) return null;

        return (
            <div className="alerts mt-2" {..._.omit(this.props, 'children', 'alerts')} children={_.map(this.props.alerts, (alert, index, alerts) =>
                <AlertItem {...{ alert, index, alerts }} setDismissing={this.setDismissing} dismissing={this.state.dismissing} key={index} />
            )} />
        );
    }
}

/**
 * Component which renders out an individual Alert.
 * Rendered by `Alerts` component.
 *
 * @ignore
 * @private
 */
class AlertItem extends React.PureComponent {

    constructor(props){
        super(props);
        this.dismiss = this.dismiss.bind(this);
        this.finishDismiss = this.finishDismiss.bind(this);
    }

    dismiss(e){
        e.stopPropagation();
        e.preventDefault();
        var { alert, dismissing, setDismissing } = this.props;
        dismissing = dismissing.slice(0);
        if (_.findIndex(dismissing, alert) === -1) dismissing.push(alert);
        setDismissing(dismissing);
    }

    finishDismiss(){
        var { alert, dismissing, setDismissing, alerts } = this.props;
        setDismissing(_.without(dismissing, alert));
        store.dispatch({
            type: { 'alerts' : _.without(alerts, alert) }
        });
    }

    render(){
        var { index, alert, dismissing } = this.props;
        return (
            <Fade timeout={500}
                in={ _.findIndex(dismissing, alert) === -1 }
                onExited={this.finishDismiss} unmountOnExit={true}>
                <div className={"alert alert-dismissable alert-" + (alert.style || 'danger') + (alert.noCloseButton === true ? ' no-close-button' : '')}>
                    { alert.noCloseButton === true ? null :
                        <button type="button" className="close" onClick={this.dismiss}>
                            <span aria-hidden="true">×</span>
                            <span className="sr-only">Close alert</span>
                        </button>
                    }
                    <h4>{ alert.title }</h4>
                    <div className="mb-0" children={alert.message} />
                </div>
            </Fade>
        );
    }

}
