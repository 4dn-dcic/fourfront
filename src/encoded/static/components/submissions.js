'use strict';
var React = require('react');
var globals = require('./globals');
var _ = require('underscore');
var { ajax, console, object, isServerSide } = require('./util');

/*
*/
var Submissions = module.exports = React.createClass({

    render: function(){
        return(
            <div>
                <h1 className="page-title">Your submissions</h1>
                    <div className="flexible-description-box item-page-heading">
                        <p className="text-larger">
                            Your submissions to 4DN appear here.
                        </p>
                    </div>
            </div>
        );
    }
});

globals.content_views.register(Submissions, 'Submissions');
