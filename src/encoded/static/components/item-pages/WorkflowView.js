'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';

import { console, object, navigate } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { ItemDetailList } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/ItemDetailList';
import { requestAnimationFrame } from '@hms-dbmi-bgm/shared-portal-components/src/components/viz/utilities';

import { WorkflowDetailPane } from './components/WorkflowDetailPane';
import { WorkflowNodeElement } from './components/WorkflowNodeElement';
import { WorkflowGraphSectionControls } from './components/WorkflowGraphSectionControls';
import DefaultItemView from './DefaultItemView';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps, DEFAULT_PARSING_OPTIONS } from './../viz/Workflow';



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

export function checkIfIndirectOrReferenceNodesExist(steps){
    var graphData = parseAnalysisSteps(steps, _.extend(
        {}, DEFAULT_PARSING_OPTIONS, { 'showIndirectFiles' : true, 'showReferenceFiles' : true }
    ));
    var anyIndirectPathIONodes = _.any(graphData.nodes, function(n){
        return (n.nodeType === 'output' && n.meta && n.meta.in_path === false);
    });
    var anyReferenceFileNodes = _.any(graphData.nodes, function(n){
        return (n.ioType === 'reference file');
    });
    return { anyIndirectPathIONodes, anyReferenceFileNodes };
}

