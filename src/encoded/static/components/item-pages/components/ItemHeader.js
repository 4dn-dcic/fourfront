'use strict';

import React from 'react';
import _ from 'underscore';
import url from 'url';
import queryString from 'querystring';
import { console, DateUtility, Schemas, object } from './../../util';
import { FlexibleDescriptionBox } from './FlexibleDescriptionBox';

/**
 * Object containing components required to build header shown on Item pages.
 * Includes title, description, date created, status, action buttons, [...].
 *
 * Use by combining other components together within an ItemHeader.Wrapper component. See example.
 *
 * @module
 * @type {Object}
 * @example
 * <ItemHeader.Wrapper className="something-or-other" context={this.props.context} href={this.props.href}>
 *     <ItemHeader.TopRow>
 *         <span data-tip="Experiment Type" className="inline-block">
 *             { this.props.context.experimentset_type }
 *         </span>
 *     </ItemHeader.TopRow>
 *     <ItemHeader.MiddleRow />
 *     <ItemHeader.BottomRow />
 * </ItemHeader.Wrapper>
 */


/**************
 * Components *
 **************/


/**
 * Use as first child within an ItemHeader component. Its props.children will be included in the top-right area.
 * Top right area also includes action buttions such as edit button or link, view json button, Item status, etc.
 *
 * @memberof module:item-pages/components.ItemHeader
 * @namespace
 * @type {Component}
 * @prop {Component|Element|string} children - Child React element or component, or string, to render in top-right area.
 * @prop {string} href - URL of current item for view JSON button.
 */
export class TopRow extends React.Component {

    constructor(props){
        super(props);
        this.parsedStatus = this.parsedStatus.bind(this);
        this.viewJSONButton = this.viewJSONButton.bind(this);
        this.itemActions = this.itemActions.bind(this);
        this.typeInfoLabel = this.typeInfoLabel.bind(this);
        this.wrapChildren = this.wrapChildren.bind(this);
    }

    /**
     * Renders Item status and color indicator.
     * Status colors are set via CSS (layout.scss) dependent on the `data-status` attribute.
     */
    parsedStatus(){
        const { context } = this.props;
        if (!context || !context.status) return <div/>;

        return (
            <div className="indicator-item item-status" data-status={ context.status.toLowerCase() } data-tip="Current Status">
                { context.status }
            </div>
        );
    }

    /**
     * Renders view JSON button.
     *
     * @returns {Element|null} <span> element, or null if no props.href.
     */
    viewJSONButton(){
        if (!this.props.href) return null;

        var urlParts = url.parse(this.props.href, true);
        urlParts.search = '?' + queryString.stringify(_.extend(urlParts.query, { 'format' : 'json' }));
        var viewUrl = url.format(urlParts);
        return (
            <div className="indicator-item view-ajax-button">
                <i className="icon icon-fw icon-file-code-o"/> <a href={viewUrl}
                    className="inline-block" target="_blank" rel="noreferrer noopener"
                    data-tip="Open raw JSON in new window" onClick={(e)=>{
                        if (window && window.open){
                            e.preventDefault();
                            window.open(viewUrl, 'window', 'toolbar=no, menubar=no, resizable=yes, status=no, top=10, width=400');
                        }
                    }}>
                    View JSON
                </a>
            </div>
        );
    }
    /**
     * Renders Item actions for admins and submitter.
     */
    itemActions(){
        var actions = this.props.context && this.props.context.actions;
        if (!Array.isArray(actions) || actions.length === 0) return null;
        var descriptions = {
            'edit'      : 'Edit the properties of this Item.',
            'create'    : 'Create a blank new Item of the same type.',
            'clone'     : 'Create and edit a copy of this Item.'
        };

        return _.map(actions, function(action, i){
            return (
                <div className="indicator-item action-button" data-action={action.name || null} key={action.name || i} data-tip={descriptions[action.name]}>
                    <a href={action.href}>{ action.title }</a>
                </div>
            );
        });
    }

    /**
     * Renders `props.typeInfo` if any passed in, otherwise attempts to render
     * out the abstract or parent type of what this Item is, if one exists that isn't
     * simply 'Item'.
     */
    typeInfoLabel(){
        const { typeInfo, context, schemas } = this.props;
        if (typeInfo && typeInfo.title){
            return (
                <span className="type-info inline-block" data-tip={(typeInfo && typeInfo.description) || null}>
                    { typeInfo && typeInfo.title }
                </span>
            );
        }

        var baseItemType = Schemas.getBaseItemType(context);
        var itemType = Schemas.getItemType(context);

        if (itemType === baseItemType) return null;

        const baseTypeInfo = Schemas.getSchemaForItemType(baseItemType, schemas || null);
        const title = (baseTypeInfo && baseTypeInfo.title) || baseItemType;
        const detailTypeInfo = Schemas.getSchemaForItemType(itemType, schemas || null);
        const detailTitle = (detailTypeInfo && detailTypeInfo.title && (detailTypeInfo.title + ' (\'' + itemType + '\')')) || itemType;

        return (
            <span className="type-info inline-block" data-tip={(baseTypeInfo ? 'Base' : 'Abstract') + " type of this " + detailTitle + " Item"}>
                { title }
            </span>
        );
    }

    /**
     * Wraps props.children in a <div> element.
     */
    wrapChildren(){
        const { children, title } = this.props;
        if (!children) return null;

        function wrap(child, idx = 0){
            return (
                <div className="indicator-item" title={title || null} key={child.key || idx}>
                    { child }
                </div>
            );
        }

        if (Array.isArray(children)){
            return React.Children.map(children, wrap);
        } else {
            return wrap(children);
        }
    }

