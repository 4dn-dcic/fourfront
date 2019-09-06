'use strict';

import React from 'react';
import moment from 'moment';
import _ from 'underscore';
import Graph, { GraphParser } from '@hms-dbmi-bgm/react-workflow-viz';
import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { ItemFileAttachment } from './components/ItemFileAttachment';
import DefaultItemView from './DefaultItemView';
import { WorkflowNodeElement } from './components/Workflow/WorkflowNodeElement';
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

    getTabViewContents(){
        const { context } = this.props;
        const initTabs = [
            // todo - FileViewOverview.getTabObject(this.props),
            ...this.getCommonTabs()
        ];

        if (FileProcessedView.shouldGraphExist(context)){
            initTabs.push(ProvenanceGraphTabView.getTabObject(this.props, this.state));
        }

        return initTabs;
    }

}


export class ProvenanceGraphTabView extends React.Component {

    static getTabObject(props, state){
        const { windowWidth, windowHeight } = props;
        const { isLoadingGraphSteps, graphSteps } = state;
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
                    <ProvenanceGraphTabView {...props} {...state} />
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
        this.handleRowSpacingTypeChange = this.handleRowSpacingTypeChange.bind(this);
        this.renderNodeElement = this.renderNodeElement.bind(this);
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
        if (!key) return false;
        this.setState(function({ parsingOptions : prevOpts }){
            const nextOpts = { ...prevOpts, [key] : !prevOpts[key] };
            return { parsingOptions : nextOpts  };
        });
    }

    handleRowSpacingTypeChange(evt){
        const valMap = _.invert(ProvenanceGraphTabView.rowSpacingTitleMap);
        const nextValue = evt.target.value && valMap[evt.target.value];
        if (!nextValue) return false;
        this.setState({ rowSpacingType: nextValue });
    }

    renderNodeElement(node, graphProps){
        const { windowWidth, schemas } = this.props;
        return <WorkflowNodeElement {...graphProps} schemas={schemas} windowWidth={windowWidth} node={node}/>;
    }

    render(){
        const { graphSteps, height: fullVizSpaceHeight } = this.props;
        const { parsingOptions, rowSpacingType } = this.state;
        const lastStep = graphSteps[graphSteps.length - 1];
        const graphProps = {
            rowSpacingType, minimumHeight: fullVizSpaceHeight || 300,
            renderNodeElement: this.renderNodeElement
        };
        return (
            <div className="overflow-hidden container-wide">
                <h3 className="tab-section-title">
                    <span>Provenance</span>
                </h3>
                <GraphParser parsingOptions={parsingOptions} parentItem={lastStep} steps={graphSteps}>
                    <Graph {...graphProps} />
                </GraphParser>
            </div>
        );

    }

}





const DocumentViewOverview = React.memo(function DocumentViewOverview({ context, schemas }){
    const tips = object.tipsFromSchema(schemas, context);
    return (
        <div>
            <div className="row overview-blocks">
                <ItemFileAttachment context={context} tips={tips} wrapInColumn="col-12 col-md-6" includeTitle btnSize="lg" itemType="Document" />
            </div>
        </div>
    );
});
DocumentViewOverview.getTabObject = function({ context, schemas }){
    return {
        'tab' : (
            <React.Fragment>
                <i className="icon icon-file-text fas icon-fw"/>
                <span>Overview</span>
            </React.Fragment>
        ),
        'key' : 'overview',
        //'disabled' : !Array.isArray(context.experiments),
        'content' : (
            <div className="overflow-hidden container-wide">
                <h3 className="tab-section-title">
                    <span>Overview</span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <DocumentViewOverview context={context} schemas={schemas} />
            </div>
        )
    };
};
