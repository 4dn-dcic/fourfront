'use strict';

import React from 'react';
import { panel_views, itemClass } from './../globals';
import _ from 'underscore';
import { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow } from './components';
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
        this.componentDidMount = this.componentDidMount.bind(this);
        this.getDetailAndAuditsTabs = this.getDetailAndAuditsTabs.bind(this);
        this.renderAttributionColumn = this.renderAttributionColumn.bind(this);
        this.state = {};
    }

    componentDidMount(){
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'lab', this.props.context.lab);
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'award', this.props.context.award);
        FormattedInfoBlock.onMountMaybeFetch.call(this, 'submitted_by', this.props.context.submitted_by);
    }

    getDetailAndAuditsTabs(){
        return [
            ItemDetailList.getTabObject(this.props.context, this.props.schemas),
            AuditTabView.getTabObject(this.props.context)
        ];
    }

    renderAttributionColumn(className = "col-xs-12 col-md-4"){
        var context = this.props.context;
        return (
            <div className={className + " item-info-area section"}>

                { typeof context.lab !== 'undefined' || typeof context.award !== 'undefined' ?
                <hr/>
                : null }

                { typeof context.submitted_by !== 'undefined' && ((this.state && typeof this.state.details_submitted_by !== 'undefined') || context.submitted_by) ?
                <div>
                    { FormattedInfoBlock.User(
                        this.state && typeof this.state.details_submitted_by !== 'undefined' ?
                        this.state.details_submitted_by : context.submitted_by
                    ) }
                    { typeof context.lab !== 'undefined' ? <hr/> : null }
                </div>
                : null }

                
                { typeof context.lab !== 'undefined' ?
                <div className>
                    { FormattedInfoBlock.Lab(
                        this.state && typeof this.state.details_lab !== 'undefined' ?
                        this.state.details_lab : context.lab
                    ) }
                    { typeof context.award !== 'undefined' ? <hr/> : null }
                </div>
                : null }

                { typeof context.award !== 'undefined' ?
                <div className>
                    { FormattedInfoBlock.Award(
                        this.state && typeof this.state.details_award !== 'undefined' ?
                        this.state.details_award : context.award
                    ) }
                </div>
                : null }

            </div>
        );
    }

    render(){
        return null;
    }

}

/**
 * @alias module:item-pages/DefaultItemView
 */
export default class DefaultItemView extends ItemBaseView {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
    }

    topRightHeaderSection(){
        var r = [];
        // TODO: EDIT ACTIONS
        return r;
    }

    getTabViewContents(){
        return this.getDetailAndAuditsTabs();
    }

    render() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;
        var itemClassName = itemClass(this.props.context, 'view-detail item-page-container');

        return (
            <div className={itemClassName}>

                <ItemPageTitle context={context} schemas={schemas} />
                <ItemHeader.Wrapper context={context} className="exp-set-header-area" href={this.props.href} schemas={this.props.schemas}>
                    <ItemHeader.TopRow>{ this.topRightHeaderSection() || null }</ItemHeader.TopRow>
                    <ItemHeader.MiddleRow />
                    <ItemHeader.BottomRow />
                </ItemHeader.Wrapper>

                <div className="row">

                    <div className="col-xs-12 col-md-8 tab-view-container">

                        <TabbedView contents={this.getTabViewContents()} />

                    </div>

                    { this.renderAttributionColumn() }

                </div>

                <ItemFooterRow context={context} schemas={schemas} />

            </div>
        );
    }

}

panel_views.register(DefaultItemView, 'Item');
