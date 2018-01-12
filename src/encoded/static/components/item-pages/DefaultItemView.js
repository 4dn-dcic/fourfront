'use strict';

import React from 'react';
import { panel_views, itemClass, content_views } from './../globals';
import { Button, Collapse } from 'react-bootstrap';
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
        this.getCommonTabs = this.getCommonTabs.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        this.itemHeader = this.itemHeader.bind(this);
        this.state = {};
    }

    getCommonTabs(context = this.props.context){
        var returnArr = [];
        if (context.lab || context.submitted_by || context.publications_of_set || context.produced_in_pub) returnArr.push(AttributionTabView.getTabObject(context));
        returnArr.push(ItemDetailList.getTabObject(context, this.props.schemas));
        returnArr.push(AuditTabView.getTabObject(context));
        return returnArr;
    }

    getDefaultTabs(context = this.props.context){
        var returnArr = [];
        returnArr.push(ItemDetailList.getTabObject(context, this.props.schemas));
        if (context.lab || context.submitted_by || context.publications_of_set || context.produced_in_pub) returnArr.push(AttributionTabView.getTabObject(context));
        returnArr.push(AuditTabView.getTabObject(context));
        return returnArr;
    }
    
    itemClassName(){
        return itemClass(this.props.context, 'view-detail item-page-container');
    }

    getTabViewContents(){
        return this.getDefaultTabs();
    }

    /**
     * @returns {{ 'title' : string, 'description' : string }} Object with 'title' and 'description' (used for tooltip) to show detailed or base type info at top left of page, under title.
     */
    typeInfo(){
        return null;
    }

    itemHeader(){
        return (
            <ItemHeader.Wrapper context={this.props.context} className="exp-set-header-area" href={this.props.href} schemas={this.props.schemas}>
                <ItemHeader.TopRow typeInfo={this.typeInfo()} />
                <ItemHeader.MiddleRow />
                <ItemHeader.BottomRow />
            </ItemHeader.Wrapper>
        );
    }

    itemMidSection(){
        return <Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.produced_in_pub} />;
    }

    tabbedView(){
        return <TabbedView contents={this.getTabViewContents} />;
    }

    itemFooter(){
        return null; /*<ItemFooterRow context={context} schemas={schemas} />*/
    }

    render() {
        return (
            <div className={this.itemClassName()}>

                { this.itemHeader() }
                { this.itemMidSection() }

                <div className="row">
                    <div className="col-xs-12 col-md-12 tab-view-container" ref="tabViewContainer">
                        <layout.WindowResizeUpdateTrigger children={this.tabbedView()} />
                    </div>
                </div>
                <br/>
                { this.itemFooter() }
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

export class OverviewHeadingContainer extends React.Component {

    static defaultProps = {
        'className'     : 'with-background mb-3 mt-1',
        'defaultOpen'   : true,
        'headingTitleElement' : 'h4',
        'headingTitle'  : 'Properties'
    }

    constructor(props){
        super(props);
        this.toggle = _.throttle(function(){ this.setState({ 'open' : !this.state.open }); }.bind(this), 500);
        this.state = { 'open' : props.defaultOpen };
    }

    renderTitle(){
        return <span><i className={"expand-icon icon icon-" + (this.state.open ? 'minus' : 'plus')} data-tip={this.state.open ? 'Collapse' : 'Expand'}/>{ this.props.headingTitle } <i className={"icon icon-angle-right" + (this.state.open ? ' icon-rotate-90' : '')}/></span>;
    }

    render(){
        return (
            <div className={"overview-blocks-header" + (this.state.open ? ' is-open' : ' is-closed') + (typeof this.props.className === 'string' ? ' ' + this.props.className : '')}>
                { this.props.headingTitleElement ? React.createElement(this.props.headingTitleElement, { 'className' : 'tab-section-title clickable with-accent', 'onClick' : this.toggle }, this.renderTitle()) : null }
                <Collapse in={this.state.open}>
                    <div className="inner">
                        <hr className="tab-section-title-horiz-divider"/>
                        <div className="row overview-blocks">{ this.props.children }</div>
                    </div>
                </Collapse>
            </div>
        );
    }
}


export class EmbeddedItemWithAttachment extends React.Component {

    constructor(props){
        super(props);
        this.filename = this.filename.bind(this);
    }

    filename(){
        return (this.props.item && this.props.item.attachment && this.props.item.attachment.download) || object.itemUtil.getTitleStringFromContext(this.props.item) || null;
    }
    
    render(){
        var { item, index } = this.props,
            linkToItem = object.itemUtil.atId(item),
            isInArray = typeof index === 'number';

        if (!item || !linkToItem) return null;

        var itemTitle = object.itemUtil.getTitleStringFromContext(item);

        var viewAttachmentButton = null;
        var haveAttachment = (item.attachment && item.attachment.href && typeof item.attachment.href === 'string');
        if (haveAttachment){
            viewAttachmentButton = (
                <fileUtil.ViewFileButton title="File" bsSize="small" mimeType={item.attachment.type || null} filename={this.filename()} href={linkToItem + item.attachment.href} disabled={!haveAttachment} className='text-ellipsis-container btn-block' />
            );
        }
        
        return (
            <div className={"embedded-item-with-attachment" + (isInArray ? ' in-array' : '')} key={linkToItem}>
                <div className="row">
                    <div className={"col-xs-12 col-sm-6 col-md-6 link-to-item-col" + (isInArray ? ' in-array' : '')} data-array-index={index}>
                        <div className="inner">
                            { isInArray ? <span>{ index + 1 }. </span> : null}{ object.itemUtil.generateLink(item, true) }
                        </div>
                    </div>
                    <div className="col-xs-12 col-sm-6 col-md-6 pull-right view-attachment-button-col">{ viewAttachmentButton }</div>
                </div>
            </div>
        );
    }
}

export class EmbeddedItemWithImageAttachment extends EmbeddedItemWithAttachment {

    isAttachmentImage(filename = null){
        return fileUtil.isFilenameAnImage(this.filename());
    }

    caption(){
        var item = this.props.item;
        var captionText = item.caption || item.description || (item.attachment && item.attachment.caption) || this.filename();
        //var size = item.attachment && item.attachment.size
        if (captionText){
            return <div className="caption">{ captionText }</div>;
        }
        return null;
    }

    render(){
        var { item, index } = this.props,
            linkToItem = object.itemUtil.atId(item),
            isInArray = typeof index === 'number';

        if (!item || !linkToItem) return null;

        var haveAttachment = (item.attachment && item.attachment.href && typeof item.attachment.href === 'string');
        var isAttachmentImage = this.isAttachmentImage();

        if (!haveAttachment || !isAttachmentImage) return <EmbeddedItemWithAttachment {...this.props} />;

        var imageElem = <a href={linkToItem} className="image-wrapper"><img className="embedded-item-image" src={linkToItem + item.attachment.href} /></a>;
        var captionText = (item.attachment && item.attachment.caption) || this.filename();
        
        return (
            <div className={"embedded-item-with-attachment is-image" + (isInArray ? ' in-array' : '')} key={linkToItem}>
                <div className="inner">{ imageElem }{ this.caption() }</div>
            </div>
        );
    }
}


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
            return <EmbeddedItemWithAttachment {...{ item, index }} />;
        },
        'embedded_item_with_image_attachment' : function(field, item, allowJX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li' ){
            return <EmbeddedItemWithImageAttachment {...{ item, index }} />;
        },
        'url_string' : function(field, value, allowJSX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li'){
            if (typeof value !== 'string') return null;
            return <a href={value} style={{ 'overflowWrap' : 'break-word' }}>{value}</a>;
        }
    }

    /** If we have a list, wrap each in a <li> and calculate value, else return items param as it was passed in. */
    static createList(items, property, titleRenderFxn = OverViewBodyItem.titleRenderPresets.default, addDescriptionTipForLinkTos = true, listItemElement = 'li', listItemElementProps = null){

        // Preprocess / uniqify:
        if (Array.isArray(items)) {
            items = _.filter(_.flatten(items), function(item){ return item !== null && typeof item !== 'undefined'; });
        }
        if (Array.isArray(items) && _.every(items, function(item){ return typeof item === 'string' || typeof item === 'number'; } )) {
            items = _.uniq(items);
        } else if (Array.isArray(items) && items.length > 1 && items[0] && items[0].display_title && object.atIdFromObject(items[0])) {
            items = _.uniq(items, false, function(b){ return object.atIdFromObject(b); });
        }

        // Null value
        if (items === null || typeof items === 'undefined') {
            return null;
        } else if (Array.isArray(items) && items.length === 0){
            return null;
        } else if (Array.isArray(items) && _.every(items, function(item){ return item === null || typeof item === 'undefined'; })){
            return null;
        }

        // Item List
        if (Array.isArray(items) && items.length > 1 && items[0].display_title && object.atIdFromObject(items[0])){
            items = _.map(items, function(b,i){
                return React.createElement(listItemElement, _.extend({ 'key' : object.atIdFromObject(b) || i }, listItemElementProps || {}), titleRenderFxn(property, b, true, addDescriptionTipForLinkTos, i, listItemElement) );
            });
        } else if (Array.isArray(items) && items.length === 1 && items[0].display_title && object.atIdFromObject(items[0])) {
            return titleRenderFxn(property, items[0], true, addDescriptionTipForLinkTos, null, 'div');
        } else if (Array.isArray(items) && items.length > 1){
            items = _.map(items, function(b,i){
                return React.createElement(  listItemElement  ,  _.extend({ 'key' : i }, listItemElementProps || {})  ,  titleRenderFxn(property, b, true, addDescriptionTipForLinkTos, i, listItemElement)  );
            });
        } else if (Array.isArray(items) && items.length === 1){
            items = titleRenderFxn(property, items[0], true, addDescriptionTipForLinkTos, null, 'div');
        } else if (!Array.isArray(items)){
            return titleRenderFxn(property, items, true, addDescriptionTipForLinkTos, 'div');
        }
        return items;
    }

    static defaultProps = {
        'titleRenderFxn'                : OverViewBodyItem.titleRenderPresets.default,
        'hideIfNoValue'                 : false,
        'wrapInColumn'                  : false,
        'addDescriptionTipForLinkTos'   : true,
        'listWrapperElement'            : 'ol',
        'listWrapperElementProps'       : null,
        'listItemElement'               : 'li',
        'listItemElementProps'          : null,
        'columnExtraClassName'          : null,
        'singleItemClassName'           : null,
        'fallbackTitle'                 : null,
        'propertyForLabel'              : null
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

        if (wrapInColumn){
            var outerClassName = (columnExtraClassName ? columnExtraClassName : '');
            if (typeof wrapInColumn === 'string'){
                // MAYBE TODO-REMOVE / ANTI-PATTERN
                if (wrapInColumn === 'auto' && this._reactInternalInstance && this._reactInternalInstance._hostParent && this._reactInternalInstance._hostParent._currentElement && this._reactInternalInstance._hostParent._currentElement.props && Array.isArray(this._reactInternalInstance._hostParent._currentElement.props.children)){
                    var rowCountItems = React.Children.count(this._reactInternalInstance._hostParent._currentElement.props.children);
                    outerClassName += ' col-md-' + (12 / rowCountItems) + ' col-xs-6';
                } else outerClassName += ' ' + wrapInColumn;
            } else {
                outerClassName += " col-xs-6 col-md-4"; // Default column sizing
            }
            return <div className={outerClassName} key="outer" children={innerBlockReturned} />;
        } else return innerBlockReturned;

    }
}
