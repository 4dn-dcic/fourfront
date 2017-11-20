'use strict';

import React from 'react';
import { panel_views, itemClass, content_views } from './../globals';
import { Button } from 'react-bootstrap';
import _ from 'underscore';
import { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow, Publications, AttributionTabView } from './components';
import { console, object, DateUtility, Filters, layout, Schemas } from './../util';

/**
 * This Component renders out the default Item page view for Item objects/contexts which do not have a more specific
 * Item page template associated with them.
 *
 * @module {Component} item-pages/DefaultItemView
 */


/**
 * The ItemBaseView class extends React.Component to provide some helper functions to be used from an Item View page.
 * Notably, a componentDidMount and this.state is created, where upon mounting, details of submitter, lab, and award are AJAXed in.
 * These can then be used from your Item view render method via this.state.details_submitted_by or this.props.context.submitted_by (if not fetched), etc.
 * 
 * Alternatively, a this.renderAttributionColumn function is available to render out a Bootstrap column (provide own className containing col sizes) containing all 3 attributions.
 * 
 * this.getDetailAndAuditsTabs() function is also available to get the common tabs and details tabs.
 * 
 * @export
 * @class ItemBaseView
 * @extends {React.Component}
 */
export class ItemBaseView extends React.Component {

    constructor(props){
        super(props);
        //this.componentDidMount = this.componentDidMount.bind(this);
        this.getCommonTabs = this.getCommonTabs.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        this.itemHeader = this.itemHeader.bind(this);
        this.state = {};
    }

    getCommonTabs(){
        return [
            ItemDetailList.getTabObject(this.props.context, this.props.schemas),
            AttributionTabView.getTabObject(this.props.context),
            AuditTabView.getTabObject(this.props.context)
        ];
    }
    
    itemClassName(){
        return itemClass(this.props.context, 'view-detail item-page-container');
    }

    getTabViewContents(){
        return this.getCommonTabs();
    }

    itemHeader(){
        return (
            <ItemHeader.Wrapper context={this.props.context} className="exp-set-header-area" href={this.props.href} schemas={this.props.schemas}>
                <ItemHeader.TopRow />
                <ItemHeader.MiddleRow />
                <ItemHeader.BottomRow />
            </ItemHeader.Wrapper>
        );
    }

    tabbedView(){
        return <TabbedView contents={this.getTabViewContents} />;
    }

    render() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;

        return (
            <div className={this.itemClassName()}>

                { this.itemHeader() }

                <Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.produced_in_pub} />

                <div className="row">

                    <div className="col-xs-12 col-md-12 tab-view-container" ref="tabViewContainer">

                        <layout.WindowResizeUpdateTrigger>
                            { this.tabbedView() }
                        </layout.WindowResizeUpdateTrigger>

                    </div>

                </div>

                <br/>

                {/*<ItemFooterRow context={context} schemas={schemas} />*/}

            </div>
        );
    }

}

/**
 * @alias module:item-pages/DefaultItemView
 */
export default class DefaultItemView extends ItemBaseView {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }
    /*
    topRightHeaderSection(){
        var r = [];
        // TODO: EDIT ACTIONS
        return r;
    }
    */
    /* Not even needed.
    render() {
        return super.render();
    }
    */

}

content_views.register(DefaultItemView, 'Item');



/** Helper Components */
export class OverViewBodyItem extends React.Component {

    static titleRenderPresets = {
        'biosample_treatments' : function(field, treatment){
            if (!treatment || !treatment.display_title || !object.atIdFromObject(treatment)){
                return 'None';
            }
            return <div key={object.atIdFromObject(treatment)} >{ object.itemUtil.generateLink(treatment, true) }<div>({ treatment.treatment_type })</div></div>;
        },
        'local_date_time' : function(field, timestamp){ return timestamp ? <DateUtility.LocalizedTime timestamp={timestamp} formatType="date-time-md" /> : 'None'; },
        'local_date' : function(field, timestamp){ return timestamp ? <DateUtility.LocalizedTime timestamp={timestamp} formatType="date-md" /> : 'None'; },
        'embedded_item_with_attachment' : function(field, item, allowJX = true, includeDescriptionTips = true, index = null){
            if (!item || !object.itemUtil.atId(item)){
                return 'None';
            }
            var itemTitle = object.itemUtil.getTitleStringFromContext(item);
            var linkToProtocolItem = object.itemUtil.atId(item);

            var viewAttachmentButton = null;
            if (item.attachment && item.attachment.href && typeof item.attachment.href === 'string'){
                var fullProtocolDocumentHref = linkToProtocolItem + item.attachment.href;
                viewAttachmentButton = (
                    <Button bsSize="small" href={fullProtocolDocumentHref} target="_blank" className="text-400 text-ellipsis-container btn-block">
                        View File &nbsp;<i className="icon icon-fw icon-external-link"/>
                    </Button>
                );
            }

            var linkToItem = object.itemUtil.generateLink(item, true);
            var isInArray = typeof index === 'number';
            
            return (
                <div className="embedded-item-with-attachment row" key={linkToProtocolItem}>
                    <div className={"col-xs-12 col-sm-7 col-lg-8 link-to-item-col" + (isInArray ? ' in-array' : '')} data-array-index={index}>{ isInArray ? <span>{ index + 1 }. </span> : null}{ linkToItem }</div>
                    <div className="col-xs-8 col-sm-5 col-lg-4 pull-right view-attachment-button-col">{ viewAttachmentButton }</div>
                </div>
            );
        }
    }

