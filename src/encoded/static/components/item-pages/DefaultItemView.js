'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import { Collapse } from 'react-bootstrap';
import _ from 'underscore';
import { panel_views, itemClass, content_views } from './../globals';
import Alerts from './../alerts';
import { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, ExternalReferenceLink,
    FilesInSetTable, FormattedInfoBlock, ItemFooterRow, Publications, AttributionTabView } from './components';
import { console, object, DateUtility, Filters, layout, Schemas, fileUtil, isServerSide, ajax } from './../util';
import { BasicStaticSectionBody } from './../static-pages/components/BasicStaticSectionBody';

/**
 * This Component renders out the default Item page view for Item objects/contexts which do not have a more specific
 * Item page template associated with them.
 *
 * @module {Component} item-pages/DefaultItemView
 */


/**
 * The DefaultItemView class extends React.Component to provide some helper functions to be used from an Item View page.
 *
 * It provides a 'template' which can be extended further by Item page views such as ExperimentSetView, BiosourceView, etc. which can override/extend individual functions defined here.
 * Look at the render method to see how the functions are brought in together -- there shouldn't be a need to create own 'render' function from some Item view.
 */
export default class DefaultItemView extends React.PureComponent {

    constructor(props){
        super(props);
        this.getCommonTabs = this.getCommonTabs.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        this.getTabViewWidth = this.getTabViewWidth.bind(this);
        this.setTabViewKey = this.setTabViewKey.bind(this);
        this.itemHeader = this.itemHeader.bind(this);
        this.render = this.render.bind(this);
        this.state = {};
    }

    maybeSetReplacedRedirectedAlert(){
        var { href, context } = this.props;
        if (!href) return;

        var hrefParts = url.parse(href, true),
            redirected_from = hrefParts.query && hrefParts.query.redirected_from,
            redirected_from_accession = redirected_from && _.filter(redirected_from.split('/'))[1];

        if (typeof redirected_from_accession !== 'string' || redirected_from_accession.slice(0,3) !== '4DN') redirected_from_accession = null; // Unset if not in form of accession.
        if (redirected_from_accession && context.accession && Array.isArray(context.alternate_accessions) && context.alternate_accessions.indexOf(redirected_from_accession) > -1){
            // Find @id of our redirected_from item.
            ajax.load('/search/?type=Item&field=@id&field=uuid&field=accession&status=replaced&accession=' + redirected_from_accession, (r)=>{
                var ourOldItem = _.findWhere(r['@graph'], { 'accession' : redirected_from_accession });
                if (!ourOldItem){
                    console.error('Couldnt find correct Item in list of results.');
                    return;
                }
                if (!ourOldItem['@id']){
                    console.error('Couldnt find @id of Item.');
                    return;
                }
                Alerts.queue({
                    'title' : "Redirected",
                    'message': <span>You have been redirected from <a href={ourOldItem['@id']}>{ redirected_from_accession }</a>, which this item ({ context.accession }) supercedes.</span>,
                    'style': 'warning'
                });
            }, 'GET', (err)=>{
                console.error('No results found');
            });
        }
    }

    componentDidMount(){
        this.maybeSetReplacedRedirectedAlert();
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

    getTabViewWidth(){
        var width = (!isServerSide() && this.refs && this.refs.tabViewContainer && this.refs.tabViewContainer.offsetWidth) || null;
        if (typeof width === 'number' && width) width -= 20;
        return width;
    }

    setTabViewKey(nextKey){
        if (this.refs.tabbedView && typeof this.refs.tabbedView.setActiveKey === 'function'){
            try {
                this.refs.tabbedView.setActiveKey(nextKey);
            } catch (e) {
                console.warn('Could not switch TabbedView to key "' + nextKey + '", perhaps no longer supported by rc-tabs.');
            }
        } else {
            console.error('Cannot access refs.tabbedView.setActiveKey()');
        }
    }
    
    itemClassName(){
        return itemClass(this.props.context, 'view-detail item-page-container');
    }

    /**
     * Executed on width change, as well as this ItemView's prop change.
     */
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
        return [
            <Publications.ProducedInPublicationBelowHeaderRow {...this.props} produced_in_pub={this.props.context.produced_in_pub} key="publication-info" />,
            <StaticHeadersArea context={this.props.context} key="static-headers-area" />
        ];
    }

