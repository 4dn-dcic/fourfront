'use strict';

import React from 'react';
import { Alert, Fade } from 'react-bootstrap';
import _ from 'underscore';
import * as store from '../store';

/**
 * A Component and utility (via Component's 'statics' property & functions) to 
 * queue and dequeue alerts from appearing at top of pages. Alerts, once queued, will persist until they are closed by
 * the end user, which is the same functionality as calling Alerts.deQueue(alert) from anywhere in application, supplying the same
 * title for alert that was queued.
 * 
 * @module {Component} alerts
 */

export default class Alerts extends React.Component {

    /**
     * Open an alert box.
     * More specifically, saves a new alert to Redux store 'alerts' field.
     * 
     * @public
     * @param {Object} alert - Object with 'title', 'message', and 'style' properties. Used for alert message element at top of page.
     * @returns {undefined} Nothing
     */
    static queue(alert, callback){
        var currentAlerts = store.getState().alerts;
        if (_.pluck(currentAlerts, 'title').indexOf(alert.title) > -1) return null; // Same alert is already set.
        store.dispatch({
            type: { 'alerts' : currentAlerts.concat([alert]) }
        });
    }

    /**
     * Close an alert box.
     * 
     * @public
     * @param {Object} alert - Object with at least 'title'.
     * @returns {undefined} Nothing
     */
    static deQueue(alert){
        var currentAlerts = store.getState().alerts;
        currentAlerts = currentAlerts.filter(function(a){ return a.title != alert.title; });
        store.dispatch({
            type: { 'alerts' : currentAlerts }
        });
    }

    // Common alert definitions
    static LoggedOut = {
        "title"     : "Logged Out",
        "message"   : "You have been logged out due to an expired session.",
        "style"     : 'danger'
    }

    static NoFilterResults = {
        'title'     : "No Results",
        'message'   : "Selecting this filter returned no results so it was deselected.",
        'style'     : "warning"
    }

    static ConnectionError = {
        "title" : "Connection Error",
        "message" : "Check your internet connection",
        "style" : "danger"
    }


    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.state = {
            'dismissing' : []
        };
    }

    /**
     * Renders out Bootstrap Alerts for any queued alerts.
     * 
     * @memberof module:alerts
     * @private
     * @instance
     * @returns {Element} A <div> element.
     */
    render(){
        if (this.props.alerts.length === 0) return null;

        function dismiss(index){
            var currentAlert = this.props.alerts.slice(index, index + 1)[0];
            var dismissing = _.clone(this.state.dismissing);
            if (_.findIndex(dismissing, currentAlert) === -1) dismissing.push(currentAlert);
            this.setState({ 'dismissing' : dismissing });
        }

        function finishDismiss(index){
            var currentAlert = this.props.alerts.slice(index, index + 1)[0];
            this.setState({ 'dismissing' : _.without(this.state.dismissing, currentAlert) });
            store.dispatch({
                type: { 'alerts' : _.without(this.props.alerts, currentAlert) }
            });
        }

        return (
            <div className="alerts">
            {
                this.props.alerts.map(function(alert,i){
                    return (
                        <Fade
                            key={'alert-' + i}
                            timeout={500}
                            in={ _.findIndex(this.state.dismissing, alert) === -1 }
                            onExited={finishDismiss.bind(this, i)}
                            unmountOnExit={true}
                        >
                            <div>
                                <Alert
                                    bsStyle={alert.style || 'danger'}
                                    onDismiss={alert.noCloseButton === true ? null : dismiss.bind(this, i)}
                                    className={alert.noCloseButton === true ? 'no-close-button' : null}
                                >
                                    <h4>{ alert.title }</h4>
                                    <p>{ alert.message }</p>
                                </Alert>
                            </div>
                        </Fade>
                    );
                }.bind(this))
            }
            </div>
        );
    }


}
