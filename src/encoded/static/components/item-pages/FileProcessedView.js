'use strict';

import React from 'react';
import moment from 'moment';
import _ from 'underscore';
import memoize from 'memoize-one';
import Graph, { GraphParser, parseAnalysisSteps } from '@hms-dbmi-bgm/react-workflow-viz';
import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemView from './DefaultItemView';
import { WorkflowNodeElement } from './components/Workflow/WorkflowNodeElement';
import { WorkflowDetailPane } from './components/Workflow/WorkflowDetailPane';
import { WorkflowGraphSectionControls } from './components/Workflow/WorkflowGraphSectionControls';
import { FullHeightCalculator } from './components/FullHeightCalculator';



export default class FileProcessedView extends DefaultItemView {

    static shouldGraphExist(context){
        return (
            (Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0)
            // We can uncomment below line once do permissions checking on backend for graphing
            //&& _.any(context.workflow_run_outputs, object.itemUtil.atId)
        );
    }

    /** Extend DefaultItemView's init state to load in provenance graph */
    constructor(props){
        super(props);
        this.loadGraphSteps = this.loadGraphSteps.bind(this);
        this.toggleAllRuns = _.throttle(this.toggleAllRuns.bind(this), 1000, { trailing: false });
        this.state = {
            ...this.state,
            includeAllRunsInSteps: false,
            isLoadingGraphSteps: false,
            graphSteps: null,
            loadingStepsError: null
        };
    }

    componentDidMount(){
        super.componentDidMount();
        this.loadGraphSteps();
    }

    loadGraphSteps(){
        const { context } = this.props;
        const { uuid } = context;
        if (typeof uuid !== 'string') {
            throw new Error("Expected context.uuid");
        }
        if (!FileProcessedView.shouldGraphExist(context)){
            console.warn("No or not populated workflow_run_outputs field");
            return;
        }

        const { includeAllRunsInSteps, isLoadingGraphSteps } = this.state;
        const callback = (res) => {
            if (Array.isArray(res) && res.length > 0){
                this.setState({
                    'graphSteps' : res,
                    'isLoadingGraphSteps' : false
                });
            } else {
                this.setState({
                    'graphSteps' : null,
                    'isLoadingGraphSteps' : false,
                    'loadingStepsError' : res.message || res.error || "No steps in response."
                });
            }
        };

        const uriOpts = {
            timestamp: moment.utc().unix(),
            all_runs: includeAllRunsInSteps
        };

        const tracingHref = (
            '/trace_workflow_run_steps/' + uuid + '/'
            + '?'
            + Object.keys(uriOpts).map(function(optKey){
                return encodeURIComponent(optKey) + '=' + encodeURIComponent(uriOpts[optKey]);
            }).join('&')
        );

        if (isLoadingGraphSteps){
            console.error("Already loading graph steps");
            return false;
        }

        this.setState({
            'isLoadingGraphSteps' : true,
            'loadingStepsError' : null
        }, ()=>{
            ajax.load(tracingHref, callback, 'GET', callback);
        });
    }

    toggleAllRuns(){
        let doRequest = false;
        this.setState(function({ includeAllRunsInSteps, isLoadingGraphSteps }){
            if (isLoadingGraphSteps){
                return null;
            }
            doRequest = true;
            return { includeAllRunsInSteps: !includeAllRunsInSteps };
        }, ()=>{
            if (!doRequest) return;
            this.loadGraphSteps();
        });
    }

    getTabViewContents(){
        const { context } = this.props;
        const initTabs = [
            // todo - FileViewOverview.getTabObject(this.props),
            ...this.getCommonTabs()
        ];

        if (FileProcessedView.shouldGraphExist(context)){
            initTabs.push(ProvenanceGraphTabView.getTabObject({
                ...this.props,
                ...this.state,
                toggleAllRuns: this.toggleAllRuns
            }));
        }

        return initTabs;
    }

}

export function getNodesInfo(steps){
    const { nodes } = parseAnalysisSteps(steps, { 'showReferenceFiles' : true, 'showIndirectFiles' : true });
    const anyReferenceFileNodes = _.any(nodes, function(n){
        return (n.nodeType === 'output' && n.meta && n.meta.in_path === false);
    });
    const anyIndirectFileNodes = _.any(nodes, function(n){
        return (n.ioType === 'reference file');
    });
    const anyGroupNodes = _.any(nodes, function(n){
        return n.nodeType === 'input-group' || n.nodeType === 'output-group';
    });
    return { anyReferenceFileNodes, anyIndirectFileNodes, anyGroupNodes };
}
/*
export function anyReferenceFileNodes(nodes){
    return _.any(nodes, function(n){
        return (n.nodeType === 'output' && n.meta && n.meta.in_path === false);
    });
}

export function anyIndirectFileNodes(nodes){
    return _.any(nodes, function(n){
        return (n.ioType === 'reference file');
    });
}

export function anyGroupNodes(nodes){
    return _.any(nodes, function(n){
        return n.nodeType === 'input-group' || n.nodeType === 'output-group';
    });
}
*/

export function isNodeCurrentContext(node, context){
    if (node.nodeType !== 'input' && node.nodeType !== 'output') return false;
    return (
        context && typeof context.accession === 'string' && node.meta.run_data && node.meta.run_data.file
        && typeof node.meta.run_data.file !== 'string' && !Array.isArray(node.meta.run_data.file)
        && typeof node.meta.run_data.file.accession === 'string'
        && node.meta.run_data.file.accession === context.accession
    ) || false;
}

