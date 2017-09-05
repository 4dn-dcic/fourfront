'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { itemClass, panel_views } from './../globals';
import _ from 'underscore';
import { 
    ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, AttributionTabView,
    ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, ItemFooterRow, WorkflowDetailPane,
    WorkflowNodeElement
} from './components';
import { ItemBaseView } from './DefaultItemView';
import { console, object, DateUtility, Schemas, isServerSide, navigate } from './../util';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps } from './../viz/Workflow';
import { requestAnimationFrame } from './../viz/utilities';
import { DropdownButton, MenuItem, Checkbox } from 'react-bootstrap';


/**
 * For when "Show Parameters" UI setting === false.
 * 
 * @param {Object}      graphData 
 * @param {Object[]}    graphData.nodes
 * @param {Object[]}    graphData.edges
 * @returns {Object}    Copy of graphData with 'parameters' nodes and edges filtered out.
 */
export function filterOutParametersFromGraphData(graphData){
    var deleted = {  };
    var nodes = _.filter(graphData.nodes, function(n, i){
        if (n.type === 'input' && n.format === 'Workflow Parameter') {
            deleted[n.id] = true;
            return false;
        }
        return true;
    });
    var edges = _.filter(graphData.edges, function(e,i){
        if (deleted[e.source.id] === true || deleted[e.target.id] === true) {
            return false;
        }
        return true;
    });
    return { nodes, edges };
}


export function filterOutReferenceFilesFromGraphData(graphData){
    var deleted = {  };
    var nodes = _.filter(graphData.nodes, function(n, i){

        if (n && n.meta && n.meta.run_data && n.meta.run_data.file && Array.isArray(n.meta.run_data.file['@type'])){

            if (n.meta.run_data.file['@type'].indexOf('FileReference') > -1) {
                deleted[n.id] = true;
                return false;
            }

        }

        return true;
    });
    var edges = _.filter(graphData.edges, function(e,i){
        if (deleted[e.source.id] === true || deleted[e.target.id] === true) {
            return false;
        }
        return true;
    });
    return { nodes, edges };
}

/**
 * Pass this to props.onNodeClick for Graph.
 * 
 * @export
 * @param {Object} node - Node clicked on.
 * @param {Object|null} selectedNode - Node currently selected, if any.
 * @param {MouseEvent} evt - onClick MouseEvent.
 */
export function onItemPageNodeClick(node, selectedNode, evt){
    var navOpts = { 'inPlace' : true, 'skipRequest' : true, 'replace' : true };
    if (node !== selectedNode){
        navigate('#' + (node.id || node.name), navOpts);
    } else {
        navigate('#', navOpts);
    }
}

export function commonGraphPropsFromProps(props){
    return {
        'href'        : props.href,
        'onNodeClick' : onItemPageNodeClick,
        'detailPane'  : <WorkflowDetailPane schemas={props.schemas} context={props.context} />,
        'nodeElement' : <WorkflowNodeElement schemas={props.schemas} />,
        'rowSpacingType' : 'wide',
        'nodeClassName' : function(node){
            var file = (
                node.meta.run_data && node.meta.run_data.file
                && typeof node.meta.run_data.file !== 'string' && !Array.isArray(node.meta.run_data.file)
                && node.meta.run_data.file
            );

            if (file && Array.isArray(file['@type'])){
                if (file['@type'].indexOf('FileReference') > -1){
                    return 'node-item-type-file-reference';
                }
            }
            return '';
        },
    };
}

/** Optional check to ensure steps are there and properly formatted */
export function doValidAnalysisStepsExist(steps){
    if (
        !Array.isArray(steps) ||
        steps.length === 0 ||
        !Array.isArray(steps[0].inputs) ||
        !Array.isArray(steps[0].outputs)
    ) {
        console.warn("Analysis Steps are in an improper format. Make sure they exist and contain 'inputs' and 'outputs");
        return false;
    }
    return true;
}

export function parseAnalysisStepsMixin(){
    var graphData = (
        this.state.showChart === 'basic' ?
            parseBasicIOAnalysisSteps(this.props.context.analysis_steps, this.props.context)
            :
            parseAnalysisSteps(this.props.context.analysis_steps)
    );
    if (this.state.showParameters) return graphData;
    else return filterOutParametersFromGraphData(graphData);
}


/**
 * @export
 * @class WorkflowView
 * @memberof module:item-pages
 * @extends module:item-pages/DefaultItemView.ItemBaseView
 */
export class WorkflowView extends ItemBaseView {