    tabbedView(){
        return <TabbedView contents={this.getTabViewContents} key="tabbedView" />;
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

content_views.register(DefaultItemView, 'Item');








/*******************************
 ****** Helper Components ******
 *******************************/


export class OverviewHeadingContainer extends React.Component {

    static propTypes = {
        'onFinishOpen' : PropTypes.func,
        'onStartOpen' : PropTypes.func,
        'onFinishClose' : PropTypes.func,
        'onStartClose' : PropTypes.func
    }

    static defaultProps = {
        'className'     : 'with-background mb-3 mt-1',
        'defaultOpen'   : true,
        'titleElement'  : 'h4',
        'title'         : 'Properties',
        'prependTitleIcon' : false,
        'prependTitleIconFxn' : function(open, props){
            return <i className={"expand-icon icon icon-" + (open ? 'minus' : 'plus')} data-tip={open ? 'Collapse' : 'Expand'}/>;
        }
    }

    constructor(props){
        super(props);
        this.toggle = _.throttle(this.toggle.bind(this), 500);
        this.renderInner = this.renderInner.bind(this);
        this.renderInnerBody = this.renderInnerBody.bind(this);
        this.state = { 'open' : props.defaultOpen };
    }

    toggle(){
        this.setState({ 'open' : !this.state.open });
    }

    renderTitle(){
        var { title, prependTitleIcon, prependTitleIconFxn } = this.props, open = this.state.open;
        return (
            <span>
                { prependTitleIcon && prependTitleIconFxn ? prependTitleIconFxn(open, this.props) : null }
                { title } &nbsp;<i className={"icon icon-angle-right" + (open ? ' icon-rotate-90' : '')}/>
            </span>
        );
    }

    renderInner(){
        return (
            <div className="inner">
                <hr className="tab-section-title-horiz-divider"/>
                { this.renderInnerBody() }
            </div>
        );
    }

    renderInnerBody(){
        return <div className="row overview-blocks" children={this.props.children}/>;
    }

    render(){
        var { title, titleElement, titleClassName, className, onStartOpen, onStartClose, onFinishClose, onFinishOpen } = this.props;
        var open = this.state.open;
        return (
            <div className={"overview-blocks-header" + (open ? ' is-open' : ' is-closed') + (typeof className === 'string' ? ' ' + className : '')}>
                { title && titleElement ? React.createElement(titleElement, { 'className' : 'tab-section-title clickable with-accent' + (titleClassName ? ' ' + titleClassName : ''), 'onClick' : this.toggle }, this.renderTitle()) : null }
                <Collapse in={open} onEnter={onStartOpen} onEntered={onFinishOpen} onExit={onStartClose} onExited={onFinishClose} children={this.renderInner()} />
            </div>
        );
    }
}

/**
 * Renders out a list of ExpandableStaticHeader components to represent
 * `context.static_headers`.
 */
export class StaticHeadersArea extends React.PureComponent {

    render(){
        var context = this.props.context,
            headersToShow = _.filter(context.static_headers || [], function(s){ return s.content; }); // Only sections with a content (incl check for permissions).

        if (!headersToShow || headersToShow.length === 0) return null;
        return (
            <div className="static-headers-area">
                { _.map(headersToShow, (section, i) =>
                    <ExpandableStaticHeader title={section.title || 'Informational Notice ' + (i + 1)} content={section.content}
                        defaultOpen={section.options && section.options.default_open} key={section.name || i} index={i}
                        titleIcon={section.options && section.options.title_icon} />
                )}
                <hr />
            </div>
        );
    }

}


export class ExpandableStaticHeader extends OverviewHeadingContainer {

    static propTypes = {
        'section' : PropTypes.object.isRequired
    }

    static defaultProps = _.extend({}, OverviewHeadingContainer.defaultProps, {
        'className' : 'with-background mb-1 mt-1',
        'title'     : "Information",
        'prependTitleIconFxn' : function(open, props){
            if (!props.titleIcon) return null;
            return <i className={"expand-icon icon icon-fw icon-" + props.titleIcon} />;
        },
        'prependTitleIcon' : true
    })

    renderInnerBody(){
        return (
            <div className="static-section-header pt-1">
                <BasicStaticSectionBody {..._.pick(this.props, 'content', 'filetype')} />
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
        'default' : function(field, value, jsxAllowed = true, addDescriptionTip = true, index = null, wrapperElementType = 'li', fullObject = null){
            var calcdName = Schemas.Term.toName(field, value, jsxAllowed, addDescriptionTip);
            if (wrapperElementType === 'div' && typeof index === 'number') {
                return [((index + 1) + '. '), calcdName];
            }
            return calcdName;
        },
        'biosample_treatments' : function(field, treatment, allowJX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li', fullObject = null){
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
        'embedded_item_with_attachment' : function(field, item, allowJX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li', fullObject = null){
            return <EmbeddedItemWithAttachment {...{ item, index }} />;
        },
        'embedded_item_with_image_attachment' : function(field, item, allowJX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li', fullObject = null){
            return <EmbeddedItemWithImageAttachment {...{ item, index }} />;
        },
        'url_string' : function(field, value, allowJSX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li', fullObject = null){
            if (typeof value !== 'string') return null;
            return <a href={value} style={{ 'overflowWrap' : 'break-word' }}>{value}</a>;
        },
        'imaging_paths_from_exp': function(field, value, allowJSX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'div', fullObject = null){
            if (!value || typeof value !== 'object') return null;
            var { channel, path } = value;

            var matchingFile = _.find(fullObject.files || [], fileUtil.getLightSourceCenterMicroscopeSettingFromFile.bind(this, channel));

            return (
                <div className="imaging-path-item-wrapper row">
                    <div className="index-num col-xs-2 mono-text text-500"><small>{ channel }</small></div>
                    <div className={"imaging-path col-xs-" + (matchingFile ? '7' : '10')}>{ object.itemUtil.generateLink(path, true) }</div>
                    { matchingFile ? <div className="microscope-setting col-xs-3 text-right" data-tip="Light Source Center Wavelength">{ fileUtil.getLightSourceCenterMicroscopeSettingFromFile(channel, matchingFile) }nm</div> : null }
                </div>
            );
        }
    }

    /** If we have a list, wrap each in a <li> and calculate value, else return items param as it was passed in. */
    static createList(items, property, titleRenderFxn = OverViewBodyItem.titleRenderPresets.default, addDescriptionTipForLinkTos = true, listItemElement = 'li', listItemElementProps = null, origResult = null){

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
                return React.createElement(listItemElement, _.extend({ 'key' : object.atIdFromObject(b) || i }, listItemElementProps || {}), titleRenderFxn(property, b, true, addDescriptionTipForLinkTos, i, listItemElement, origResult) );
            });
        } else if (Array.isArray(items) && items.length === 1 && items[0].display_title && object.atIdFromObject(items[0])) {
            return titleRenderFxn(property, items[0], true, addDescriptionTipForLinkTos, null, 'div', origResult);
        } else if (Array.isArray(items) && items.length > 1){
            items = _.map(items, function(b,i){
                return React.createElement(  listItemElement  ,  _.extend({ 'key' : i }, listItemElementProps || {})  ,  titleRenderFxn(property, b, true, addDescriptionTipForLinkTos, i, listItemElement, origResult)  );
            });
        } else if (Array.isArray(items) && items.length === 1){
            items = titleRenderFxn(property, items[0], true, addDescriptionTipForLinkTos, null, 'div', origResult);
        } else if (!Array.isArray(items)){
            return titleRenderFxn(property, items, true, addDescriptionTipForLinkTos, null, 'div', origResult);
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
        'propertyForLabel'              : null,
        'property'                      : null
    }

    /** Feeds params + props into static function */
    createList(valueForProperty, listItemElement, listItemElementProps){
        return OverViewBodyItem.createList(valueForProperty, this.props.property, this.props.titleRenderFxn, this.props.addDescriptionTipForLinkTos, listItemElement, listItemElementProps, this.props.result);
    }

    render(){
        var { 
            result, property, fallbackValue, fallbackTitle, titleRenderFxn, addDescriptionTipForLinkTos, propertyForLabel,
            listWrapperElement, listWrapperElementProps, listItemElement, listItemElementProps, wrapInColumn, columnExtraClassName, singleItemClassName
        } = this.props;
        
        function fallbackify(val){
            if (!property) return titleRenderFxn(property, result, true, addDescriptionTipForLinkTos, null, 'div', result);
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
        var resultPropertyValue = property && this.createList( object.getNestedProperty(result, property), listItemElement, listItemElementProps );

        if (property && this.props.hideIfNoValue && (!resultPropertyValue || (Array.isArray(resultPropertyValue) && resultPropertyValue.length === 0))){
            return null;
        }

        var innerBlockReturned = null;
        propertyForLabel = propertyForLabel || property;

        if (Array.isArray(resultPropertyValue)){
            innerBlockReturned = (
                <div className="inner" key="inner" data-field={property}>
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
                <div className="inner" key="inner" data-field={property}>
                    <object.TooltipInfoIconContainerAuto {..._.pick(this.props, 'result', 'tips', 'fallbackTitle', 'schemas')} elementType="h5" property={propertyForLabel} title={this.props.overrideTitle} />
                    <div key="single-value" className={"overview-single-element" + (singleItemClassName ? ' ' + singleItemClassName : '') + ((!resultPropertyValue && property) ? ' no-value' : '')}>
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
