'use strict';

var React = require('react');
var globals = require('./../globals');
var _ = require('underscore');
var { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, AttributionTabView, ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow } = require('./components');
import { ItemBaseView } from './DefaultItemView';
import { getTabForAudits } from './item';
var { console, object, DateUtility, Filters } = require('./../util');
import { CWLGraph } from './../viz/Workflow';



/**
 * @export
 * @class WorkflowView
 * @memberof module:item-pages
 * @extends module:item-pages/DefaultItemView.ItemBaseView
 */
export class WorkflowView extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
    }

    getTabViewContents(){
        return [
            {
                tab : <span><i className="icon icon-code-fork icon-fw"/> Graph</span>,
                key : 'graph',
                content : (
                    <div>
                        <h3 className="tab-section-title">
                            <span>Graph</span>
                        </h3>
                        <hr className="tab-section-title-horiz-divider"/>
                        <CWLGraph /*CWLURI={this.props.context.cwl_pointer}*/ />
                    </div>
                )
            },
            AttributionTabView.getTabObject(this.props.context),
            ItemDetailList.getTabObject(this.props.context, this.props.schemas),
            AuditTabView.getTabObject(this.props.context)
        ];
    }

    render() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container');

        return (
            <div className={itemClass}>

                <ItemPageTitle context={context} />
                <ItemHeader.Wrapper context={context} className="exp-set-header-area" href={this.props.href} schemas={this.props.schemas}>
                    <ItemHeader.TopRow typeInfo={{ title : context.workflow_type, description : 'Workflow Type' }} />
                    <ItemHeader.MiddleRow />
                    <ItemHeader.BottomRow />
                </ItemHeader.Wrapper>

                <br/>

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


globals.panel_views.register(WorkflowView, 'Workflow');
