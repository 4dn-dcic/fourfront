'use strict';

import React from 'react';
import _ from 'underscore';
import url from 'url';
import queryString from 'querystring';
import { console, DateUtility, Filters, Schemas } from './../../util';
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
 * <ItemHeader.Wrapper className="exp-set-header-area" context={this.props.context} href={this.props.href}>
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
        this.render = this.render.bind(this);
        this.parsedStatus = this.parsedStatus.bind(this);
        this.viewJSONButton = this.viewJSONButton.bind(this);
        this.itemActions = this.itemActions.bind(this);
        this.baseItemTypeInfo = this.baseItemTypeInfo.bind(this);
        this.typeInfoLabel = this.typeInfoLabel.bind(this);
        this.wrapChildren = this.wrapChildren.bind(this);
    }

    /**
     * Renders Item status and color indicator.
     *
     * @memberof module:item-pages/components.ItemHeader.TopRow
     * @private
     * @instance
     */
    parsedStatus(){
        if (!('status' in this.props.context)) return <div></div>;
        /*  Removed icon in lieu of color indicator for status
        var iconClass = null;
        switch (this.props.context.status){

            case 'in review by lab':
            case 'submission in progress':
                iconClass = 'icon ss-stopwatch';
                break;

        }
        */

        // Status colors are set via CSS (layout.scss) dependent on data-status attribute
        return (
            <div
                className="expset-indicator expset-status right"
                data-status={ this.props.context.status.toLowerCase() }
                data-tip="Current Status"
            >
                { this.props.context.status }
            </div>
        );
    }
    /**
     * Renders view JSON button.
     *
     * @memberof module:item-pages/components.ItemHeader.TopRow
     * @private
     * @instance
     * @returns {Element|null} <span> element, or null if no props.href.
     */
    viewJSONButton(){
        if (!this.props.href) return null;

        var urlParts = url.parse(this.props.href, true);
        urlParts.search = '?' + queryString.stringify(_.extend(urlParts.query, { 'format' : 'json' }));
        var viewUrl = url.format(urlParts);
        return (
            <div className="expset-indicator right view-ajax-button">
                <i className="icon icon-fw icon-file-code-o"/> <a 
                    href={viewUrl}
                    className="inline-block"
                    target="_blank"
                    data-tip="Open raw JSON in new window"
                    onClick={(e)=>{
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
     *
     * @memberof module:item-pages/components.ItemHeader.TopRow
     * @private
     * @instance
     */
    itemActions(){
        if (!Array.isArray(this.props.context.actions) || this.props.context.actions.length === 0) return null;
        return this.props.context.actions.map(function(action, i){
            var title = action.title;
            return (
                <div className="expset-indicator right action-button" data-action={action.name || null} key={action.name || i}>
                    <a href={action.href}>{ title }</a>
                </div>
            );
        });
    }

    /**
     * @memberof module:item-pages/components.ItemHeader.TopRow
     * @private
     * @instance
     */
    baseItemTypeInfo(){
        var baseItemType = Schemas.getBaseItemType(this.props.context);
        var itemType = Schemas.getItemType(this.props.context);
        if (itemType === baseItemType) return null;

        return Schemas.getSchemaForItemType(
            baseItemType,
            this.props.schemas || null
        );
    }

    typeInfoLabel(typeInfo = null){
        if (!typeInfo) typeInfo = this.baseItemTypeInfo();
        if (!typeInfo || !typeInfo.title) return null;

        return (
            <span className="type-info inline-block" data-tip={typeInfo.description}>
                { typeInfo.title }
            </span>
        );
    }

    /**
     * Wraps props.children in a <div> element.
     *
     * @memberof module:item-pages/components.ItemHeader.TopRow
     * @private
     * @instance
     */
    wrapChildren(){
        if (!this.props.children) return null;
        return React.Children.map(this.props.children, (child,i) =>
            <div
                className="expset-indicator expset-type right"
                title={this.props.title || null}
                key={i}
            >
                { child }
            </div>
        );
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
        var typeInfo = Schemas.getSchemaForItemType(Schemas.getItemType(this.props.context), this.props.schemas || null);
        var accessionTooltip = "Accession";
        if (typeInfo && typeInfo.properties.accession && typeInfo.properties.accession.description){
            accessionTooltip += ': ' + typeInfo.properties.accession.description;
        }

        //if (accessionTooltip){
        //    accessionTooltip = <i className="icon icon-info-circle inline-block" data-tip={accessionTooltip} />;
        //}
        return (
            <div className="row clearfix top-row">
                <h5 className="col-sm-5 item-label-title">
                    { this.typeInfoLabel(this.props.typeInfo || null) }
                    { this.props.context.accession ?
                        <span className="accession inline-block" data-tip={accessionTooltip}>{ this.props.context.accession }</span>
                    : null }
                </h5>
                <h5 className="col-sm-7 text-right text-left-xs item-label-extra text-capitalize item-header-indicators clearfix">
                    { this.viewJSONButton() }
                    { this.itemActions() }
                    { this.wrapChildren() }
                    { this.parsedStatus() }
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

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render(){
        var isTextShort = false;
        if (typeof this.props.context.description === 'string' && this.props.context.description.length <= 120){
            isTextShort = true;
        }
        return (
            <FlexibleDescriptionBox
                description={ this.props.context.description || <em>No description provided.</em> }
                className="item-page-heading experiment-heading"
                textClassName={ isTextShort ? "text-larger" : "text-large" }
                fitTo="grid"
                dimensions={{
                    paddingWidth : 32,
                    paddingHeight : 22,
                    buttonWidth : 30,
                    initialHeight : 45
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
export class BottomRow extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.parsedCreationDate = this.parsedCreationDate.bind(this);
    }

    parsedCreationDate(){
        if (!('date_created' in this.props.context)) return <span><i></i></span>;
        return (
            <span data-tip="Date Created" className="inline-block">
                <i className="icon sbt-calendar"></i>&nbsp;&nbsp;
                <DateUtility.LocalizedTime timestamp={this.props.context.date_created} formatType='date-time-md' dateTimeSeparator=" at " />
            </span>
        );
    }

    render(){
        return (
            <div className="row clearfix bottom-row">
                <div className="col-sm-6 item-label-extra set-type-indicators">{ this.props.children }</div>
                <h5 className="col-sm-6 text-right text-left-xs item-label-extra" title="Date Added - UTC/GMT">{ this.parsedCreationDate() }</h5>
            </div>
        );
    }

}

/**
 * Use this to wrap ItemHeader.TopRow, .MiddleRow, and .BottomRow to create a complete ItemHeader.
 * Passes own props.context and props.href down to children.
 *
 * @memberof module:item-pages/components.ItemHeader
 * @namespace
 * @type {Component}
 * @prop {Object} context - Same as the props.context passed to parent ItemHeader component.
 * @prop {string} href - Location from Redux store or '@id' of current Item. Used for View JSON button.
 * @prop {Object} schemas - Pass from app.state. Used for tooltips and such.
 */
export class Wrapper extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.adjustChildren = this.adjustChildren.bind(this);
    }

    adjustChildren(){
        if (!this.props.context) return this.props.children;
        return React.Children.map(this.props.children, (child)=>{
            if (typeof child.props.context !== 'undefined' && typeof child.props.href === 'string') return child;
            else {
                return React.cloneElement(child, {
                    context : this.props.context,
                    href : this.props.href,
                    schemas : this.props.schemas || (Schemas.get && Schemas.get()) || null
                }, child.props.children);
            }
        });
    }

    render(){
        return (
            <div className={"item-view-header " + (this.props.className || '')}>{ this.adjustChildren() }</div>
        );
    }

}
