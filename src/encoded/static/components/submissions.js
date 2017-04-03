'use strict';
var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide } = require('./util');

/*
*/
var Submissions = module.exports = React.createClass({

    contextTypes: {
        fetch: React.PropTypes.func,
        contentTypeIsJSON: React.PropTypes.func,
    },

    getInitialState: function(){
        return({'subscriptions': null});
    },

    componentDidMount: function(){
        // make async call to get user subscriptions
        this.getUserInfo();
    },

    getUserInfo: function(){
        this.context.fetch('/me?frame=embedded', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!this.context.contentTypeIsJSON(response) || !response['subscriptions']) throw response;
            this.setState({'subscriptions': response['subscriptions']});
        },
        error => {
            this.setState({'subscriptions': null});
        });
    },

    generateSubscription: function(scrip){
        return(
            <SubscriptionEntry url={scrip.url} title={scrip.url} />
        );
    },

    render: function(){
        var subscrip_list;
        if(this.state.subscriptions){
            subscrip_list = this.state.subscriptions.map((scrip) => this.generateSubscription(scrip))
        }
        return(
            <div>
                <h1 className="page-title">Submission tracking</h1>
                <div className="flexible-description-box item-page-heading">
                    <p className="text-larger">
                        View your 4DN submissions and track those you've subscribed to.
                    </p>
                </div>
                {subscrip_list}
            </div>
        );
    }
});

var SubscriptionEntry = React.createClass({

    contextTypes: {
        fetch: React.PropTypes.func,
        contentTypeIsJSON: React.PropTypes.func,
    },

    getInitialState: function(){
        return({'data': null});
    },

    componentDidMount: function(){
        // make async call to get first subscription data
        this.loadSubscriptionData('/search/?type=Item&' + this.props.url);
    },

    loadSubscriptionData: function(url){
        this.context.fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!this.context.contentTypeIsJSON(response) || !response['@graph']) throw response;
            this.setState({'data': response});
        },
        error => {
            this.setState({'data': null});
        });
    },

    render: function(){
        return(
            <div>
                {JSON.stringify(this.state.data)}
            </div>
        );
    }

});

globals.content_views.register(Submissions, 'Submissions');