export class ProvenanceGraphTabView extends React.Component {

    static getTabObject(props){
        const { windowWidth, windowHeight, isLoadingGraphSteps, graphSteps } = props;
        const stepsExist = Array.isArray(graphSteps) && graphSteps.length > 0;
        let icon;
        if (isLoadingGraphSteps){
            icon = <i className="icon icon-circle-notch icon-spin fas icon-fw"/>;
        } else if (!stepsExist){
            icon = <i className="icon icon-times fas icon-fw"/>;
        } else {
            icon = <i className="icon icon-sitemap icon-rotate-90 fas icon-fw"/>;
        }
        return {
            'tab' : (
                <React.Fragment>
                    { icon }
                    <span>Provenance</span>
                </React.Fragment>
            ),
            'key' : 'provenance',
            'disabled'  : !stepsExist,
            'content' : (
                <FullHeightCalculator windowHeight={windowHeight} windowWidth={windowWidth}>
                    <ProvenanceGraphTabView {...props} />
                </FullHeightCalculator>
            )
        };
    }

    static rowSpacingTitleMap = {
        // todo - rename internal stuff in workflow lib
        "compact" : "Centered",
        "stacked" : "Stacked",
        "wide" : "Spread"
    };

    constructor(props){
        super(props);
        this.handleParsingOptChange = this.handleParsingOptChange.bind(this);
        this.handleRowSpacingTypeSelect = this.handleRowSpacingTypeSelect.bind(this);
        this.renderNodeElement = this.renderNodeElement.bind(this);
        this.renderDetailPane = this.renderDetailPane.bind(this);
        this.isNodeCurrentContext = this.isNodeCurrentContext.bind(this);

        this.memoized = {
            getNodesInfo: memoize(getNodesInfo)
        };

        this.state = {
            parsingOptions: {
                showReferenceFiles: true,
                showParameters: false,
                showIndirectFiles: true,
                parseBasicIO: false
            },
            rowSpacingType: "stacked"
        };
    }

    handleParsingOptChange(evt){
        const key = evt.target.getAttribute("name");
        console.log('evt', evt, key);
        if (!key) return false;
        this.setState(function({ parsingOptions : prevOpts }){
            const nextOpts = { ...prevOpts, [key] : !prevOpts[key] };
            return { parsingOptions : nextOpts  };
        });
    }

    handleRowSpacingTypeSelect(nextValue, evt){
        if (!nextValue) return false;
        this.setState({ rowSpacingType: nextValue });
    }

    renderNodeElement(node, graphProps){
        const { windowWidth, schemas } = this.props;
        return <WorkflowNodeElement {...graphProps} schemas={schemas} windowWidth={windowWidth} node={node}/>;
    }

    renderDetailPane(node, graphProps){
        const { context, schemas } = this.props;
        return <WorkflowDetailPane {...graphProps} {...{ context, node, schemas }} />;
    }

    isNodeCurrentContext(node){
        return isNodeCurrentContext(node, this.props.context);
    }

    render(){
        const {
            graphSteps,
            height: fullVizSpaceHeight, windowWidth,
            toggleAllRuns, includeAllRunsInSteps, isLoadingGraphSteps
        } = this.props;
        const { parsingOptions: origParseOpts, rowSpacingType } = this.state;
        const { anyReferenceFileNodes, anyIndirectFileNodes, anyGroupNodes } = this.memoized.getNodesInfo(graphSteps);
        const lastStep = graphSteps[graphSteps.length - 1];
        const graphProps = {
            rowSpacingType, minimumHeight: fullVizSpaceHeight || 300,
            renderNodeElement: this.renderNodeElement,
            renderDetailPane: this.renderDetailPane,
            isNodeCurrentContext: this.isNodeCurrentContext
        };
        const parsingOptionsForControls = { ...origParseOpts };
        const parsingOptsForGraph = { ...origParseOpts };
        if (!anyReferenceFileNodes){
            parsingOptionsForControls.showReferenceFiles = null;
            parsingOptsForGraph.showReferenceFiles = false;
            //delete parsingOptions.showReferenceFiles;
        }
        if (!anyIndirectFileNodes){
            parsingOptionsForControls.showIndirectFiles = null;
            parsingOptsForGraph.showIndirectFiles = false;
        }

        return (
            <div>
                <div className="container-wide">
                    <h3 className="tab-section-title">
                        <span>Provenance</span>
                        <WorkflowGraphSectionControls
                            {...{ rowSpacingType, toggleAllRuns, isLoadingGraphSteps, windowWidth }}
                            parsingOptions={parsingOptionsForControls}
                            includeAllRunsInSteps={anyGroupNodes || includeAllRunsInSteps ? includeAllRunsInSteps : null}
                            onRowSpacingTypeSelect={this.handleRowSpacingTypeSelect}
                            onParsingOptChange={this.handleParsingOptChange}
                            rowSpacingTitleMap={ProvenanceGraphTabView.rowSpacingTitleMap} />
                    </h3>
                </div>
                <hr className="tab-section-title-horiz-divider"/>
                <GraphParser parsingOptions={parsingOptsForGraph} parentItem={lastStep} steps={graphSteps}>
                    <Graph {...graphProps} />
                </GraphParser>
            </div>
        );

    }

}


