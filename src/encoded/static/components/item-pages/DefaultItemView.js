'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import url from 'url';
import { Collapse, Button } from 'react-bootstrap';
import _ from 'underscore';
import Alerts from './../alerts';
import { ItemHeader, ItemDetailList, TabbedView, AuditTabView, Publications, AttributionTabView, BadgesTabView } from './components';
import { console, object, DateUtility, layout, Schemas, fileUtil, isServerSide, ajax, typedefs } from './../util';
import { ExpandableStaticHeader } from './../static-pages/components/BasicStaticSectionBody';

var { TabObject, Item } = typedefs;

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

    static className = memoize(function(context){
        const classes = [
            'view-detail',
            'item-page-container',
            'container'
        ];

        _.forEach((context['@type'] || []), function (type) {
            classes.push('type-' + type);
        });

        if (typeof context.status === 'string'){
            classes.push('status-' + context.status.toLowerCase().replace(/ /g, '-').replace(/\(|\)/g,''));
        }

        return classes.join(' ');
    });

    /**
     * Bind instance methods to `this` and creates an empty state object which may be extended by subclasses.
     * May be extended by sub-classes.
     */
    constructor(props){
        super(props);
        this.getCommonTabs = this.getCommonTabs.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        this.getTabViewWidth = this.getTabViewWidth.bind(this);
        this.setTabViewKey = this.setTabViewKey.bind(this);
        this.itemHeader = this.itemHeader.bind(this);

        /**
         * Empty state object. May be extended by sub-classes.
         *
         * @public
         * @type {Object}
         */
        this.state = {};

        this.tabbedViewRef = React.createRef();
    }

    /**
     * If a URI param for `redirected_from` exists, and we can load the referenced Item via AJAX, show an alert at top of page regarding redirection.
     * Called upon mounting view. Is not extendable.
     *
     * @protected
     * @returns {void}
     */
    maybeSetReplacedRedirectedAlert(){
        var { href, context } = this.props;
        if (!href) return;

        var hrefParts = url.parse(href, true);
        var redirected_from = hrefParts.query && hrefParts.query.redirected_from;

        if (Array.isArray(redirected_from)){
            redirected_from = redirected_from[0];
        }

        var redirected_from_accession = redirected_from && _.filter(redirected_from.split('/'))[1];

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

    /**
     * Calls `maybeSetReplacedRedirectedAlert`. May be extended by sub-classes.
     *
     * @public
     * @returns {void}
     */
    componentDidMount(){
        this.maybeSetReplacedRedirectedAlert();
    }

    /**
     * Returns a list of _common_ tab definitions - `AttributionTabView`, `ItemDetailList`, & `AuditTabView`.
     * DO NOT EXTEND.
     *
     * @protected
     * @param {Object} props Current props sent down to view. Should be about same as in App render function.
     * @returns {TabObject[]}
     */
    getCommonTabs(){
        var returnArr = [],
            { context, schemas, windowWidth } = this.props;

        // Attribution Tab
        if (context.lab || context.submitted_by || context.publications_of_set || context.produced_in_pub){
            returnArr.push(AttributionTabView.getTabObject(this.props));
        }

        returnArr.push(ItemDetailList.getTabObject(this.props));

        // Badges, if any
        const badges = BadgesTabView.getBadgesList(context);
        if (badges){
            returnArr.push(BadgesTabView.getTabObject(this.props));
        }

        // Audits, if any -- THESE WILL BE DEPRECATED SOME DAY
        if (AuditTabView.doAnyAuditsExist(context)){
            returnArr.push(AuditTabView.getTabObject(this.props));
        }

        return returnArr;
    }

    /**
     * Returns a list of _default_ tab definitions - `ItemDetailList`, `AttributionTabView`, & `AuditTabView`.
     * Order of tabs differs from `getCommonTabs`.
     * DO NOT EXTEND.
     *
     * @protected
     * @returns {void}
     */
    getDefaultTabs(context = this.props.context){
        var returnArr = [];
        returnArr.push(ItemDetailList.getTabObject(this.props));
        if (context.lab || context.submitted_by || context.publications_of_set || context.produced_in_pub){
            returnArr.push(AttributionTabView.getTabObject(this.props));
        }
        returnArr.push(AuditTabView.getTabObject(this.props));
        return returnArr;
    }

    /**
     * Calculated width of tabview pane.
     * Alias of `layout.gridContainerWidth(this.props.windowWidth)`.
     *
     * @returns {number} Width of tabview.
     */
    getTabViewWidth(){
        return layout.gridContainerWidth(this.props.windowWidth);
    }

    /**
     * Callback to navigate TabView to different tab.
     * DO NOT EXTEND
     *
     * @protected
     * @param {string} nextKey - Key name for tab to switch to.
     * @returns {void}
     */
    setTabViewKey(nextKey){
        var tabbedView = this.tabbedViewRef.current;
        if (tabbedView && typeof tabbedView.setActiveKey === 'function'){
            try {
                tabbedView.setActiveKey(nextKey);
            } catch (e) {
                console.warn('Could not switch TabbedView to key "' + nextKey + '", perhaps no longer supported by rc-tabs.');
            }
        } else {
            console.error('Cannot access tabbedView.setActiveKey()');
        }
    }

    /**
     * Returns a classname for view container. Not used for much at moment.
     * DO NOT EXTEND
     *
     * @deprecated
     * @protected
     * @returns {string} A className
     */
    itemClassName(){
        return DefaultItemView.className(this.props.context);
    }

    /**
     * Extendable method to returns tabs for the view or sub-class view.
     * Returns `getDefaultTabs()` by default, until extended in a sub-class.
     * Executed on width change, as well as ItemView's prop changes.
     *
     * @returns {TabObject[]} Tab objects for this Item view/type.
     */
    getTabViewContents(){
        return this.getDefaultTabs();
    }

    /**
     * Returns object with `title` and `description` (used for tooltip) to show detailed or base type info at top left of page, under title.
     * Extendable.
     *
     * @returns {null} Nothing. Must be extended per item type.
     */
    typeInfo(){
        return null;
    }

    /**
     * Returns Item header, including description, status label/color, view json links, etc.
     * This function may be extended and customized in order to add/change contents as needed.
     *
     * @returns {JSX.Element} Nothing. Must be extended per item type.
     * @todo Maybe simplify CSS styling around these. Or get rid of these components and use plain HTML elements.
     */
    itemHeader(){
        return (
            <ItemHeader.Wrapper {..._.pick(this.props, 'context', 'href', 'schemas', 'windowWidth')}>
                <ItemHeader.TopRow typeInfo={this.typeInfo()} />
                <ItemHeader.MiddleRow />
                <ItemHeader.BottomRow />
            </ItemHeader.Wrapper>
        );
    }

    /**
     * Returns list of elements to be rendered between Item header and the list of properties (or Tabs).
     * May be extended/customized.
     *
     * **NOTE: If adding something here and intend it to apply to _ALL_ Item views:**,
     * Ensure any Item views which extend/override this method also receive this edit.
     *
     * @returns {JSX.Element[]} By default, `Publications.PublicationBelowHeaderRow` and `StaticHeaderArea` component instances.
     */
    itemMidSection(){
        return (
            <React.Fragment>
                <Publications.PublicationBelowHeaderRow {...this.props} publication={this.props.context.produced_in_pub} key="publication-info" />
                <StaticHeadersArea context={this.props.context} key="static-headers-area" />
            </React.Fragment>
        );
    }

    /**
     * Renders the TabbedView component. Do not extend.
     *
     * @protected
     * @returns {JSX.Element}
     */
    renderTabbedView(){
        return (
            <TabbedView {..._.pick(this.props, 'windowWidth', 'windowHeight', 'href', 'context')}
                contents={this.getTabViewContents()} ref={this.tabbedViewRef} key="tabbedView" />
        );
    }

    /**
     * Renders footer for the ItemView (if any).
     *
     * @returns {null} Nothing returned by default unless extended.
     */
    itemFooter(){
        return null; /*<ItemFooterRow context={context} schemas={schemas} />*/
    }

    /**
     * The render method which puts the above method outputs together.
     * Should not override except for rare cases; instead, override other
     * methods which are called in this render method.
     *
     * @private
     * @protected
     * @returns {JSX.Element}
     */
    render() {
        return (
            <div className={this.itemClassName()} id="content">
                { this.itemHeader() }
                { this.itemMidSection() }
                { this.renderTabbedView() }
                <br/>
                { this.itemFooter() }
            </div>
        );
    }

}





