'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { itemClass, panel_views, content_views } from './../globals';
import _ from 'underscore';
import { 
    ItemPageTitle, ItemHeader, ItemDetailList, TabbedView, AuditTabView, AttributionTabView,
    ExternalReferenceLink, FilesInSetTable, FormattedInfoBlock, WorkflowDetailPane,
    WorkflowNodeElement
} from './components';
import { ItemBaseView } from './DefaultItemView';
import { console, object, DateUtility, Schemas, isServerSide, navigate, layout } from './../util';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps, DEFAULT_PARSING_OPTIONS } from './../viz/Workflow';
import { requestAnimationFrame } from './../viz/utilities';
import { DropdownButton, MenuItem, Checkbox, Button, Collapse } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';



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
        'renderDetailPane' : function(selectedNode, paneProps){
            return <WorkflowDetailPane {...paneProps} schemas={props.schemas} context={props.context} selectedNode={selectedNode} legendItems={props.legendItems} />;
        },
        'renderNodeElement' : function(node, graphProps){
            return <WorkflowNodeElement {...graphProps} schemas={props.schemas} node={node}/>;
        },
        'rowSpacingType' : 'wide',
        'nodeClassName' : null,
        'onNodeClick' : typeof props.onNodeClick !== 'undefined' ? props.onNodeClick : onItemPageNodeClick,
        'checkHrefForSelectedNode' : typeof props.checkHrefForSelectedNode === 'boolean' ? props.checkHrefForSelectedNode : true,
        'checkWindowLocationHref' : typeof props.checkWindowLocationHref === 'boolean' ? props.checkWindowLocationHref : true
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


/**
 * @export
 * @class WorkflowView
 * @memberof module:item-pages
 * @extends module:item-pages/DefaultItemView.ItemBaseView
 */
export class WorkflowView extends ItemBaseView {

    static defaultProps = {
        'checkHrefForSelectedNode' : true,
        'checkWindowLocationHref' : true
    }

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

        var listWithGraph = !doValidAnalysisStepsExist(this.props.context.steps) ? [] : [
            {
                tab : <span><i className="icon icon-sitemap icon-fw"/> Graph</span>,
                key : 'graph',
                content : <WorkflowGraphSection {...this.props} mounted={this.state.mounted} />
            }
        ];

        return listWithGraph.concat([
            AttributionTabView.getTabObject(this.props.context),
            ItemDetailList.getTabObject(this.props.context, this.props.schemas),
            AuditTabView.getTabObject(this.props.context)
        ]).map((tabObj)=>{ // Common properties
            return _.extend(tabObj, {
                'style' : { minHeight : Math.max(this.state.mounted && !isServerSide() && (window.innerHeight - 180), 100) || 800 }
            });
        });
    }

    typeInfo(){
        return { 'title' : this.props.context.workflow_type, description : 'Type of Workflow' };
    }

}


export class WorkflowGraphSectionControls extends React.Component {

    static analysisStepsSet(context){
        if (!Array.isArray(context.steps)) return false;
        if (context.steps.length === 0) return false;
        return true;
    }

    static keyTitleMap = {
        'detail' : 'Analysis Steps',
        'basic' : 'Basic Inputs & Outputs',
        'cwl' : 'CWL Graph'
    }