export function commonGraphPropsFromProps(props){
    var graphProps = {
        'href'              : props.href,
        'renderDetailPane'  : function(selectedNode, paneProps){
            return (
                <WorkflowDetailPane {...paneProps} {..._.pick(props, 'schemas', 'context', 'legendItems', 'windowWidth')} selectedNode={selectedNode} />
            );
        },
        'renderNodeElement' : function(node, graphProps){
            return <WorkflowNodeElement {...graphProps} {..._.pick(props, 'schemas', 'windowWidth')} node={node}/>;
        },
        'rowSpacingType'    : 'wide',
        'nodeClassName'     : null,
        'onNodeClick'       : typeof props.onNodeClick !== 'undefined' ? props.onNodeClick : null,
        'windowWidth'       : props.windowWidth
    };

    if (props.isFullscreen) {
        graphProps.width = props.windowWidth - 40;
    } else if (props.width){
        graphProps.width = props.width;
    }

    return graphProps;
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


export default class WorkflowView extends DefaultItemView {

    constructor(props){
        super(props);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    getTabViewContents(){
        const { context, windowHeight } = this.props;
        const width   = this.getTabViewWidth();
        const tabs    = !doValidAnalysisStepsExist(context.steps) ? [] : [
            {
                tab : <span><i className="icon icon-sitemap icon-rotate-90 icon-fw"/> Graph</span>,
                key : 'graph',
                content : <WorkflowGraphSection {...this.props} mounted={this.state.mounted} width={width} />
            }
        ];

        return _.map(tabs.concat(this.getCommonTabs()), (tabObj) => // Common properties
            _.extend(tabObj, {
                'style' : { 'minHeight' : Math.max((this.state.mounted && windowHeight && windowHeight - 300) || 0, 600) }
            })
        );
    }

    typeInfo(){
        const { context } = this.props;
        const categories = Array.isArray(context.categories) && context.categories.length > 0 && context.categories;
        if (!categories) return null;
        return {
            'title'         : categories.join(', '),
            'description'   : (categories.length === 1 ? 'Workflow Category' : 'Workflow Categories')
        };
    }

}


export class WorkflowGraphSection extends React.PureComponent {

    constructor(props){
        super(props);
        this.commonGraphProps = this.commonGraphProps.bind(this);
        this.body = this.body.bind(this);
        this.parseAnalysisSteps = this.parseAnalysisSteps.bind(this);
        this.onToggleShowParameters     = _.throttle(this.onToggleShowParameters.bind(this), 1000);
        this.onToggleReferenceFiles     = _.throttle(this.onToggleReferenceFiles.bind(this), 1000);
        this.onChangeRowSpacingType     = _.throttle(this.onChangeRowSpacingType.bind(this), 1000, { trailing : false });
        this.onChangeShowChartType      = _.throttle(this.onChangeShowChartType.bind(this), 1000, { trailing : false });
        this.onToggleFullScreenView     = _.throttle(this.onToggleFullScreenView.bind(this), 1000, { trailing : false });
        this.state = _.extend({
            'showChart' : WorkflowGraphSectionControls.analysisStepsSet(props.context) ? 'detail' : 'basic',
            'showParameters' : false,
            'showReferenceFiles' : false,
            'rowSpacingType' : 'compact',
        }, props.context && props.context.steps ? checkIfIndirectOrReferenceNodesExist(props.context.steps) : {});
    }

    componentWillUnmount(){
        const { isFullscreen = false, toggleFullScreen } = this.props;
        if (isFullscreen){
            toggleFullScreen(false);
        }
    }

    parseAnalysisSteps(context = this.props.context){
        const { showReferenceFiles, showParameters, showChart } = this.state;
        const parsingOptions = {
            ...DEFAULT_PARSING_OPTIONS,
            showReferenceFiles, showParameters
        };
        return (
            showChart === 'basic' ?
                parseBasicIOAnalysisSteps(context.steps, context, parsingOptions)
                :
                parseAnalysisSteps(context.steps, parsingOptions)
        );
    }

    commonGraphProps(){
        const { showParameters, showReferenceFiles, rowSpacingType } = this.state;
        const graphData = this.parseAnalysisSteps();

        // Filter out legend items which aren't relevant for this context.
        const keepItems = ['Input File', 'Output File', 'Input Reference File'];
        if (showParameters){
            keepItems.push('Input Parameter');
        }
        if (showReferenceFiles){
            keepItems.push('Input Reference File');
        }
        keepItems.push('Intermediate File');

        const legendItems = _.pick(WorkflowDetailPane.Legend.defaultProps.items, keepItems);
        const commonGraphProps = commonGraphPropsFromProps({ ...this.props, legendItems });
        return {
            ...commonGraphProps,
            ...graphData,
            rowSpacingType
        };
    }

    onToggleShowParameters(){
        this.setState(function({ showParameters }){
            return { 'showParameters' : !showParameters };
        });
    }

    onToggleReferenceFiles(){
        this.setState(function({ showReferenceFiles }){
            return { 'showReferenceFiles' : !showReferenceFiles };
        });
    }

    onChangeRowSpacingType(eventKey, evt){
        requestAnimationFrame(()=>{
            this.setState(function({ rowSpacingType }){
                if (eventKey === rowSpacingType) return null;
                return { 'rowSpacingType' : eventKey };
            });
        });
    }

    onChangeShowChartType(eventKey, evt){
        requestAnimationFrame(()=>{
            this.setState(function({ showChart }){
                if (eventKey === showChart) return null;
                return { 'showChart' : eventKey };
            });
        });
    }

    onToggleFullScreenView(){
        this.props.toggleFullScreen(null, ReactTooltip.rebuild);
    }

    body(){
        var { context, mounted, width } = this.props,
            { showChart } = this.state;

        if (!Array.isArray(context.steps)) return null;

        if (showChart === 'basic') {
            return <Graph { ...this.commonGraphProps() } edgeStyle="curve" columnWidth={mounted && width ? (width - 180) / 3 : 180} />;
        } else if (showChart === 'detail') {
            return <Graph { ...this.commonGraphProps() } />;
        } else {
            throw new Error('No valid chart type set to be displayed.');
        }
    }

    render(){
        const { showChart, rowSpacingType, showParameters, showReferenceFiles, anyReferenceFileNodes } = this.state;
        const { isFullscreen } = this.props;

        return (
            <div className={"tabview-container-fullscreen-capable workflow-view-container workflow-viewing-" + showChart + (isFullscreen ? ' full-screen-view' : '')}>
                <h3 className="tab-section-title">
                    <span>Graph</span>
                    <WorkflowGraphSectionControls
                        {..._.pick(this.props, 'context', 'href', 'windowWidth', 'isFullscreen')}
                        showChartType={showChart} rowSpacingType={rowSpacingType} showParameters={showParameters}
                        showReferenceFiles={showReferenceFiles}
                        onChangeShowChartType={this.onChangeShowChartType}
                        onChangeRowSpacingType={this.onChangeRowSpacingType}
                        onToggleShowParameters={this.onToggleShowParameters}
                        onToggleReferenceFiles={this.onToggleReferenceFiles}
                        onToggleFullScreenView={this.onToggleFullScreenView}
                        isReferenceFilesCheckboxDisabled={!anyReferenceFileNodes}
                    />
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { this.body() }
            </div>
        );

    }

}
