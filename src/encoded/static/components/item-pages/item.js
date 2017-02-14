'use strict';
var React = require('react');
var globals = require('./../globals');
var Panel = require('react-bootstrap').Panel;
var Table = require('./../collection').Table;
var { AuditIndicators, AuditDetail, AuditMixin } = require('./../audit');
var { console, object } = require('./../util');

var Fallback = module.exports.Fallback = React.createClass({
    contextTypes: {
        location_href: React.PropTypes.string
    },

    render: function() {
        var url = require('url');
        var context = this.props.context;
        var title = typeof context.title == "string" ? context.title : url.parse(this.context.location_href).path;
        return (
            <div className="view-item">
                <header className="row">
                    <div className="col-sm-12">
                        <h2>{title}</h2>
                    </div>
                </header>
                {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                <section className="view-detail panel">
                    <div className="container">
                        <pre>{JSON.stringify(context, null, 4)}</pre>
                    </div>
                </section>
            </div>
        );
    }
});

var Item = module.exports.Item = React.createClass({

    getChildContext     : AuditMixin.getChildContext,
    getInitialState     : AuditMixin.getInitialState,
    auditStateToggle    : AuditMixin.auditStateToggle,
    childContextTypes   : AuditMixin.childContextTypes,

    contextTypes: {
        schemas: React.PropTypes.object
    },

    render: function() {
        var context = this.props.context;
        var itemClass = globals.itemClass(context, 'view-item');
        var ContentPanel = globals.panel_views.lookup(context);
        // Make string of alternate accessions
        return (
            <div className={itemClass}>
                <AuditIndicators.Header context={context} />
                <AuditDetail context={context} key="biosample-audit" />
                <ContentPanel {...this.props} />
            </div>
        );
    }
});

globals.content_views.register(Item, 'Item');


// Also use this view as a fallback for anything we haven't registered
globals.content_views.fallback = function () {
    return Fallback;
};


var title = module.exports.title = function (props) {
    var context = props.context;
    return (
        context.display_title   ||
        context.title           ||
        context.name            ||
        context.download        ||
        context.accession       ||
        context.uuid            ||
        (typeof context['@id'] === 'string' ? context['@id'] :
        'No title found')
    );
};

globals.listing_titles.register(title, 'Item');


// Also use this view as a fallback for anything we haven't registered
globals.listing_titles.fallback = function () {
    return title;
};


var FetchedRelatedItems = React.createClass({
    getDefaultProps: function() {
        return {Component: Table};
    },

    render: function() {
        var {Component, context, title, url, props} = this.props;
        if (context === undefined) return null;
        var items = context['@graph'];
        if (!items.length) return null;

        return (
            <Component {...props} title={title} context={context} total={context.total} items={items} url={url} showControls={false} />
        );
    }

});

// **** Deprecated when fetch was removed.
//
// var RelatedItems = module.exports.RelatedItems = React.createClass({
//     getDefaultProps: function() {
//         return {limit: 5};
//     },
//
//     render: function() {
//         var url = this.props.url + '&status!=deleted&status!=revoked&status!=replaced';
//         var limited_url = url + '&limit=' + this.props.limit;
//         var unlimited_url = url + '&limit=all';
//         return (
//             <fetched.FetchedData>
//                 <fetched.Param name="context" url={limited_url} />
//                 <FetchedRelatedItems {...this.props} url={unlimited_url} />
//             </fetched.FetchedData>
//         );
//     },
// });
