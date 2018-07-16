'use strict';

import React from 'react';
import { Alert, Fade } from 'react-bootstrap';
import _ from 'underscore';
import * as store from '../store';

const defaultNavigateDisappearThreshold = 1;

let alertNavigatationCountMap = {};

/**
 * A Component and utility (via Component's 'statics' property & functions) to 
 * queue and dequeue alerts from appearing at top of pages. Alerts, once queued, will persist until they are closed by
 * the end user, which is the same functionality as calling Alerts.deQueue(alert) from anywhere in application, supplying the same
 * title for alert that was queued.
 * 
 * @class Alerts
 * @prop {Object[]} alerts - List of Alert objects currently being displayed. Should be passed down from Redux store from App.
 */
export default class Alerts extends React.Component {

    /**
     * Open an alert box.
     * More specifically, saves a new alert to Redux store 'alerts' field.
     *
     * @public
     * @param {Object} alert                    Object with 'title', 'message', and 'style' properties. Used for alert message element at top of page.
     * @param {string} alert.title              Title to be shown at top of alert box.
     * @param {string|JSXElement} alert.message Message to be shown in body of alert box. May be JSX if no plans for alert to be rendered server-side.
     * @param {string} alert.style              Style of alert box. May be any Bootstrap-compliant style, e.g. "danger", "warning", "info".
     * @returns {undefined}                     Nothing
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
     * @param {Object} alert - Object with at least 'title'.
     * @returns {undefined} Nothing
     */
    static deQueue(alert, currentAlerts = null){
        if (!Array.isArray(currentAlerts)) currentAlerts = store.getState().alerts;
        currentAlerts = currentAlerts.filter(function(a){ return a.title != alert.title; });
        store.dispatch({
            type: { 'alerts' : currentAlerts }
        });
    }

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

    // Common alert definitions
    static LoggedOut = {
        "title"     : "Logged Out",
        "message"   : "You have been logged out due to an expired session.",
        "style"     : 'danger',
        'navigateDisappearThreshold' : 1
    }

    static NoFilterResults = {
        'title'     : "No Results",
        'message'   : "Selecting this filter returned no results so it was deselected.",
        'style'     : "warning",
        'navigateDisappearThreshold' : 3
    }

    static ConnectionError = {
        "title" : "Connection Error",
        "message" : "Check your internet connection",
        "style" : "danger",
        'navigateDisappearThreshold' : 1
    }

    static LoginFailed = {
        "title" : "Login Failed",
        "message" : "Your attempt to login failed - please check your credentials or try again later.",
        "style" : "danger",
        'navigateDisappearThreshold' : 1
    }


    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.state = {
            'dismissing' : []
        };
    }

    setDismissing(dismissing){ this.setState({ dismissing }); }

    /**
     * Renders out Bootstrap Alerts for any queued alerts.
     *
     * @returns {JSX.Element} A <div> element.
     */
    render(){
        if (this.props.alerts.length === 0) return null;

        return (
            <div className="alerts" children={_.map(this.props.alerts, (alert, index, alerts) =>
                <AlertItem {...{ alert, index, alerts }} setDismissing={this.setDismissing} dismissing={this.state.dismissing} key={index} />
            )} />
        );
    }
}

class AlertItem extends React.PureComponent {

    constructor(props){
        super(props);
        this.dismiss = this.dismiss.bind(this);
        this.finishDismiss = this.finishDismiss.bind(this);
    }

    dismiss(){
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
                <div>
                    <Alert bsStyle={alert.style || 'danger'}
                        onDismiss={alert.noCloseButton === true ? null : this.dismiss}
                        className={alert.noCloseButton === true ? 'no-close-button' : null}>
                        <h4>{ alert.title }</h4>
                        <div className="mb-0" children={alert.message} />
                    </Alert>
                </div>
            </Fade>
        );
    }

}
