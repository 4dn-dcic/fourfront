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
export default class Collection extends React.Component {
    render () {
        return (
            <div>
                <Search {...this.props} />
            </div>
        );
    }
}