    constructor(props){
        super(props);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        this.state = {
            mounted : false
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    getTabViewContents(){

        var listWithGraph = !doValidAnalysisStepsExist(this.props.context.analysis_steps) ? [] : [
            {
                tab : <span><i className="icon icon-code-fork icon-fw"/> Graph</span>,
                key : 'graph',
                content : <GraphSection {...this.props} mounted={this.state.mounted} />
            }
        ];

        return listWithGraph.concat([
            AttributionTabView.getTabObject(this.props.context),
            ItemDetailList.getTabObject(this.props.context, this.props.schemas),
            AuditTabView.getTabObject(this.props.context)
        ]).map((tabObj)=>{ // Common properties
            return _.extend(tabObj, {
                'style' : { minHeight : Math.max(this.state.mounted && !isServerSide() && (window.innerHeight - 180), 100) || 650 }
            });
        });
    }

    itemHeader(){
        var context = this.props.context;
        return (
            <ItemHeader.Wrapper context={context} className="exp-set-header-area" href={this.props.href} schemas={this.props.schemas}>
                <ItemHeader.TopRow typeInfo={{ title : context.workflow_type, description : 'Workflow Type' }} />
                <ItemHeader.MiddleRow />
                <ItemHeader.BottomRow />
            </ItemHeader.Wrapper>
        );
    }

}


export function dropDownMenuMixin(){
    
    var detail = GraphSection.analysisStepsSet(this.props.context) ? (
        <MenuItem eventKey='detail' active={this.state.showChart === 'detail'}>
            Analysis Steps
        </MenuItem>
    ) : null;

    var basic = (
        <MenuItem eventKey='basic' active={this.state.showChart === 'basic'}>
            Basic Inputs & Outputs
        </MenuItem>
    );


    return (
        <DropdownButton
            pullRight
            onSelect={(eventKey, evt)=>{
                requestAnimationFrame(()=>{
                    if (eventKey === this.state.showChart) return;
                    this.setState({ showChart : eventKey });
                });
            }}
            title={GraphSection.keyTitleMap[this.state.showChart]}
        >
            { basic }{ detail }
        </DropdownButton>
    );
}

export const onShowParametersCheckboxChangeMixin = _.throttle(function(){
    this.setState({ showParameters : !this.state.showParameters });
}, 500, { trailing : false });

export function uiControlsMixin(){
    return (
        <div className="pull-right workflow-view-controls-container">
            <div className="inline-block show-params-checkbox-container">
                <Checkbox checked={this.state.showParameters} onChange={onShowParametersCheckboxChangeMixin.bind(this)}>
                    Show Parameters
                </Checkbox>
            </div>
            <div className="inline-block">
                { dropDownMenuMixin.call(this) }
            </div>
            {' '}
            <div className="inline-block">
                <RowSpacingTypeDropdown currentKey={this.state.rowSpacingType} onSelect={(eventKey, evt)=>{
                    requestAnimationFrame(()=>{
                        if (eventKey === this.state.rowSpacingType) return;
                        this.setState({ rowSpacingType : eventKey });
                    });
                }}/>
            </div>
        </div>
    );
}

export function graphBodyMixin(){
    if (this.state.showChart === 'cwl') return this.cwlGraph();
    if (this.state.showChart === 'detail') return this.detailGraph();
    if (this.state.showChart === 'basic') return this.basicGraph();
    return null;
}



export class RowSpacingTypeDropdown extends React.Component {
    
    static propTypes = {
        'onSelect' : PropTypes.func.isRequired,
        'currentKey' : Graph.propTypes.rowSpacingType,
    }

    static rowSpacingTypeTitleMap = {
        'stacked' : 'Stack Nodes',
        'compact' : 'Center Nodes',
        'wide' : 'Spread Nodes'
    }

    render(){

        var currentKey = this.props.currentKey;

        var stacked = (
            <MenuItem eventKey='stacked' active={currentKey === 'stacked'}>
                { RowSpacingTypeDropdown.rowSpacingTypeTitleMap['stacked'] }
            </MenuItem>
        );
    
        var compact = (
            <MenuItem eventKey='compact' active={currentKey === 'compact'}>
                { RowSpacingTypeDropdown.rowSpacingTypeTitleMap['compact'] }
            </MenuItem>
        );

        var spread = (
            <MenuItem eventKey='wide' active={currentKey === 'wide'}>
                { RowSpacingTypeDropdown.rowSpacingTypeTitleMap['wide'] }
            </MenuItem>
        );
    
    
        return (
            <DropdownButton
                id={this.props.id || "rowspacingtype-select"}
                pullRight
                onSelect={this.props.onSelect}
                title={RowSpacingTypeDropdown.rowSpacingTypeTitleMap[currentKey]}
            >
                { stacked }{ compact }{ spread }
            </DropdownButton>
        );
    }

}




class GraphSection extends React.Component {

    static analysisStepsSet(context){
        if (!Array.isArray(context.analysis_steps)) return false;
        if (context.analysis_steps.length === 0) return false;
        return true;
    }

    constructor(props){
        super(props);
        this.commonGraphProps = this.commonGraphProps.bind(this);
        this.basicGraph = this.basicGraph.bind(this);
        this.detailGraph = this.detailGraph.bind(this);
        this.dropDownMenu = dropDownMenuMixin.bind(this);
        this.body = graphBodyMixin.bind(this);
        this.parseAnalysisSteps = parseAnalysisStepsMixin.bind(this);
        this.uiControls = uiControlsMixin.bind(this);
        this.render = this.render.bind(this);
        this.state = {
            'showChart' : GraphSection.analysisStepsSet(props.context) ? 'detail' : 'basic',
            'showParameters' : false,
            'rowSpacingType' : 'wide'
        };
    }

    commonGraphProps(){
        var graphData = this.parseAnalysisSteps();
        console.log('NODES', graphData.nodes);
        return _.extend(commonGraphPropsFromProps(this.props), this.parseAnalysisSteps(), { 'rowSpacingType' : this.state.rowSpacingType });
    }

    basicGraph(){
        if (!Array.isArray(this.props.context.analysis_steps)) return null;
        return (
            <Graph
                { ...this.commonGraphProps() }
                edgeStyle="curve"
                columnWidth={this.props.mounted && this.refs.container ?
                    (this.refs.container.offsetWidth - 180) / 3
                : 180}
            />
        );
    }

    detailGraph(){
        if (!Array.isArray(this.props.context.analysis_steps)) return null;
        return <Graph { ...this.commonGraphProps() } />;
    }

    static keyTitleMap = {
        'detail' : 'Analysis Steps',
        'basic' : 'Basic Inputs & Outputs',
        'cwl' : 'CWL Graph'
    }

    render(){

        return (
            <div ref="container" className={"workflow-view-container workflow-viewing-" + (this.state.showChart)}>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    { this.uiControls() }
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { this.body() }
            </div>
        );

    }

}


panel_views.register(WorkflowView, 'Workflow');
