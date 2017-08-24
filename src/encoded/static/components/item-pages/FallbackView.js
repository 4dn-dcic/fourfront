'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import { content_views } from './../globals';
import { console, object, Filters } from './../util';
import { ItemPageTitle, ItemDetailList } from './components';

/**
 * Fallback content_view for pages which are not specifically 'Items.
 * Renders out JSON.
 * 
 * @export
 * @class Item
 * @extends {React.Component}
 */
export class Fallback extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        var context = this.props.context;
        var title = typeof context.title === "string" ? context.title : url.parse(this.props.href || this.context.location_href).path;
        return (
            <div className="view-item">
                {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                <ItemDetailList context={context} schemas={this.props.schemas} />
            </div>
        );
    }
}

Fallback.contextTypes = {
    location_href: PropTypes.string
};

// Use this view as a fallback for anything we haven't registered
content_views.fallback = function () {
    return Fallback;
};