    /**
     * Render function.
     *
     * @memberof module:item-pages/components.ItemHeader.TopRow
     * @private
     * @instance
     * @returns {*} Div element with .row Bootstrap class and items in top-right section.
     */
    render(){
        const { context, schemas } = this.props;

        const typeSchema = Schemas.getSchemaForItemType(Schemas.getItemType(context), schemas || null);

        let accessionTooltip = "Accession";
        if (typeSchema && typeSchema.properties.accession && typeSchema.properties.accession.description){
            accessionTooltip += ': ' + typeSchema.properties.accession.description;
        }

        return (
            <div className="row clearfix top-row">
                <h5 className="col-sm-5 item-label-title">
                    <div className="inner">
                        { this.typeInfoLabel() }
                        { context.accession ?
                            <object.CopyWrapper value={context.accession} className="accession inline-block" data-tip={accessionTooltip}
                                wrapperElement="span" iconProps={{ 'style' : { 'fontSize' : '0.875rem', 'marginLeft' : -3 } }}>
                                { context.accession }
                            </object.CopyWrapper>
                        : null }
                    </div>
                </h5>
                <h5 className="col-sm-7 text-right text-left-xs item-label-extra text-capitalize item-header-indicators clearfix">
                    { this.parsedStatus() }{ this.wrapChildren() }{ this.itemActions() }{ this.viewJSONButton() }
                </h5>
            </div>
        );
    }

}

/**
 * Renders a styled FlexibleDescriptionBox component containing props.context.description.
 *
 * @memberof module:item-pages/components.ItemHeader
 * @namespace
 * @type {Component}
 * @prop {Object} context - Same as the props.context passed to parent ItemHeader component.
 */
export class MiddleRow extends React.Component {

    shouldComponentUpdate(nextProps){
        if ((nextProps.context) && (!this.props.context || this.props.context.description !== nextProps.context.description)) return true;
        if (nextProps.windowWidth !== this.props.windowWidth) return true;
        return false;
    }

    render(){
        var description = (this.props.context && typeof this.props.context.description === 'string' && this.props.context.description) || null;

        if (!description){
            return <div className="item-page-heading no-description"/>;
        }

        return (
            <FlexibleDescriptionBox
                windowWidth={this.props.windowWidth}
                description={ description || <em>No description provided.</em> }
                className="item-page-heading"
                textClassName="text-medium"
                defaultExpanded={description.length < 600}
                fitTo="grid"
                lineHeight={22}
                dimensions={{
                    'paddingWidth' : 0,
                    'paddingHeight' : 22, // Padding-top + border-top
                    'buttonWidth' : 30,
                    'initialHeight' : 42
                }}
            />
        );
    }
}

/**
 * Renders props.context.date_created in bottom-right and props.children in bottom-left areas.
 *
 * @memberof module:item-pages/components.ItemHeader
 * @namespace
 * @type {Component}
 * @prop {Object} context - Same as the props.context passed to parent ItemHeader component.
 */
export class BottomRow extends React.PureComponent {

    constructor(props){
        super(props);
        this.parsedCreationDate = this.parsedDate.bind(this);
    }

    parsedDate(dateToUse){
        var context = this.props.context,
            tooltip = dateToUse === 'date_created' ? 'Date Created' : 'Date last modified';

        if (!dateToUse){
            return <span><i></i></span>;
        }
        return (
            <span data-tip={tooltip} className="inline-block">
                <i className="icon icon-calendar-o"></i>&nbsp; &nbsp;
                <DateUtility.LocalizedTime timestamp={context[dateToUse]} formatType='date-time-md' dateTimeSeparator=" at " />
            </span>
        );
    }

    render(){
        var { context, children } = this.props,
            dateToUse = null;

        if (typeof context.date_modified === 'string'){
            dateToUse = 'date_modified';
        } else if (typeof context.date_created === 'string'){
            dateToUse = 'date_created';
        }
        return (
            <div className="row clearfix bottom-row">
                <div className="col-sm-6 item-label-extra set-type-indicators">{ children }</div>
                <h5 className="col-sm-6 text-right text-left-xs item-label-extra">{ this.parsedDate(dateToUse) }</h5>
            </div>
        );
    }

}

/**
 * Use this to wrap ItemHeader.TopRow, .MiddleRow, and .BottomRow to create a complete ItemHeader.
 * Passes own props.context and props.href down to children.
 *
 * @prop {Object} context - Same as the props.context passed to parent ItemHeader component.
 * @prop {string} href - Location from Redux store or '@id' of current Item. Used for View JSON button.
 * @prop {Object} schemas - Pass from app.state. Used for tooltips and such.
 */
export class Wrapper extends React.PureComponent {

    constructor(props){
        super(props);
        this.adjustChildren = this.adjustChildren.bind(this);
    }

    /** Passes down own props to all children */
    adjustChildren(){
        var { context, href, schemas, children, windowWidth } = this.props;
        if (!context) return children;
        // We shouldn't ever receive a single Child.
        return React.Children.map(children, (child)=>
            React.cloneElement(child, { context, href, windowWidth, schemas })
        );
    }

    render(){
        const { context, className } = this.props;
        return (
            <div className={"item-view-header " + (className || '') + (!context.description ? ' no-description' : '')}>
                { this.adjustChildren() }
            </div>
        );
    }

}