    /** If we have a list, wrap each in a <li> and calculate value, else return items param as it was passed in. */
    static createList(items, property, titleRenderFxn, addDescriptionTipForLinkTos, listItemElement, listItemElementProps){
        if (Array.isArray(items) && items.length > 0 && items[0].display_title && object.atIdFromObject(items[0])){
            items = _.map(_.uniq(items, false, function(b){ return object.atIdFromObject(b); }), function(b,i){
                if (items.length > 1){
                    return React.createElement(listItemElement, _.extend({ 'key' : object.atIdFromObject(b) || i }, listItemElementProps || {}), titleRenderFxn(property, b, true, addDescriptionTipForLinkTos, i) );
                }
                return titleRenderFxn(property, b, true, addDescriptionTipForLinkTos);
            });
        } else if (Array.isArray(items) && items.length > 1){
            items = _.map(items, function(b,i){
                return React.createElement(listItemElement, _.extend({ 'key' : i }, listItemElementProps || {}), titleRenderFxn(property, b, true, addDescriptionTipForLinkTos, i) );
            });
        } else if (Array.isArray(items) && items.length === 1){
            items = titleRenderFxn(property, items[0], true, addDescriptionTipForLinkTos);
        } else if (Array.isArray(items) && items.length === 0){
            return null;
        } else if (!Array.isArray(items)){
            return titleRenderFxn(property, items, true, addDescriptionTipForLinkTos);
        }
        return items;
    }

    static defaultProps = {
        'titleRenderFxn' : function(field, value, jsxAllowed = true, addDescriptionTip = true, index = null ){ return Schemas.Term.toName(field, value, jsxAllowed, addDescriptionTip); },
        'hideIfNoValue' : false,
        'wrapInColumn' : false,
        'addDescriptionTipForLinkTos' : true,
        'listWrapperElement' : 'ol',
        'listWrapperElementProps' : null,
        'listItemElement' : 'li',
        'listItemElementProps' : null
    }

    render(){
        var { result, property, fallbackValue, fallbackTitle, titleRenderFxn, addDescriptionTipForLinkTos, listWrapperElement, listWrapperElementProps, listItemElement, listItemElementProps } = this.props;
        
        function fallbackify(val){
            return val || fallbackValue || 'None';
        }

        listItemElementProps = (listItemElementProps && _.clone(listItemElementProps)) || {};
        listWrapperElementProps = (listWrapperElementProps && _.clone(listWrapperElementProps)) || {};
        listItemElementProps.className = (listItemElementProps.className || '') + ' overview-list-element';
        listWrapperElementProps.className = (listWrapperElementProps.className || '') + ' overview-list-elements-container';

        if (titleRenderFxn === OverViewBodyItem.titleRenderPresets.embedded_item_with_attachment){
            listItemElement = 'div';
            listWrapperElement = 'div';
        }

        var resultPropertyValue = OverViewBodyItem.createList(object.getNestedProperty(result, property), property, titleRenderFxn, addDescriptionTipForLinkTos, listItemElement, listItemElementProps);

        if (this.props.hideIfNoValue && (!resultPropertyValue || (Array.isArray(resultPropertyValue) && resultPropertyValue.length === 0))){
            return null;
        }

        var innerBlockReturned = null;

        if (Array.isArray(resultPropertyValue)){
            innerBlockReturned = (
                <div className="inner" key="inner">
                    <object.TooltipInfoIconContainerAuto
                        {..._.pick(this.props, 'result', 'property', 'tips', 'schemas')}
                        fallbackTitle={fallbackTitle + (resultPropertyValue && resultPropertyValue.length > 1 ? 's' : '')}
                        elementType="h5"
                    />
                    { resultPropertyValue ? ( resultPropertyValue.length > 1 ?
                        React.createElement(listWrapperElement, listWrapperElementProps || null, fallbackify(resultPropertyValue))
                            : fallbackify(resultPropertyValue) )
                                : fallbackify(null)
                    }
                </div>
            );
        } else {
            innerBlockReturned = (
                <div className="inner" key="inner">
                    <object.TooltipInfoIconContainerAuto {..._.pick(this.props, 'result', 'property', 'tips', 'fallbackTitle', 'schemas')} elementType="h5" />
                    <div key="single-value">
                        { fallbackify(resultPropertyValue) }
                    </div>
                </div>
            );
        }

        if (this.props.wrapInColumn) return <div className="col-xs-6 col-md-4" key="outer">{ innerBlockReturned }</div>;
        else return innerBlockReturned;

    }
}

