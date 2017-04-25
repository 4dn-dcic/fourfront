'use strict';
var React = require('react');
var globals = require('./../globals');
var Panel = require('react-bootstrap').Panel;
var Table = require('./../collection').Table;
var { AuditIndicators, AuditDetail, AuditMixin } = require('./../audit');
var { console, object, Filters } = require('./../util');
var url = require('url');


/********************/
/**** Components ****/
/********************/

/**
 * Acts as a "controller". This is the 'content_view' for all 'Items'.
 * Looks up best panel_view to use for the detailed Item type and renders it with props passed down
 * from App.
 * 
 * @export
 * @class Item
 * @extends {React.Component}
 */
export default class Item extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        console.log(props);
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

//Item.contextTypes = {
//    schemas: React.PropTypes.object
//}

globals.content_views.register(Item, 'Item');



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
        ( typeof context['@id'] === 'string' ? context['@id'] : 
            null //: 'No title found'
        )
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

/**
 * Returns the leaf type from the Item's '@type' array.
 *
 * @export
 * @throws {Error} Throws error if no types array ('@type') or it is empty.
 * @param {Object} context - JSON representation of current Item.
 * @returns {string} Most specific type's name.
 */
export function getItemType(context){
    if (!Array.isArray(context['@type']) || context['@type'].length < 1){
        return null;
        //throw new Error("No @type on Item object (context).");
    }
    return context['@type'][0];
}

/**
 * Returns base Item type from Item's '@type' array. This is the type right before 'Item'.
 * 
 * @export
 * @param {Object} context - JSON representation of current Item.
 * @param {string[]} context['@type] - List of types for the Item. 
 * @returns 
 */
export function getBaseItemType(context){
    var types = context['@type'];
    if (!Array.isArray(types) || types.length === 0) return null;
    var i = 0;
    while (i < types.length){
        if (types[i + 1] === 'Item'){
            return types[i]; // Last type before 'Item'.
        }
        i++;
    }
    return types[i-1]; // Fallback.
}


/**
 * Returns schema for the specific type of Item we're on.
 *
 * @export
 * @param {string} itemType - The type for which to get schema.
 * @param {Object} [schemas] - Mapping of schemas, by type.
 * @returns {Object} Schema for itemType.
 */
export function getSchemaForItemType(itemType, schemas = null){
    if (typeof itemType !== 'string') return null;
    if (!schemas){
        schemas = (Filters.getSchemas && Filters.getSchemas()) || null;
    }
    if (!schemas) return null;
    return schemas[itemType] || null;
}

/**
 * Lookup the title for an Item type, given the entire schemas object.
 * 
 * @export
 * @param {string} atType - Item type.
 * @param {Object} [schemas=null] - Entire schemas object, e.g. as stored in App state.
 * @returns {string} Human-readable title.
 */
export function getTitleForType(atType, schemas = null){
    if (!atType) return null;

    // Grab schemas from Filters if we don't have them but they've been cached into there from App.
    schemas = schemas || (Filters.getSchemas && Filters.getSchemas());

    if (schemas && schemas[atType] && schemas[atType].title){
        return schemas[atType].title;
    }

    // Correct baseType to title if not in schemas.
    switch (atType){
        case 'ExperimentSet':
            return 'Experiment Set';
        default:
            return atType;
    }
}

/**
 * Get title for leaf Item type from Item's context + schemas.
 * 
 * @export
 * @param {Object} context - JSON representation of Item.
 * @param {Object} [schemas=null] - Schemas object passed down from App.
 * @returns {string} Human-readable Item detailed type title.
 */
export function getItemTypeTitle(context, schemas = null){
    return getTitleForType(getItemType(context), schemas);
}

/**
 * Get title for base Item type from Item's context + schemas.
 * 
 * @export
 * @param {Object} context - JSON representation of Item.
 * @param {Object} [schemas=null] - Schemas object passed down from App.
 * @returns {string} Human-readable Item base type title.
 */
export function getBaseItemTypeTitle(context, schemas = null){
    return getTitleForType(getBaseItemType(context), schemas);
}


