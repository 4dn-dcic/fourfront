'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import url from 'url';
import _ from 'underscore';
import queryString from 'query-string';

import { ItemDetailList } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/ItemDetailList';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/Alerts';
import { LocalizedTime } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/LocalizedTime';
import { console, object, layout, ajax, commonFileUtil, schemaTransforms } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { ViewFileButton } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/FileDownloadButton';
import { FlexibleDescriptionBox } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/FlexibleDescriptionBox';
import { Schemas, fileUtil, typedefs } from './../util';

import { Wrapper as ItemHeaderWrapper, TopRow, MiddleRow, BottomRow } from './components/ItemHeader';
import { SlideInPane } from './../viz/SlideInPane';
import { TabView } from './components/TabView';
import { Publications } from './components/Publications';
import { AttributionTabView } from './components/AttributionTabView';
import { BadgesTabView } from './components/BadgesTabView';

import { ExpandableStaticHeader } from './../static-pages/components';

// eslint-disable-next-line no-unused-vars
const { TabObject, Item } = typedefs;

/**
 * This Component renders out the default Item page view for Item objects/contexts which do not have a more specific
 * Item page template associated with them.
 *
 * @module {Component} item-pages/DefaultItemView
 */



/**
 * Additional props we pass into ItemDetailList in all ItemViews.
 * Project-specific.
 */
