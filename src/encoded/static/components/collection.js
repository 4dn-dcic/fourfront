'use strict';

var React = require('react');
var Search = require('./browse/SearchView').default;

/**
 * The primary Collection view, renders the Search component.
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
