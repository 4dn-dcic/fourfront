'use strict';

import React from 'react';
import { panel_views, itemClass } from './../globals';
import _ from 'underscore';
import { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow, Publications, AttributionTabView } from './components';
import { console, object, DateUtility, Filters } from './../util';

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

    render() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;

        return (
            <div className={this.itemClassName()}>

                { this.itemHeader() }

                <Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.produced_in_pub} />

                <div className="row">

                    <div className="col-xs-12 col-md-12 tab-view-container">

                        <TabbedView contents={this.getTabViewContents()} />

                    </div>

                </div>

                <ItemFooterRow context={context} schemas={schemas} />

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

panel_views.register(DefaultItemView, 'Item');
