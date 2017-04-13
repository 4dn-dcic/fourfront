'use strict';
var React = require('react');
var globals = require('./../globals');
var Panel = require('react-bootstrap').Panel;
var Table = require('./../collection').Table;
var { AuditIndicators, AuditDetail, AuditMixin } = require('./../audit');
var { console, object, Filters } = require('./../util');
var url = require('url');


export default class Item extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    //getChildContext     : AuditMixin.getChildContext,
    //getInitialState     : AuditMixin.getInitialState,
    //auditStateToggle    : AuditMixin.auditStateToggle,
    //childContextTypes   : AuditMixin.childContextTypes,

    render() {
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
};

Item.contextTypes = {
    schemas: React.PropTypes.object
}

globals.content_views.register(Item, 'Item');


export class Fallback extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
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
};

Fallback.contextTypes = {
    location_href: React.PropTypes.string
}

// Use this view as a fallback for anything we haven't registered
globals.content_views.fallback = function () {
    return Fallback;
};


// **** Deprecated when fetch was removed.

//export class FetchedRelatedItems extends React.Component {
//
//    constructor(props){
//        super(props);
//        this.render = this.render.bind(this);
//    }
//
//    render() {
//        var {Component, context, title, url, props} = this.props;
//        if (context === undefined) return null;
//        var items = context['@graph'];
//        if (!items.length) return null;
//
//        return (
//            <Component {...props} title={title} context={context} total={context.total} items={items} url={url} showControls={false} />
//        );
//    }
//
//};
//
//FetchedRelatedItems.defaultProps = {
//    'Component' : Table
//}
//
//
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


/************************************/
/**** Utility & Helper Functions ****/
/************************************/


/**
 * Function to determine title for each Item object.
 * 
 * @export
 * @param {Object} props - Object containing props commonly supplied to Item page. At minimum, must have a 'context' property.
 * @returns {string} Title string to use.
 */
export function title(props) {
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

// Also use this 'title' function as a fallback for anything we haven't registered
globals.listing_titles.fallback = function () {
    return title;
};

/**
 * Get Item title string from a context object (JSON representation of Item).
 * 
 * @memberof module:item-pages/components.ItemPageTitle
 * @public
 * @export
 * @param {Object} context - JSON representation of an Item object.
 * @returns {string} The title.
 */
export function getTitleStringFromContext(context){
    return title({'context' : context});
}

/**
 * Determine whether the title which is displayed is an accession or not.
 * Use for determining whether to include accession in ItemHeader.TopRow.
 * 
 * @memberof module:item-pages/components.ItemPageTitle
 * @export
 * @public
 * @param {Object} context - JSON representation of an Item object.
 * @param {string} [displayTitle] - Display title of Item object. Gets it from context if not provided.
 * @returns {string} The title.
 */
export function isDisplayTitleAccession(context, displayTitle = null){
    if (!displayTitle) displayTitle = getTitleStringFromContext(context);
    if (context.accession && context.accession === displayTitle) return true;
    return false;
}

export function getBaseItemType(context){
    var types = context['@type'];
    if (!Array.isArray(types) || types.length === 0) return "Unknown";
    var i = 0;
    while (i < types.length){
        if (types[i + 1] === 'Item'){
            return types[i]; // Last type before 'Item'.
        }
        i++;
    }
    return types[i-1]; // Fallback.
}


export function getBaseItemTypeTitle(context, schemas = null){
    var baseType = getBaseItemType(context);

    // Grab schemas from Filters if we don't have them but they've been cached into there from App.
    schemas = schemas || (Filters.getSchemas && Filters.getSchemas());

    if (schemas && schemas[baseType] && schemas[baseType].title){
        return schemas[baseType].title;
    }

    // Correct baseType to title if not in schemas.
    switch (baseType){
        case 'ExperimentSet':
            return 'Experiment Set';
        default:
            return baseType;
    }
}


