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
            return response;
        },
        error => {
            return null;
        });
    },

    render: function(){
        return(
            <div>
                <h1 className="page-title">Submission tracking</h1>
                    <div className="flexible-description-box item-page-heading">
                        <p className="text-larger">
                            View your 4DN submissions and track those you've subscribed to.
                        </p>
                    </div>
            </div>
        );
    }
});

globals.content_views.register(Submissions, 'Submissions');