    constructor(props){
        super(props);
        this.toggleOpenMenu = this.toggleOpenMenu.bind(this);
        this.state = { 'open' : false, 'mounted' : false };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    chartTypeDropdown(){
        var detail = WorkflowGraphSectionControls.analysisStepsSet(this.props.context) ? (
            <MenuItem eventKey='detail' active={this.props.showChartType === 'detail'}>
                Analysis Steps
            </MenuItem>
        ) : null;
    
        var basic = (
            <MenuItem eventKey='basic' active={this.props.showChartType === 'basic'}>
                Basic Inputs & Outputs
            </MenuItem>
        );

        return (
            <div className="inline-block for-state-showChart" key="chart-type-dropdown">
                <DropdownButton
                    id="detail-granularity-selector"
                    pullRight
                    onSelect={this.props.onChangeShowChartType}
                    title={WorkflowGraphSectionControls.keyTitleMap[this.props.showChartType]}
                >
                    { basic }{ detail }
                </DropdownButton>
            </div>
        );
    }

    rowSpacingTypeDropdown(){
        if (typeof this.props.rowSpacingType !== 'string' || typeof this.props.onChangeRowSpacingType !== 'function') {
            return null;
        }
        return (
            <div className="inline-block" key="rowspacing-dropdown-block for-state-rowSpacingType">
                <RowSpacingTypeDropdown currentKey={this.props.rowSpacingType} onSelect={this.props.onChangeRowSpacingType}/>
            </div>
        );
    }

    fullScreenButton(){
        var { fullscreenViewEnabled, onToggleFullScreenView } = this.props;
        if( typeof fullscreenViewEnabled === 'boolean' && typeof onToggleFullScreenView === 'function'){
            return (
                <div className="inline-block for-state-fullscreenViewEnabled" key="toggle-fullscreen">
                    <Button onClick={onToggleFullScreenView} data-tip={!fullscreenViewEnabled ? 'Expand to full screen' : null}>
                        <i className={"icon icon-fw icon-" + (!fullscreenViewEnabled ? 'arrows-alt' : 'crop')}/>
                    </Button>
                </div>
            );
        }
        return null;
    }

    parametersCheckbox(){
        if (typeof this.props.showParameters !== 'boolean' || typeof this.props.onToggleShowParameters !== 'function'){
            return null;
        }
        return (
            <div className="inline-block checkbox-container for-state-showParameters" key="show-params">
                <Checkbox checked={this.props.showParameters} onChange={this.props.onToggleShowParameters}>
                    Show Parameters
                </Checkbox>
            </div>
        );
    }

    referenceFilesCheckbox(){
        if (typeof this.props.showReferenceFiles !== 'boolean' || typeof this.props.onToggleReferenceFiles !== 'function') return null;
        return (
            <div className="inline-block checkbox-container for-state-showReferenceFiles" key="show-reference-files">
                <Checkbox checked={this.props.showReferenceFiles} onChange={this.props.onToggleReferenceFiles}>
                    Show Reference Files
                </Checkbox>
            </div>
        );
    }

    toggleOpenMenu(){
        this.setState({ 'open' : !this.state.open });
    }

    /**
     * @param {...JSX.Element} element - Element(s) to wrap in controls wrapper.
     * @returns {JSX.Element} Workflow Controls Element.
     */
    wrapper(element){
        var isOpen = (this.state.mounted && layout.responsiveGridState() === 'lg') || this.state.open;
        return (
            <div className="pull-right workflow-view-controls-container">
                <Collapse in={isOpen}>
                    <div className="inner-panel">
                        {[...arguments]}
                    </div>
                </Collapse>
                <div className="inner-panel constant-panel pull-right">
                    <div className="inline-block">
                        <Button className="hidden-lg toggle-open-button" onClick={this.toggleOpenMenu}>
                            <i className={"icon icon-fw icon-" + (isOpen ? 'angle-up' : 'ellipsis-v')}/>&nbsp; Options&nbsp;
                        </Button>
                    </div>
                    { this.fullScreenButton() }
                </div>
            </div>
        );
    }

    render(){
        return this.wrapper(this.referenceFilesCheckbox(), this.parametersCheckbox(), this.chartTypeDropdown(), this.rowSpacingTypeDropdown());
    }
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




export class WorkflowGraphSection extends React.Component {

    constructor(props){
        super(props);
        this.commonGraphProps = this.commonGraphProps.bind(this);
        this.basicGraph = this.basicGraph.bind(this);
        this.detailGraph = this.detailGraph.bind(this);
        this.body = this.body.bind(this);
        this.parseAnalysisSteps = this.parseAnalysisSteps.bind(this);
        this.onToggleShowParameters     = _.throttle(this.onToggleShowParameters.bind(this), 250);
        this.onToggleReferenceFiles     = _.throttle(this.onToggleReferenceFiles.bind(this), 250);
        this.onChangeRowSpacingType     = _.throttle(this.onChangeRowSpacingType.bind(this), 250, { trailing : false });
        this.onChangeShowChartType      = _.throttle(this.onChangeShowChartType.bind(this), 250, { trailing : false });
        this.onToggleFullScreenView     = _.throttle(this.onToggleFullScreenView.bind(this), 250, { trailing : false });
        this.render = this.render.bind(this);
        this.state = {
            'showChart' : WorkflowGraphSectionControls.analysisStepsSet(props.context) ? 'detail' : 'basic',
            'showParameters' : false,
            'showReferenceFiles' : false,
            'rowSpacingType' : 'compact',
            'fullscreenViewEnabled' : false
        };
    }

    componentWillUnmount(){
        if (this.state.fullscreenViewEnabled){
            layout.toggleBodyClass('is-full-screen', false);
        }
    }

    parseAnalysisSteps(context = this.props.context){
        var opts = _.extend({}, DEFAULT_PARSING_OPTIONS, _.pick(this.state, 'showReferenceFiles', 'showParameters'));
        return (
            this.state.showChart === 'basic' ?
                parseBasicIOAnalysisSteps(context.steps, context, opts)
                :
                parseAnalysisSteps(context.steps, opts)
        );
    }

    commonGraphProps(){
        var graphData = this.parseAnalysisSteps();
        
        // Filter out legend items which aren't relevant for this context.
        var keepItems = ['Input File', 'Output File', 'Input Reference File'];
        if (this.state.showParameters){
            keepItems.push('Input Parameter');
        }
        if (this.state.showReferenceFiles){
            keepItems.push('Input Reference File');
        }
        keepItems.push('Intermediate File');
        var legendItems = _.pick(WorkflowDetailPane.Legend.defaultProps.items, keepItems);
        var commonGraphProps = commonGraphPropsFromProps(_.extend({ 'legendItems' : legendItems }, this.props));

        return _.extend(commonGraphProps, this.parseAnalysisSteps(), {'rowSpacingType' : this.state.rowSpacingType });
    }

    basicGraph(){
        if (!Array.isArray(this.props.context.steps)) return null;
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
        if (!Array.isArray(this.props.context.steps)) return null;
        return <Graph { ...this.commonGraphProps() } />;
    }
    

    onToggleShowParameters(){
        this.setState({ 'showParameters' : !this.state.showParameters });
    }

    onToggleReferenceFiles(){
        this.setState({ 'showReferenceFiles' : !this.state.showReferenceFiles });
    }

    onChangeRowSpacingType(eventKey, evt){
        requestAnimationFrame(()=>{
            if (eventKey === this.state.rowSpacingType) return;
            this.setState({ 'rowSpacingType' : eventKey });
        });
    }

    onChangeShowChartType(eventKey, evt){
        requestAnimationFrame(()=>{
            if (eventKey === this.state.showChart) return;
            this.setState({ 'showChart' : eventKey });
        });
    }

    onToggleFullScreenView(){
        requestAnimationFrame(()=>{
            var willBeFullscreen = !this.state.fullscreenViewEnabled;
            layout.toggleBodyClass('is-full-screen', willBeFullscreen);
            this.setState({ 'fullscreenViewEnabled' : willBeFullscreen }, ()=>{
                ReactTooltip.rebuild();
            });
        });
    }

    body(){
        /* if (this.state.showChart === 'cwl') return this.cwlGraph(); */
        if (this.state.showChart === 'detail') return this.detailGraph();
        if (this.state.showChart === 'basic') return this.basicGraph();
        return null;
    }

    render(){

        return (
            <div ref="container" className={"workflow-view-container workflow-viewing-" + (this.state.showChart) + (this.state.fullscreenViewEnabled ? ' full-screen-view' : '')}>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    <WorkflowGraphSectionControls
                        {..._.pick(this.props, 'context', 'href')}
                        showChartType={this.state.showChart}
                        rowSpacingType={this.state.rowSpacingType}
                        showParameters={this.state.showParameters}
                        showReferenceFiles={this.state.showReferenceFiles}
                        onChangeShowChartType={this.onChangeShowChartType}
                        onChangeRowSpacingType={this.onChangeRowSpacingType}
                        onToggleShowParameters={this.onToggleShowParameters}
                        onToggleReferenceFiles={this.onToggleReferenceFiles}
                        fullscreenViewEnabled={this.state.fullscreenViewEnabled}
                        onToggleFullScreenView={this.onToggleFullScreenView}
                    />
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { this.body() }
            </div>
        );

    }

}


content_views.register(WorkflowView, 'Workflow');
