'use strict';

import React from 'react';
import createReactClass from 'create-react-class';
import * as globals from './../../globals';
import { ResultTableHandlersContainer } from './../../browse/SearchView';


function openLinksInNewWindow(e) {
    if (e.isDefaultPrevented()) return;

    // intercept links and open in new tab
    var target = e.target;
    while (target && (target.tagName.toLowerCase() != 'a')) {
        target = target.parentElement;
    }
    if (!target) return;

    e.preventDefault();
    window.open(target.getAttribute('href'), '_blank');
}

class SearchBlockEdit extends React.Component {

    componentDidMount(){
        // focus the first "Select" button in the search results
        var button = this.getDOMNode().querySelector('button.btn-primary');
        if (button) {
            button.focus();
        }
    }

    render(){
        return (
            <div className="well" style={{ 'maxHeight': 300, 'overflow': 'scroll', 'clear': 'both' }} onClick={openLinksInNewWindow}>
                <ResultTableHandlersContainer {...this.props} mode="picker" />
            </div>
        );
    }
}

/**
 * Code still seems usable. But not used anywhere.
 *
 * @deprecated
 */
export class ItemPreview extends React.PureComponent {
    render(){
        var context = this.props.data;
        if (typeof context === 'undefined') return null;
        var ViewForContext = globals.listing_views.lookup(context);
        return (
            <ul className="nav result-table" onClick={openLinksInNewWindow}>
                <ViewForContext context={context} key={context['@id']} />
            </ul>
        );
    }
}

