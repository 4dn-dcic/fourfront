'use strict';

import React from 'react';
import { panel_views, itemClass, content_views } from './../globals';
import { Button } from 'react-bootstrap';
import _ from 'underscore';
import { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow, Publications, AttributionTabView } from './components';
import { console, object, DateUtility, Filters, layout, Schemas, fileUtil } from './../util';

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

    /** Preset Functions to render various Items or property types. Feed in via titleRenderFxn prop. */
    static titleRenderPresets = {
        'default' : function(field, value, jsxAllowed = true, addDescriptionTip = true, index = null, wrapperElementType = 'li' ){
            var calcdName = Schemas.Term.toName(field, value, jsxAllowed, addDescriptionTip);
            if (wrapperElementType === 'div' && typeof index === 'number') {
                return [((index + 1) + '. '), calcdName];
            }
            return calcdName;
        },
        'biosample_treatments' : function(field, treatment, allowJX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li' ){
            if (!treatment || !treatment.display_title || !object.atIdFromObject(treatment)){
                return null;
            }
            return (
                <div key={object.atIdFromObject(treatment)} >
                    { wrapperElementType === 'div' && typeof index === 'number' ? (index + 1) + '. ' : null }
                    { object.itemUtil.generateLink(treatment, true) }
                    <div>({ treatment.treatment_type })</div>
                </div>
            );
        },
        'local_date_time' : function(field, timestamp){
            return timestamp ? <DateUtility.LocalizedTime timestamp={timestamp} formatType="date-time-md" /> : null;
        },
        'local_date' : function(field, timestamp){
            return timestamp ? <DateUtility.LocalizedTime timestamp={timestamp} formatType="date-md" /> : null;
        },
        'embedded_item_with_attachment' : function(field, item, allowJX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li' ){
            if (!item || !object.itemUtil.atId(item)){
                return null;
            }
            var itemTitle = object.itemUtil.getTitleStringFromContext(item);
            var linkToProtocolItem = object.itemUtil.atId(item);

            var viewAttachmentButton = null;
            var haveAttachment = (item.attachment && item.attachment.href && typeof item.attachment.href === 'string');
            if (haveAttachment){
                var fullProtocolDocumentHref = linkToProtocolItem + item.attachment.href;
                viewAttachmentButton = (
                    <Button bsSize="small" bsStyle="primary" href={fullProtocolDocumentHref} target="_blank" className="text-400 text-ellipsis-container btn-block">
                        View File &nbsp;<i className="icon icon-fw icon-external-link"/>
                    </Button>
                );
                viewAttachmentButton = (
                    <fileUtil.ViewFileButton title="File" bsSize="small" mimeType={(haveAttachment && item.attachment.type) || null} filename={itemTitle || null} href={fullProtocolDocumentHref} disabled={!haveAttachment} className={'text-ellipsis-container btn-block'} />
                );
            }

            var linkToItem = object.itemUtil.generateLink(item, true);
            var isInArray = typeof index === 'number';
            
            return (
                <div className={"embedded-item-with-attachment" + (isInArray ? ' in-array' : '')} key={linkToProtocolItem}>
                    <div className="row">
                        <div className={"col-xs-12 col-sm-6 col-md-6 link-to-item-col" + (isInArray ? ' in-array' : '')} data-array-index={index}>
                            <div className="inner">
                                { isInArray ? <span>{ index + 1 }. </span> : null}{ linkToItem }
                            </div>
                        </div>
                        <div className="col-xs-12 col-sm-6 col-md-6 pull-right view-attachment-button-col">{ viewAttachmentButton }</div>
                    </div>
                </div>
            );
        },
        'url_string' : function(field, value, allowJSX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li'){
            if (typeof value !== 'string') return null;
            return <a href={value} style={{ 'overflowWrap' : 'break-word' }}>{value}</a>;
        }
    }

    /** If we have a list, wrap each in a <li> and calculate value, else return items param as it was passed in. */
    static createList(items, property, titleRenderFxn = OverViewBodyItem.titleRenderPresets.default, addDescriptionTipForLinkTos = true, listItemElement = 'li', listItemElementProps = null){
        // Item List
        if (Array.isArray(items) && items.length > 1 && items[0].display_title && object.atIdFromObject(items[0])){
            items = _.map(_.uniq(items, false, function(b){ return object.atIdFromObject(b); }), function(b,i){
                return React.createElement(listItemElement, _.extend({ 'key' : object.atIdFromObject(b) || i }, listItemElementProps || {}), titleRenderFxn(property, b, true, addDescriptionTipForLinkTos, i, listItemElement) );
            });
        } else if (Array.isArray(items) && items.length === 1 && items[0].display_title && object.atIdFromObject(items[0])) {
            return titleRenderFxn(property, items[0], true, addDescriptionTipForLinkTos, null, 'div');
        } else if (Array.isArray(items) && items.length > 1){
            items = _.map(items, function(b,i){
                return React.createElement(listItemElement, _.extend({ 'key' : i }, listItemElementProps || {}), titleRenderFxn(property, b, true, addDescriptionTipForLinkTos, i, listItemElement) );
            });
        } else if (Array.isArray(items) && items.length === 1){
            items = titleRenderFxn(property, items[0], true, addDescriptionTipForLinkTos, null, 'div');
        } else if (Array.isArray(items) && items.length === 0){
            return null;
        } else if (!Array.isArray(items)){
            return titleRenderFxn(property, items, true, addDescriptionTipForLinkTos, 'div');
        }
        return items;
    }

    static defaultProps = {
        'titleRenderFxn' : OverViewBodyItem.titleRenderPresets.default,
        'hideIfNoValue' : false,
        'wrapInColumn' : false,
        'addDescriptionTipForLinkTos' : true,
        'listWrapperElement' : 'ol',
        'listWrapperElementProps' : null,
        'listItemElement' : 'li',
        'listItemElementProps' : null,
        'columnExtraClassName' : null,
        'singleItemClassName' : null
    }

    /** Feeds params + props into static function */
    createList(valueForProperty, listItemElement, listItemElementProps){
        return OverViewBodyItem.createList(valueForProperty, this.props.property, this.props.titleRenderFxn, this.props.addDescriptionTipForLinkTos, listItemElement, listItemElementProps);
    }

    render(){
        var { 
            result, property, fallbackValue, fallbackTitle, titleRenderFxn, addDescriptionTipForLinkTos, propertyForLabel,
            listWrapperElement, listWrapperElementProps, listItemElement, listItemElementProps, wrapInColumn, columnExtraClassName, singleItemClassName
        } = this.props;
        
        function fallbackify(val){
            return val || fallbackValue || 'None';
        }

        listItemElementProps = (listItemElementProps && _.clone(listItemElementProps)) || {};
        listWrapperElementProps = (listWrapperElementProps && _.clone(listWrapperElementProps)) || {};
        listItemElementProps.className = (listItemElementProps.className || '') + ' overview-list-element';
        listWrapperElementProps.className = (listWrapperElementProps.className || '') + ' overview-list-elements-container embedded-item-with-attachment-container';

        if (titleRenderFxn === OverViewBodyItem.titleRenderPresets.embedded_item_with_attachment){
            listItemElement = 'div';
            listWrapperElement = 'div';
        }

        var resultPropertyValue = this.createList( object.getNestedProperty(result, property), listItemElement, listItemElementProps );

        if (this.props.hideIfNoValue && (!resultPropertyValue || (Array.isArray(resultPropertyValue) && resultPropertyValue.length === 0))){
            return null;
        }

        var innerBlockReturned = null;
        propertyForLabel = propertyForLabel || property;

        if (Array.isArray(resultPropertyValue)){
            innerBlockReturned = (
                <div className="inner" key="inner">
                    <object.TooltipInfoIconContainerAuto
                        {..._.pick(this.props, 'result', 'tips', 'schemas', 'fallbackTitle')}
                        property={propertyForLabel}
                        title={this.props.overrideTitle}
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
                    <object.TooltipInfoIconContainerAuto {..._.pick(this.props, 'result', 'tips', 'fallbackTitle', 'schemas')} elementType="h5" property={propertyForLabel} title={this.props.overrideTitle} />
                        <div key="single-value" className={"overview-single-element" + (singleItemClassName ? ' ' + singleItemClassName : '') + (!resultPropertyValue ? ' no-value' : '')}>
                            { fallbackify(resultPropertyValue) }
                        </div>
                </div>
            );
        }

        if (wrapInColumn) return (
            <div className={(typeof wrapInColumn === 'string' ? wrapInColumn : "col-xs-6 col-md-4") + (columnExtraClassName ? ' ' + columnExtraClassName : '')} key="outer" children={innerBlockReturned} />
        );
        else return innerBlockReturned;

    }
}

