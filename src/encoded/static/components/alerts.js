'use strict';

var React = require('react');
var { Alert, Fade } = require('react-bootstrap');
var _ = require('underscore');

var Alerts = module.exports = React.createClass({

    statics : {
        instance : null,
        preMountQueue : [],
        preMountDeQueue: [],
        queue : function(alert, callback){
            if (typeof Alerts.instance === 'undefined' || !Alerts.instance) {
                console.error('No Alerts component exists anywhere yet.');
                Alerts.preMountQueue.push(alert);
                if (typeof callback === 'function') callback();
                return;
            }
            Alerts.instance.queue.call(Alert.instance, alert, callback); 
        },
        deQueue : function(alert, callback){
            if (typeof Alerts.instance === 'undefined' || !Alerts.instance) {
                console.error('No Alerts component exists anywhere yet.');
                Alerts.preMountQueue = _.without(Alerts.preMountQueue, alert);
                if (typeof callback === 'function') callback();
                return;
            }
            Alerts.instance.deQueue.call(Alert.instance, alert, callback); 
        },
        // Common alert definitions
        LoggedOut : {"title" : "Logged Out", "message" : "You have been logged out due to an expired session."}
    },

    getInitialState : function(){ 
        var alerts = [];
        if (
            !Alerts.instance && // Only grab first time mounted/created.
            typeof this.props.initialAlerts !== 'undefined' && Array.isArray(this.props.initialAlerts)
        ){
            alerts = this.props.initialAlerts;
        }
        return { 
            'alerts' : alerts,
            'isMounted' : false,
            'dismissing' : []
        }; 
    },

    componentWillMount : function(){
        var stateObj = {};

        // Only one of these meant to be created in app, so can import and queue to from anywhere w/o refs.
        if (Alerts.instance && Array.isArray(Alerts.instance.state.alerts) && Alerts.instance.state.alerts.length > 0){
            stateObj.alerts = this.state.alerts.concat(Alerts.instance.state.alerts);
        }
        Alerts.instance = this;
        
        this.setState(stateObj);
    },

    componentDidMount : function(){
        var stateObj = { 'isMounted' : true };
        
        if (Alerts.preMountQueue.length > 0 || Alerts.preMountDeQueue.length > 0) { 
            stateObj.alerts = _.difference(this.state.alerts.concat(Alerts.preMountQueue), Alerts.preMountDeQueue);
            Alerts.preMountQueue = [];
            Alerts.preMountDeQueue = [];
        }
        this.setState(stateObj);
    },

    componentWillUnmount: function(){
        this.setState({ 'isMounted' : false });
    },

    queue : function(alert, callback){
        if (typeof this.state.isMounted !== 'boolean' || !this.state.isMounted) {
            Alerts.preMountQueue.push(alert);
            if (typeof callback === 'function') callback();
            return;
        }
        var alerts = _.clone(this.state.alerts);
        alerts.push(alert);
        setTimeout(() => this.setState({ 'alerts' : alerts }, typeof callback === 'function' ? callback() : null), 0);
    },

    deQueue : function(alert, callback){
        if (typeof this.state.isMounted !== 'boolean' || !this.state.isMounted) {
            //Alerts.preMountQueue = _.without(Alerts.preMountQueue, alert);
            Alerts.preMountDeQueue.push(alert);
            if (typeof callback === 'function') callback();
            return;
        }
        var alertIndex = _.findIndex(this.state.alerts, alert);
        if (alertIndex > -1){
            var alerts = _.clone(this.state.alerts);
            alerts.splice(alertIndex, 1);
            console.log(alerts, this.state.alerts, alert);
            this.setState({ 'alerts' : alerts }, typeof callback === 'function' ? callback() : null);
        } else {
            if (typeof callback === 'function') callback();
        }
    },

    render : function(){
        if (this.state.alerts.length === 0) return null;
        
        function dismiss(index){
            var alerts = _.clone(this.state.alerts);
            var currentAlert = alerts.splice(index, 1)[0];
            var dismissing = _.clone(this.state.dismissing);
            if (_.findIndex(dismissing, currentAlert) === -1) dismissing.push(currentAlert);
            this.setState({ 'dismissing' : dismissing });
        };

        function finishDismiss(index){
            var alerts = _.clone(this.state.alerts);
            var currentAlert = alerts.splice(index, 1)[0];
            this.setState({ 'alerts' : alerts, 'dismissing' : _.without(this.state.dismissing, currentAlert) });
        }

        return (
            <div className="alerts">
            { 
                this.state.alerts.map(function(alert,i){
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
