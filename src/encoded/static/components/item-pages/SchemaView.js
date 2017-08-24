'use strict';

import React from 'react';
import url from 'url';
import PropTypes from 'prop-types';
import * as globals from './../globals';
import { ItemPageTitle, ItemDetailList } from './components';


export default class SchemaView extends React.Component {

    static keyTitleDescriptionMap = {
        '$schema' : {
            title : "Schema Used",
            description : "Type & draft of schema used."
        },
        'additionalProperties' : {
            title : "Additional Properties"
        },
        'facets' : {
            title : "Available Facets",
            description : "Facets by which items of this type may be sorted by."
        },
        'id' : {
            title : "ID"
        },
        'identifyingProperties' : {
            title : "Identifying Properties",
            description : "These must be unique."
        },
        'properties' : {
            title : "Properties",
            description : "Properties of this Item type."
        },
        'required' : {
            title : "Required Properties",
            description : "These may not be blank for an Item of this type."
        }
    }

    static propTypes = {
        'href' : PropTypes.string.isRequired,
        'schemas' : PropTypes.any.isRequired
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        var context = this.props.context;
        var itemClass = globals.itemClass(context);
        var title = typeof context.title == "string" ? context.title : url.parse(this.props.href).path;
        return (
            <div className={"view-item " + itemClass}>
                {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                <ItemDetailList
                    context={context}
                    schemas={this.props.schemas}
                    keyTitleDescriptionMap={SchemaView.keyTitleDescriptionMap}
                    excludedKeys={['mixinProperties', 'title', 'type', 'description']}
                    stickyKeys={['properties', 'required', 'identifyingProperties', 'facets']}
                />
            </div>
        );
    }
}

globals.content_views.register(SchemaView, 'JSONSchema');

/*
Might need for later
var Markdown = module.exports.Markdown = React.createClass({
    render: function() {
        var marked = require('marked');
        var html = marked(this.props.source, {sanitize: true});
        return <div dangerouslySetInnerHTML={{__html: html}} />;
    }
});


var ChangeLog = module.exports.ChangeLog = React.createClass({
    render: function() {
        return (
            <section className="view-detail panel">
                <div className="container">
                    <Markdown source={this.props.source} />
                </div>
            </section>
        );
    }
});
*/
