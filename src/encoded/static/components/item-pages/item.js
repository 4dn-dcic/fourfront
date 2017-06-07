'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Panel } from 'react-bootstrap';
import _ from 'underscore';
import url from 'url';
import * as globals from './../globals';
import { AuditIndicators, AuditDetail, AuditMixin } from './../audit';
import { console, object, Filters, Schemas } from './../util';
import AuditTabView from './components/AuditTabView';


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

    static propTypes = {
        schemas : PropTypes.any.isRequired,
        listActionsFor : PropTypes.func.isRequired,
        href : PropTypes.string.isRequired,
        session : PropTypes.bool.isRequired,
        expSetFilters : PropTypes.object.isRequired
    }

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
}

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
}

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
