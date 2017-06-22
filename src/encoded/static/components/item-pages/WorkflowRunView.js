'use strict';

import React from 'react';
import { itemClass, panel_views } from './../globals';
import _ from 'underscore';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import { ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, ItemFooterRow, WorkflowDetailPane } from './components';
import { ItemBaseView } from './DefaultItemView';
import { getTabForAudits } from './item';
import { console, object, DateUtility, Filters, isServerSide } from './../util';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps } from './../viz/Workflow';
import { commonGraphPropsFromProps, dropDownMenuMixin, graphBodyMixin } from './WorkflowView';



/**
 * @export
 * @class WorkflowRunView
 * @memberof module:item-pages
 * @extends module:item-pages/DefaultItemView.ItemBaseView
 */
export class WorkflowRunView extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        this.state = {
            mounted : false
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    getTabViewContents(){

        var listWithGraph = (
            !Array.isArray(this.props.context.analysis_steps) ||
            this.props.context.analysis_steps.length === 0
        ) ? [] : [
            {
                tab : <span><i className="icon icon-code-fork icon-fw"/> Graph & Summary</span>,
                key : 'graph',
                content : <GraphSection {...this.props} mounted={this.state.mounted} />
            }
        ];

        return listWithGraph.concat([
            ItemDetailList.getTabObject(this.props.context, this.props.schemas),
            AuditTabView.getTabObject(this.props.context)
        ]).map((tabObj)=>{ // Common properties
            return _.extend(tabObj, {
                'style' : { minHeight : Math.max(this.state.mounted && !isServerSide() && (window.innerHeight - 180), 100) || 650 }
            });
        });
    }

    render() {
        var schemas = this.props.schemas || {};
        var context = this.props.context;
        var ic = itemClass(this.props.context, 'view-detail item-page-container');

        return (
            <div className={ic}>

                <ItemPageTitle context={context} schemas={schemas} />
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

class GraphSection extends React.Component {

    static isNodeDisabled(node){
        if (node.type === 'step') return false;
        if (node && node.meta && node.meta.run_data){
            return false;
        }
        return true;
    }

    constructor(props){
        super(props);
        this.commonGraphProps = this.commonGraphProps.bind(this);
        this.basicGraph = this.basicGraph.bind(this);
        this.detailGraph = this.detailGraph.bind(this);
        this.dropDownMenu = dropDownMenuMixin.bind(this);
        this.body = graphBodyMixin.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'showChart' : 'detail'
        };
    }

    commonGraphProps(){
        return _.extend(commonGraphPropsFromProps(this.props), {
            'isNodeDisabled' : GraphSection.isNodeDisabled
        });
    }

    basicGraph(){
        if (!Array.isArray(this.props.context.analysis_steps)) return null;
        var graphData = parseBasicIOAnalysisSteps(this.props.context.analysis_steps, this.props.context);
        return (
            <Graph
                { ...this.commonGraphProps() }
                nodes={graphData.nodes}
                edges={graphData.edges}
                columnWidth={this.props.mounted && this.refs.container ?
                    (this.refs.container.offsetWidth - 180) / 3
                : 180}
            />
        );
    }

    detailGraph(){
        if (!Array.isArray(this.props.context.analysis_steps)) return null;
        var graphData = parseAnalysisSteps(this.props.context.analysis_steps);
        return (
            <Graph
                { ...this.commonGraphProps() }
                nodes={graphData.nodes}
                edges={graphData.edges}
            />
        );
    }

    static keyTitleMap = {
        'detail' : 'Analysis Steps',
        'basic' : 'Basic Inputs & Outputs',
    }

    render(){

        return (
            <div ref="container" className={"workflow-view-container workflow-viewing-" + (this.state.showChart)}>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    <span className="pull-right workflow-view-dropdown-container">
                        { this.dropDownMenu() }
                    </span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { this.body() }
            </div>
        );

    }

}

panel_views.register(WorkflowRunView, 'WorkflowRun');
panel_views.register(WorkflowRunView, 'WorkflowRunSbg');