/*******************************************
 ****** Helper Components & Functions ******
 *******************************************/


/**
 * Renders out a list of ExpandableStaticHeader components to represent
 * `context.static_headers`.
 */
export class StaticHeadersArea extends React.PureComponent {

    render(){
        var context = this.props.context,
            headersFromStaticContent = _.pluck(_.filter(
                context.static_content || [],
                function(s){ return s.location === 'header'; }
            ), 'content'),
            headersToShow = _.uniq(_.filter(
                headersFromStaticContent.concat(context.static_headers || []),
                function(s){
                    if (!s || s.error) return false; // No view permission(s)
                    if (s.content || s.viewconfig) return true;
                    return false; // Shouldn't happen
                }
            ), false, object.itemUtil.atId);

        if (!headersToShow || headersToShow.length === 0) return null;

        return (
            <div className="static-headers-area">
                { _.map(headersToShow, (section, i) =>
                    <ExpandableStaticHeader
                        title={section.title || 'Informational Notice ' + (i + 1)}
                        context={section}
                        defaultOpen={(section.options && section.options.default_open) || false} key={section.name || i} index={i}
                        titleIcon={section.options && section.options.title_icon} />
                )}
                <hr />
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


export class OverViewBodyItem extends React.PureComponent {

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
        'singleItemClassName'           : null,
        'fallbackTitle'                 : null,
        'propertyForLabel'              : null,
        'property'                      : null
    };

    constructor(props){
        super(props);
        this.createList = memoize(this.createList);
    }

    /** Feeds params + props into static function */
    createList(valueForProperty, property, titleRenderFxn, addDescriptionTipForLinkTos, listItemElement, listItemElementProps, result){
        return OverViewBodyItem.createList(valueForProperty, property, titleRenderFxn, addDescriptionTipForLinkTos, listItemElement, listItemElementProps, result);
    }

    render(){
        var {
            result, property, fallbackValue, fallbackTitle, titleRenderFxn, addDescriptionTipForLinkTos, propertyForLabel,
            listWrapperElement, listWrapperElementProps, listItemElement, listItemElementProps, wrapInColumn, singleItemClassName
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
        var resultPropertyValue = property && this.createList(
            object.getNestedProperty(result, property),
            property,
            titleRenderFxn,
            addDescriptionTipForLinkTos,
            listItemElement,
            listItemElementProps,
            result
        );

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

        return <WrapInColumn wrap={wrapInColumn}>{ innerBlockReturned }</WrapInColumn>;
    }
}

export function WrapInColumn(props){
    const { children, wrap, className, defaultWrapClassName } = props;
    if (!wrap) return children;

    let wrapClassName;
    if (wrap === true)                  wrapClassName = defaultWrapClassName;
    else if (typeof wrap === 'string')  wrapClassName = wrap;
    return <div className={wrapClassName + (className ? ' ' + className : '')}>{ children }</div>;
}
WrapInColumn.defaultProps = {
    'wrap' : false,
    'defaultWrapClassName' : "col-xs-6 col-md-4"
};

