'use strict';

import React from 'react';
import moment from 'moment';
import _ from 'underscore';
import memoize from 'memoize-one';
import Graph, { GraphParser, parseAnalysisSteps } from '@hms-dbmi-bgm/react-workflow-viz';
import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import DefaultItemView from './DefaultItemView';
import { WorkflowNodeElement } from './components/Workflow/WorkflowNodeElement';
import { WorkflowDetailPane } from './components/Workflow/WorkflowDetailPane';
import { WorkflowGraphSectionControls } from './components/Workflow/WorkflowGraphSectionControls';
import { FullHeightCalculator } from './components/FullHeightCalculator';


/**
 * DefaultItemView, extended with an onMount request to
 * `trace_workflow_run_steps/{uuid}/?{options}` as well
 * as state for holding response, loading state, state for
 * options, and methods for handling those options.
 */

export default class DefaultItemViewWithProvenance extends DefaultItemView {

    /** Extend DefaultItemView's init state to load in provenance graph */
    constructor(props){
        super(props);
        this.shouldGraphExist = this.shouldGraphExist.bind(this);
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

    /** Should be implemented/overriden by classes which extends this */
    shouldGraphExist(){
        return false;
    }

    loadGraphSteps(){
        const { context } = this.props;
        const { uuid } = context;
        if (typeof uuid !== 'string') {
            throw new Error("Expected context.uuid");
        }
        if (!this.shouldGraphExist(context)){
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
            timestamp: moment.utc().unix()
        };

        if (includeAllRunsInSteps){
            uriOpts.all_runs = "True";
        }

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

    static defaultProps = {
        'isNodeCurrentContext' : function(node, context){ return false; },
        'graphSteps' : null,
        'heading' : <span>Provenance</span>
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
                showIndirectFiles: false,
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

    /** Classes which extend this should override this. */
    isNodeCurrentContext(node){
        const { context, isNodeCurrentContext } = this.props;
        if (typeof isNodeCurrentContext !== 'function'){
            console.error("No function to determine if is current context.");
        }
        return isNodeCurrentContext(node, context);
    }

    render(){
        const {
            heading,
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
                        { heading }
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