export const propsForDetailList = {
    stickyKeys : ['accession', 'status', 'description'],
    excludedKeys : ['@id', 'principals_allowed', 'actions', '@context', 'display_title', 'title'],
    alwaysCollapsibleKeys : ['@type', 'schema_version', 'uuid', 'external_references', 'aggregated-items', 'validation-errors'],
    termTransformFxn : function(field, term, allowJSX){
        // Relatively special cases for when on Item PageViews
        if (field === 'accession'){
            return (
                <object.CopyWrapper value={term} className="accession text-small inline-block" wrapperElement="span"
                    iconProps={{ 'style' : { 'fontSize' : '0.875rem', 'marginLeft' : -3 } }}>
                    { term }
                </object.CopyWrapper>
            );
        }
        if (field === 'description'){
            return (
                <FlexibleDescriptionBox
                    description={ term || <em>No description provided.</em> }
                    className="item-page-heading"
                    textClassName="text-medium"
                    defaultExpanded={term.length < 600}
                    fitTo="self"
                    lineHeight={23}
                    dimensions={{
                        'paddingWidth' : 0,
                        'paddingHeight' : 0, // Padding-top + border-top
                        'buttonWidth' : 30,
                        //'initialHeight' : 42
                    }}
                />
            );
        }
        return Schemas.Term.toName(field, term, typeof allowJSX === 'boolean' ? allowJSX : true);
    }
};


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
            //'container'
        ];

        _.forEach((context['@type'] || []), function (type) {
            classes.push('type-' + type);
        });

        if (typeof context.status === 'string'){
            classes.push('status-' + context.status.toLowerCase().replace(/ /g, '-').replace(/\(|\)/g,''));
        }

        return classes.join(' ');
    });

    static propTypes = {
        'windowWidth' : PropTypes.number,
        'schemas' : PropTypes.object,
        'href' : PropTypes.string,
        'width' : PropTypes.number
    };

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

        /**
         * Empty state object. May be extended by sub-classes.
         *
         * @public
         * @type {Object}
         */
        this.state = {};

        this.tabbedViewRef = React.createRef();
        this.itemActionsTabRef = React.createRef();
    }

    /**
     * If a URI param for `redirected_from` exists, and we can load the referenced Item via AJAX, show an alert at top of page regarding redirection.
     * Called upon mounting view. Is not extendable.
     *
     * @protected
     * @returns {void}
     */
    maybeSetReplacedRedirectedAlert(){
        const { href, context } = this.props;
        if (!href) return;

        let { query : { redirected_from = null } = { redirected_from : null } } = url.parse(href, true);

        if (Array.isArray(redirected_from)){
            redirected_from = redirected_from[0];
        }

        let redirected_from_accession = redirected_from && _.filter(redirected_from.split('/'))[1];
        // TODO use value from schemas instd of "4DN"
        if (typeof redirected_from_accession !== 'string' || redirected_from_accession.slice(0,3) !== '4DN'){
            redirected_from_accession = null; // Unset if not in form of accession.
        }

        if (redirected_from_accession && context.accession && Array.isArray(context.alternate_accessions) && context.alternate_accessions.indexOf(redirected_from_accession) > -1){
            // Find @id of our redirected_from item.
            ajax.load('/search/?type=Item&field=@id&field=uuid&field=accession&status=replaced&accession=' + redirected_from_accession, (r)=>{
                const ourOldItem = _.findWhere(r['@graph'], { 'accession' : redirected_from_accession });
                if (!ourOldItem){
                    console.error('Couldnt find correct Item in list of results.');
                    return;
                }
                if (!object.itemUtil.atId(ourOldItem)){
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
     * Calls `maybeSetReplacedRedirectedAlert`.
     * Sets body to full screen mode.
     * May be extended by sub-classes.
     *
     * @public
     * @returns {void}
     */
    componentDidMount(){
        this.maybeSetReplacedRedirectedAlert();
    }

    /**
     * Returns a list of _common_ tab definitions - `AttributionTabView`, `ItemDetailList`
     * DO NOT EXTEND.
     *
     * @protected
     * @param {Object} props Current props sent down to view. Should be about same as in App render function.
     * @returns {TabObject[]}
     */
    getCommonTabs(){
        const { context, schemas, windowWidth } = this.props;
        const returnArr = [];

        // Attribution Tab
        //if (context.lab || context.submitted_by || context.publications_of_set || context.produced_in_pub){
        //    returnArr.push(AttributionTabView.getTabObject(this.props));
        //}

        returnArr.push(DetailsTabView.getTabObject(this.props));

        // Badges, if any
        const badges = BadgesTabView.getBadgesList(context);
        if (badges){
            returnArr.push(BadgesTabView.getTabObject(this.props));
        }

        return returnArr;
    }

    /**
     * Returns a list of _default_ tab definitions - `ItemDetailList`, `AttributionTabView`
     * Order of tabs differs from `getCommonTabs`.
     * DO NOT EXTEND.
     *
     * @protected
     */
    getDefaultTabs(){
        const { context } = this.props;
        const returnArr = [];

        returnArr.push(DetailsTabView.getTabObject(this.props));

        //if (context.lab || context.submitted_by || context.publications_of_set || context.produced_in_pub){
        //    returnArr.push(AttributionTabView.getTabObject(this.props));
        //}
        return returnArr;
    }

    /**
     * Calculated width of tabview pane.
     * Alias of `layout.gridContainerWidth(this.props.windowWidth)`.
     *
     * @returns {number} Width of tabview.
     */
    getTabViewWidth(){
        // eslint-disable-next-line react/destructuring-assignment
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
        const tabbedView = this.tabbedViewRef.current;
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
     * Renders footer for the ItemView (if any).
     *
     * @returns {null} Nothing returned by default unless extended.
     */
    itemFooter(){
        return null; /*<ItemFooterRow context={context} schemas={schemas} />*/
    }

    /** Render additional item actions */
    additionalItemActionsContent(){
        return null;
    }

    /**
     * Somewhat hacky/anti-pattern - calls function of a child component.
     * Is kept this way to simplify code and avoid putting more logic into
     * or above this top-level component.
     */
    /*
    onItemActionsTabClick(evt){
        const childOnClickFxn = (this.itemActionsTabRef.current && this.itemActionsTabRef.current.toggleOpen) || null;
        if (!childOnClickFxn) {
            console.error("No function or ref available");
            return;
        }

        // React bubbles click events up to outer tab including clicks
        // within the React.createPortal render tree (unless propagation stopped).
        // So we check evt.target to ensure we're being called from
        // menu btn click and nowhere else.
        // Not super ideal structure but simplifies some other stuff
        // so keeping this for now.
        if (!layout.isDOMElementChildOfElementWithClass(evt.target, 'menu-tab')){
            return;
        }

        childOnClickFxn(evt);
    }
    */

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
        const { context, alerts } = this.props;
        const titleTabObj = {
            'className' : "title-tab",
            'tab' : <TitleTab {..._.pick(this.props, 'schemas', 'href', 'context')} />,
            'key' : 'item-title'
        };
        const menuTabObj = {
            'className' : "menu-tab",
            'tab' : (
                <ItemActionsTab {..._.pick(this.props, 'schemas', 'href', 'context', 'innerOverlaysContainer', 'session')}
                    additionalItemActionsContent={this.additionalItemActionsContent()} />
            ),
            'key' : 'item-actions-menu',
            //'onClick' : this.onItemActionsTabClick
        };
        return (
            <div className={DefaultItemView.className(context)} id="content">
                <div id="item-page-alerts-container">
                    <Alerts alerts={alerts} className="alerts" />
                </div>
                {/* this.itemHeader() */}
                {/* this.itemMidSection() */}
                <TabView
                    contents={this.getTabViewContents()} ref={this.tabbedViewRef} key="tabbedView"
                    {..._.pick(this.props, 'windowWidth', 'windowHeight', 'href', 'context')}
                    prefixTabs={[ titleTabObj ]} suffixTabs={[ menuTabObj ]} />
                { this.itemFooter() }
            </div>
        );
    }

}





/*******************************************
 ****** Helper Components & Functions ******
 *******************************************/

/** Show as first 'tab' of TabView Tabs. Not clickable. */
const TitleTab = React.memo(function TitleTab({ context, schemas }){
    const { display_title, accession } = context;
    const itemTypeTitle = schemaTransforms.getItemTypeTitle(context, schemas);
    let itemTitle = null;

    if (display_title && display_title !== accession) {
        itemTitle = <div className="col item-title">{ display_title }</div>;
    } else if (accession) {
        itemTitle = (
            <div className="col item-title">
                <span className="accession text-small">{ accession }</span>
            </div>
        );
    }

    return (
        <div className="row">
            <div className="col-auto item-type-title" data-tip="Item Type" data-place="right">
                { itemTypeTitle }
            </div>
            { itemTitle ?
                <div className="col-auto icon-col">
                    <i className="icon icon-angle-right fas"/>
                </div>
                : null
            }
            { itemTitle }
        </div>
    );
});


/** Show as last 'tab' of TabView Tabs */
export class ItemActionsTab extends React.PureComponent {

    static defaultProps = {
        'itemActionsExtras': {
            'edit'      : {
                description: 'Edit the properties of this Item.',
                icon: "pencil fas"
            },
            'create'    : {
                description: 'Create a blank new Item of the same type.',
                icon: "plus fas"
            },
            'clone'     : {
                description: 'Create and edit a copy of this Item.',
                icon: "copy fas"
            }
        }
    };

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = {
            open: false
        };
    }

    toggleOpen(evt){
        evt.preventDefault();
        evt.stopPropagation();
        this.setState(function({ open }){
            return { 'open' : !open };
        });
    }

    render(){
        const { innerOverlaysContainer, additionalItemActionsContent, ...passProps } = this.props;
        const { context : { actions = [] }, session, href, itemActionsExtras } = passProps;
        const { open } = this.state;

        if (!session && !additionalItemActionsContent){
            // No context.actions available except to see JSON (hardcoded)
            // might change in future.
            // So just show view JSON action and no menu.
            return (
                <ViewJSONAction href={href}>
                    <div className="icon-container clickable" onClick={this.toggleOpen} data-tip="Open window showing this Item in raw JSON format.">
                        <i className="icon icon-fw fas icon-file-code"/>
                        <span className="text-monospace text-smaller">JSON</span>
                    </div>
                </ViewJSONAction>
            );
        }

        // Only keep actions that are defined in the descriptions
        const filteredActions = _.filter(actions, function(action){
            return typeof itemActionsExtras[action.name] !== 'undefined';
        });

        return (
            <React.Fragment>
                <div className="icon-container clickable" onClick={this.toggleOpen}>
                    <i className="icon icon-fw fas icon-bars"/>
                    <span>Actions</span>
                </div>
                <SlideInPane in={open} overlaysContainer={innerOverlaysContainer} onClose={this.toggleOpen}>
                    <ItemActionsTabMenu {...passProps} actions={filteredActions} onClose={this.toggleOpen}>
                        { additionalItemActionsContent }
                    </ItemActionsTabMenu>
                </SlideInPane>
            </React.Fragment>
        );
    }

}


const ItemActionsTabMenu = React.memo(function ItemActionsTabMenu(props){
    const { actions, itemActionsExtras, href: currentPageHref, onClose, children } = props;

    const renderedActions = actions.map(function({ name, title, profile, href }, idx){
        const { description, icon } = itemActionsExtras[name];
        let innerTitle = (
            <React.Fragment>
                <h5>{ title || name }</h5>
                <span className="description">{ description }</span>
            </React.Fragment>
        );
        if (icon){
            innerTitle = (
                <div className="row">
                    <div className="col-auto icon-container">
                        <i className={"icon icon-fw icon-" + icon}/>
                    </div>
                    <div className="col title-col">{ innerTitle }</div>
                </div>
            );
        }
        return (
            <a className="menu-option" key={name || idx} href={href}>
                { innerTitle }
            </a>
        );
    });

    // Extend with some hardcoded actions
    // Currently only the view JSON btn.
    renderedActions.unshift(<ViewJSONMenuOption href={currentPageHref} />);

    return (
        <div className="item-page-actions-menu">
            <div className="title-box row">
                <h4 className="col">Actions</h4>
                <div className="col-auto close-btn-container clickable" onClick={onClose}>
                    <i className="icon icon-times fas"/>
                </div>
            </div>
            <div className="menu-inner">
                { renderedActions }
                { children }
            </div>
        </div>
    );
});

function ViewJSONAction({ href, children }){
    const urlParts = url.parse(href, true);
    urlParts.search = '?' + queryString.stringify(_.extend(urlParts.query, { 'format' : 'json' }));
    const viewUrl = url.format(urlParts);
    const onClick = (e) => {
        if (window && window.open){
            e.preventDefault();
            window.open(viewUrl, 'window', 'toolbar=no, menubar=no, resizable=yes, status=no, top=10, width=400');
        }
    };
    return React.cloneElement(children, { onClick });
}

const ViewJSONMenuOption = React.memo(function ViewJSONMenuOption({ href }){
    return (
        <ViewJSONAction href={href}>
            <a className="menu-option" href="#">
                <div className="row">
                    <div className="col-auto icon-container">
                        <i className="icon icon-fw fas icon-code"/>
                    </div>
                    <div className="col title-col">
                        <h5>View as JSON</h5>
                        <span className="description">Open raw JSON in new window.</span>
                    </div>
                </div>
            </a>
        </ViewJSONAction>
    );
});


function tabViewTermTransformFxn(field, term, allowJSX){
    return Schemas.Term.toName(field, term, typeof allowJSX === 'boolean' ? allowJSX : true);
}

const DetailsTabView = React.memo(function DetailsTabView(props){
    return (
        <div className="container-wide">
            <h3 className="tab-section-title">
                <span>Details</span>
            </h3>
            <hr className="tab-section-title-horiz-divider mb-05"/>
            <ItemDetailList {..._.pick(props, 'context', 'schemas', 'href')} termTransformFxn={tabViewTermTransformFxn}  />
        </div>
    );
});

DetailsTabView.getTabObject = function(props){
    return {
        'tab' : (
            <React.Fragment>
                <i className="icon fas icon-list icon-fw"/>
                <span>Details</span>
            </React.Fragment>
        ),
        'key' : 'details',
        'content' : <DetailsTabView {...props} />,
        'cache' : false
    };
};


/**
 * Renders out a list of ExpandableStaticHeader components to represent
 * `context.static_headers`.
 */

export const StaticHeadersArea = React.memo(function StaticHeaderArea({ context }){
    const headersFromStaticContent = _.pluck(_.filter(
        context.static_content || [],
        function(s){ return s.location === 'header'; }
    ), 'content');
    const headersToShow = _.uniq(_.filter(
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
            { _.map(headersToShow, function(section, i){
                const { title, options = {}, name } = section;
                return (
                    <ExpandableStaticHeader
                        title={title || 'Informational Notice ' + (i + 1)}
                        context={section}
                        defaultOpen={options.default_open || false} key={name || i} index={i}
                        titleIcon={options.title_icon} />
                );
            })}
            <hr />
        </div>
    );
});

function itemAttachmentFileName(item){
    return (item && item.attachment && item.attachment.download) || object.itemUtil.getTitleStringFromContext(item) || null;
}

/** Used in OverViewBodyItem.titleRenderPresets */
const EmbeddedItemWithAttachment = React.memo(function EmbeddedItemWithAttachment({ item, index }){
    const linkToItem = object.itemUtil.atId(item);
    const isInArray = typeof index === 'number';

    if (!item || !linkToItem) return null;

    const { attachment = null } = item;
    const { href: attachmentHref = null, type: attachmentType = null } = attachment || {};
    const filename = itemAttachmentFileName(item);

    let viewAttachmentButton = null;
    if (attachmentHref){
        viewAttachmentButton = (
            <ViewFileButton title="File" mimeType={attachmentType} filename={filename}
                href={linkToItem + attachmentHref} disabled={!attachmentHref} className="text-ellipsis-container btn-block btn-sm btn-primary" />
        );
    }

    return (
        <div className={"embedded-item-with-attachment" + (isInArray ? ' in-array' : '')} key={linkToItem}>
            <div className="row">
                <div className={"col-12 col-sm-6 col-md-6 link-to-item-col" + (isInArray ? ' in-array' : '')} data-array-index={index}>
                    <div className="inner">
                        { isInArray ? <span>{ index + 1 }. </span> : null}{ object.itemUtil.generateLink(item, true) }
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-6 pull-right view-attachment-button-col">{ viewAttachmentButton }</div>
            </div>
        </div>
    );
});



const isAttachmentImage = memoize(function(filename){
    return commonFileUtil.isFilenameAnImage(filename);
});

/** Used in OverViewBodyItem.titleRenderPresets */
const EmbeddedItemWithImageAttachment = React.memo(function EmbeddedItemWithImageAttachment(props){
    const { item, index } = props;
    const linkToItem = object.itemUtil.atId(item);
    const isInArray = typeof index === 'number';

    if (!item || !linkToItem) return null;

    const { attachment = null } = item;
    const { href: attachmentHref = null, caption: attachmentCaption = null } = attachment || {};
    const filename = itemAttachmentFileName(item);

    if (!attachmentHref || !isAttachmentImage(filename)) return <EmbeddedItemWithAttachment {...props} />;

    const imageElem = (
        <a href={linkToItem} className="image-wrapper">
            <img className="embedded-item-image" src={linkToItem + attachmentHref} />
        </a>
    );

    const captionText = item.caption || item.description || attachmentCaption || filename;

    return (
        <div className={"embedded-item-with-attachment is-image" + (isInArray ? ' in-array' : '')} key={linkToItem}>
            <div className="inner">
                { imageElem }
                { captionText && <div className="caption">{ captionText }</div> }
            </div>
        </div>
    );
});



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
            return timestamp ? <LocalizedTime timestamp={timestamp} formatType="date-time-md" /> : null;
        },
        'local_date' : function(field, timestamp){
            return timestamp ? <LocalizedTime timestamp={timestamp} formatType="date-md" /> : null;
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
                    <div className="index-num col-2 mono-text text-500"><small>{ channel }</small></div>
                    <div className={"imaging-path col-" + (matchingFile ? '7' : '10')}>{ object.itemUtil.generateLink(path, true) }</div>
                    { matchingFile ? <div className="microscope-setting col-3 text-right" data-tip="Light Source Center Wavelength">{ fileUtil.getLightSourceCenterMicroscopeSettingFromFile(channel, matchingFile) }nm</div> : null }
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
        this.createList = memoize(OverViewBodyItem.createList);
    }

    render(){
        const {
            result, property, fallbackValue, titleRenderFxn, addDescriptionTipForLinkTos, wrapInColumn,
            singleItemClassName, overrideTitle, hideIfNoValue
        } = this.props;
        let { propertyForLabel, listItemElement, listWrapperElement, listItemElementProps, listWrapperElementProps } = this.props;

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
        const resultPropertyValue = property && this.createList(
            object.getNestedProperty(result, property),
            property,
            titleRenderFxn,
            addDescriptionTipForLinkTos,
            listItemElement,
            listItemElementProps,
            result
        );

        if (property && hideIfNoValue && (!resultPropertyValue || (Array.isArray(resultPropertyValue) && resultPropertyValue.length === 0))){
            return null;
        }

        let innerBlockReturned = null;
        propertyForLabel = propertyForLabel || property;

        if (Array.isArray(resultPropertyValue)){
            innerBlockReturned = (
                <div className="inner" key="inner" data-field={property}>
                    <object.TooltipInfoIconContainerAuto
                        {..._.pick(this.props, 'result', 'tips', 'schemas', 'fallbackTitle')}
                        property={propertyForLabel}
                        title={overrideTitle}
                        elementType="h5" />
                    { resultPropertyValue ?
                        (resultPropertyValue.length > 1 ?
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
    'defaultWrapClassName' : "col-6 col-md-4"
};
