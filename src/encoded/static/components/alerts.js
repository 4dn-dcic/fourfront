'use strict';

var React = require('react');
var { Alert, Collapse } = require('react-bootstrap');
var _ = require('underscore');

var Alerts = module.exports = React.createClass({

    statics : {
        instance : null,
        preMountQueue : [],
        queue : function(alert){
            if (typeof Alerts.instance === 'undefined' || !Alerts.instance) {
                console.error('No Alerts component exists anywhere yet.');
                Alerts.preMountQueue.push(alert);
                return;
            }
            Alerts.instance.queue.call(Alert.instance, alert); 
        }
    },

    getInitialState : function(){ return { 
        'alerts' : typeof this.props.initialAlerts !== 'undefined' && Array.isArray(this.props.initialAlerts) ? this.props.initialAlerts : [],
        'isMounted' : false,
        'closing' : false
    }; },

    componentDidMount : function(){
        var stateObj;
        // Only one of these meant to be created in app, so can import and queue to from anywhere w/o refs.
        if (typeof Alerts.instance !== 'undefined' && Alerts.instance && typeof Alerts.instance.state !== 'undefined') {
            stateObj = Alerts.instance.state || {};
        } else stateObj = {};

        Alerts.instance = this;
        
        var stateObj = { 'isMounted' : true };
        if (Alerts.preMountQueue.length > 0) { 
            stateObj.alerts = this.state.alerts.concat(Alerts.preMountQueue);
            Alerts.preMountQueue = [];
        }
        this.setState(stateObj);
    },

    queue : function(alert){
        if (typeof this.state.isMounted !== 'boolean' || !this.state.isMounted) {
            Alerts.preMountQueue.push(alert);
            return;
        }
        var alerts = _.clone(this.state.alerts);
        alerts.push(alert);
        setTimeout(() => this.setState({ 'alerts' : alerts }), 0);
    },

    dismissed : [],

    render : function(){
        if (this.state.alerts.length === 0) return null;
        
        function dismiss(index){
            var alerts = _.clone(this.state.alerts);
            this.dismissed.push(alerts.splice(index, 1));
            this.setState({ 'closing' : true });
            setTimeout(()=>{
                this.dismissed.shift();
                this.setState({ 'alerts' : alerts, 'closing' : false });
            }, 250);
        };
        // ToDo: Transition
        return (
            <div className="alerts">
            { 
                this.state.alerts.map(function(alert,i){
                    return (
                        <Collapse key={'alert-' + i} timeout={250} in={ this.dismissed.filter((a)=> a.title === alert.title ).length < 1 }>
                            <Alert bsStyle={alert.style || 'danger'} onDismiss={dismiss.bind(this, i)}>
                                <h4>{ alert.title }</h4>
                                <p>{ alert.message }</p>
                            </Alert>
                        </Collapse>
                    );
                }.bind(this))
            }
            </div>
        );
    }
});
