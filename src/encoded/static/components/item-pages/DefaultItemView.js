'use strict';

import React from 'react';
import { panel_views, itemClass, content_views } from './../globals';
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

    static createList(items, property, titleRenderFxn){
        if (Array.isArray(items) && items.length > 0 && items[0].display_title && object.atIdFromObject(items[0])){
            items = _.map(_.uniq(items, false, function(b){ return object.atIdFromObject(b); }), function(b){
                var link = null;
                if (typeof titleRenderFxn === 'function' && titleRenderFxn !== Schemas.Term.toName){
                    link = titleRenderFxn(property, b, true);
                } else { 
                    link = <a href={object.atIdFromObject(b)}>{ b.display_title }</a>;
                }
                if (items.length > 1){
                    return <li>{ link }</li>;
                }
                return link;
            });
        } else if (Array.isArray(items) && items.length > 1){
            items = _.map(items, function(b){
                return <li>{ titleRenderFxn(property, b, true) }</li>;
            });
        } else if (Array.isArray(items) && items.length === 1){
            items = titleRenderFxn(property, items[0], true);
        } else if (Array.isArray(items) && items.length === 0){
            return null;
        }
        return items;
    }

    static defaultProps = {
        'titleRenderFxn' : Schemas.Term.toName,
        'hideIfNoValue' : false,
        'wrapInColumn' : false
    }

    render(){
        var { result, property, fallbackValue, fallbackTitle, titleRenderFxn } = this.props;
        
        function fallbackify(val){
            return val || fallbackValue || 'None';
        }

        var resultPropertyValue = OverViewBodyItem.createList(object.getNestedProperty(result, property), property, titleRenderFxn);

        if (this.props.hideIfNoValue && (!resultPropertyValue || (Array.isArray(resultPropertyValue) && resultPropertyValue.length === 0))){
            return null;
        }

        var innerBlockReturned = null;

        if (Array.isArray(resultPropertyValue)){
            innerBlockReturned = (
                <div className="inner">
                    <object.TooltipInfoIconContainerAuto
                        {..._.pick(this.props, 'result', 'property', 'tips', 'schemas')}
                        fallbackTitle={fallbackTitle + (resultPropertyValue && resultPropertyValue.length > 1 ? 's' : '')}
                        elementType="h5"
                    />
                    { resultPropertyValue ? ( resultPropertyValue.length > 1 ? <ol>{ fallbackify(resultPropertyValue) }</ol> : fallbackify(resultPropertyValue) ) : fallbackify(null) }
                </div>
            );
        } else {
            innerBlockReturned = (
                <div className="inner">
                    <object.TooltipInfoIconContainerAuto {..._.pick(this.props, 'result', 'property', 'tips', 'fallbackTitle', 'schemas')} elementType="h5" />
                    <div>
                        { fallbackify(titleRenderFxn(property, resultPropertyValue, true)) }
                    </div>
                </div>
            );
        }

        if (this.props.wrapInColumn) return <div className="col-xs-6 col-md-4">{ innerBlockReturned }</div>;
        else return innerBlockReturned;

    }
}

