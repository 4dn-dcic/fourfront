'use strict';

var React = require('react');
var { Alert, Fade } = require('react-bootstrap');
var _ = require('underscore');
var store = require('../store');

var Alerts = module.exports = React.createClass({

    statics : {
        queue : function(alert, callback){
            store.dispatch({
                type: { 'alerts' : store.getState().alerts.concat([alert]) }
            });
        },
        deQueue : function(alert, callback){
            store.dispatch({
                type: { 'alerts' : _.without(store.getState().alerts, alert) }
            });
        },
        // Common alert definitions
        LoggedOut : {"title" : "Logged Out", "message" : "You have been logged out due to an expired session.", style : 'danger'}
    },

    getInitialState : function(){ 
        return {
            'dismissing' : []
        }; 
    },

    render : function(){
        if (this.props.alerts.length === 0) return null;
        
        function dismiss(index){
            var currentAlert = this.props.alerts.slice(index, index + 1)[0];
            var dismissing = _.clone(this.state.dismissing);
            if (_.findIndex(dismissing, currentAlert) === -1) dismissing.push(currentAlert);
            this.setState({ 'dismissing' : dismissing });
        };

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
                                <Alert bsStyle={alert.style || 'danger'} onDismiss={dismiss.bind(this, i)}>
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
});
