'use strict';

var React = require('react');
var url = require('url');
var globals = require('./globals');
var StickyHeader = require('./StickyHeader');
var Search = require('./search').Search;

/**
 * The primary Collection view, renders the Search component.
 *
 * @member
 * @namespace
 * @type {Component}
 */
var Collection = module.exports.Collection = React.createClass({
    render: function () {
        return (
            <div>
                <Search {...this.props} />
            </div>
        );
    }
});
