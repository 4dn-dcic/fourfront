'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { Checkbox, Button } from 'react-bootstrap';
import * as globals from './../globals';
import * as store from './../../store';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide } from './../util';
import { FormattedInfoBlock, TabbedView, ExperimentSetTables, ExperimentSetTablesLoaded, WorkflowNodeElement, HiGlassTabView, HiGlassContainer, HiGlassConfigurator } from './components';
import { OverViewBodyItem, OverviewHeadingContainer } from './DefaultItemView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue, ItemPageTable, ProcessedFilesQCStackedTable } from './../browse/components';
import { browseTableConstantColumnDefinitions } from './../browse/BrowseView';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps } from './../viz/Workflow';
import { requestAnimationFrame } from './../viz/utilities';
import { commonGraphPropsFromProps, doValidAnalysisStepsExist, RowSpacingTypeDropdown } from './WorkflowView';
import { mapEmbeddedFilesToStepRunDataIDs, allFilesForWorkflowRunMappedByUUID } from './WorkflowRunView';
import { filterOutParametersFromGraphData, filterOutReferenceFilesFromGraphData, WorkflowRunTracingView, FileViewGraphSection } from './WorkflowRunTracingView';
import { FileDownloadButton } from './../util/file';

// UNCOMMENT FOR TESTING
// import * as SAMPLE_VIEWCONFIGS from './../testdata/higlass_sample_viewconfigs';
// import { test_file } from './../testdata/file/fastq-unreleased-expset';
// import { FILE } from './../testdata/file/processed-bw';



export default class FileView extends WorkflowRunTracingView {

    /* TODO : Move to WorkflowRunTracingView, DRY up re: WorkflowRunTracingView.loadGraphSteps() */
    static shouldGraphExist(context){
        return (
            (Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0)
        );
    }

    static shouldHiGlassViewExist(context){
        // TODO: Remove context.file_format check?
        if (!context.higlass_uid || typeof context.higlass_uid !== 'string') return false;
        var isMcoolFile = context.file_format === 'mcool';
        var isBWFile = (context.file_format === 'bw' || context.file_format === 'bg');
        return isMcoolFile || isBWFile;
    }

    constructor(props){
        super(props);
        this.validateHiGlassData = this.validateHiGlassData.bind(this);
        if (FileView.shouldHiGlassViewExist(props.context)){
            this.state = _.extend(this.state || {}, {
                'validatingHiGlassTileData' : true,
                'isValidHiGlassTileData' : false,
                'tips' : object.tipsFromSchema(props.schemas || Schemas.get(), props.context)
            });
        }
    }

    componentDidMount(){
        super.componentDidMount();
        this.validateHiGlassData();
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.schemas !== this.props.schemas || nextProps.context !== this.props.context){
            this.setState({ 'tips' : object.tipsFromSchema(nextProps.schemas || Schemas.get(), nextProps.context) });
        }
    }

    /** Request the ID in this.hiGlassViewConfig, ensure that is available and has min_pos, max_pos, then update state. */
    validateHiGlassData(){
        var context = this.props.context;
        if (!FileView.shouldHiGlassViewExist(context)) return;
        HiGlassConfigurator.validateTilesetUid(
            // FOR TESTING, UNCOMMENT TOP LINE & COMMENT LINE BELOW IT
            // SAMPLE_VIEWCONFIGS.HIGLASS_WEBSITE,
            context.higlass_uid,
            () => this.setState({ 'isValidHiGlassTileData' : true,  'validatingHiGlassTileData' : false }),     // Callback
            () => this.setState({ 'isValidHiGlassTileData' : false, 'validatingHiGlassTileData' : false })      // Fallback
        );
    }

    getTabViewContents(){

        var initTabs = [],
            context = this.props.context,
            width = this.getTabViewWidth(),
            steps = this.state.steps;

        initTabs.push(FileViewOverview.getTabObject(context, this.props.schemas, width));

        if (FileView.shouldGraphExist(context)){
            initTabs.push(FileViewGraphSection.getTabObject(this.props, this.state, this.handleToggleAllRuns));
        }

        if (FileView.shouldHiGlassViewExist(context)){
            initTabs.push(HiGlassTabView.getTabObject(context, !this.state.isValidHiGlassTileData, this.state.validatingHiGlassTileData/* , SAMPLE_VIEWCONFIGS.HIGLASS_WEBSITE */)); // <- uncomment for testing static viewconfig, along w/ other instances of this variable.
        }

        return initTabs.concat(this.getCommonTabs(context));
    }

    itemMidSection(){
        return <layout.WindowResizeUpdateTrigger><FileOverviewHeading context={this.props.context} tips={this.state.tips} /></layout.WindowResizeUpdateTrigger>;
    }

}

globals.content_views.register(FileView, 'File');




class FileViewOverview extends React.Component {

    static getTabObject(context, tips, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'file-overview',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>More Information</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <FileViewOverview context={context} tips={tips} width={width} />
                </div>
            )
        };
    }

    static propTypes = {
        'context' : PropTypes.shape({
            'experiments' : PropTypes.arrayOf(PropTypes.shape({
                'experiment_sets' : PropTypes.arrayOf(PropTypes.shape({
                    'link_id' : PropTypes.string.isRequired
                }))
            })),
            'experiment_sets' : PropTypes.arrayOf(PropTypes.shape({
                'experiments_in_set' : PropTypes.arrayOf(PropTypes.shape({
                    'link_id' : PropTypes.string.isRequired
                }))
            }))
        }).isRequired
    }

    render(){
        var { context } = this.props;

        var setsByKey;
        var table = null;

        if (context && (
            (Array.isArray(context.experiments) && context.experiments.length > 0) || (Array.isArray(context.experiment_sets) && context.experiment_sets.length > 0)
        )){
            setsByKey = expFxn.experimentSetsFromFile(context);
        }

        if (setsByKey && _.keys(setsByKey).length > 0){
            table = <ExperimentSetTablesLoaded experimentSetObject={setsByKey} width={this.props.width} defaultOpenIndices={[0]} />;
        }

        return (
            <div>
                <FileOverViewBody result={context} tips={this.props.tips} />
                { table }
            </div>
        );
        /*
        return (
            <div className="row">
                <div className="col-md-6">
                    <h3 className="tab-section-title">
                        <span>Quality Control Results</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    TEST
                </div>
                <div className="col-md-6">
                    <h3 className="tab-section-title">
                        <span>Others</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <FileOverViewBody result={context} schemas={this.props.schemas} />
                </div>
                
                <div className="col-md-12">
                    { table }
                </div>
            </div>
        );
        */

    }

}

export class FileOverviewHeading extends React.Component {

    constructor(props){
        super(props);
        this.onTransition = this.onTransition.bind(this);
        this.onTransitionSetOpen = this.onTransition.bind(this, true);
        this.onTransitionUnsetOpen = this.onTransition.bind(this, false);
        this.overviewBlocks = this.overviewBlocks.bind(this);
        this.state = {
            'isPropertiesOpen' : true,
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    onTransition(isOpen = false){
        this.setState({ 'isPropertiesOpen' : isOpen });
    }

    overviewBlocks(){
        var file = this.props.context,
            tips = this.props.tips,    // In form of { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
            commonProps = { tips, 'result' : file, 'wrapInColumn' : "col-sm-3 col-lg-3" };
        return [
            <OverViewBodyItem {...commonProps} key="file_format" property='file_format' fallbackTitle="File Format" />,
            <OverViewBodyItem {...commonProps} key="file_type" property='file_type' fallbackTitle="File Type" />,
            <OverViewBodyItem {...commonProps} key="file_classification" property='file_classification' fallbackTitle="General Classification" />,
            <OverViewBodyItem {...commonProps} key="file_size" property='file_size' fallbackTitle="File Size" titleRenderFxn={(field, size)=>
                <span className="text-400"><i className="icon icon-fw icon-hdd-o"/> { Schemas.Term.toName('file_size', size) }</span>
            } />
        ];
    }

    render(){
        var responsiveSize = layout.responsiveGridState();
        var isSmallerSize = this.state.mounted && (responsiveSize === 'xs' || responsiveSize === 'sm');
        return (
            <div className={"row" + (!isSmallerSize ? ' flexrow' : '')}>
                <div className="col-xs-12 col-md-9 col-lg-8">
                    <OverviewHeadingContainer onStartClose={this.onTransitionUnsetOpen} onFinishOpen={this.onTransitionSetOpen} children={this.overviewBlocks()}/>
                </div>
                <div className={"col-xs-12 col-md-3 col-lg-4 mt-1" + (this.state.isPropertiesOpen || isSmallerSize ? ' mb-3' : '')}>
                    <FileViewDownloadButtonContainer file={this.props.context} size="lg" verticallyCentered={!isSmallerSize && this.state.isPropertiesOpen} />
                </div>

            </div>
        );
    }
}

export class FileViewDownloadButtonContainer extends React.Component {

    static defaultProps = {
        'size' : null
    }

    render(){
        var file = this.props.file || this.props.context || this.props.result;
        return (
            <layout.VerticallyCenteredChild disabled={!this.props.verticallyCentered}>
                <div className={"file-download-container" + (this.props.className ? ' ' + this.props.className : '')}>
                    <fileUtil.FileDownloadButtonAuto result={file} size={this.props.size} />
                </div>
            </layout.VerticallyCenteredChild>
        );
    }
}

export class FileOverViewBody extends React.Component {

    constructor(props){
        super(props);
        this.handleJuiceBoxVizClick = this.handleJuiceBoxVizClick.bind(this);
    }

    handleJuiceBoxVizClick(evt){
        var file = this.props.result,
            pageHref = this.props.href || (store && store.getState().href),
            hrefParts = url.parse(pageHref),
            host = hrefParts.protocol + '//' + hrefParts.host,
            targetLocation = "http://aidenlab.org/juicebox/?hicUrl=" + host + file.href;

        if (isServerSide()) return null;
        var win = window.open(targetLocation, '_blank');
        win.focus();
    }

    visualizeExternallyButton(){
        var file = this.props.result, tips = this.props.tips;
        if (!file || file.file_format !== 'hic') return null;
        return (
            <OverViewBodyItem tips={tips} file={file} wrapInColumn="col-md-6" fallbackTitle="Visualization" titleRenderFxn={(field, size)=>
                <Button bsStyle="primary" onClick={this.handleJuiceBoxVizClick}>
                    <span className="text-400">Visualize with</span> JuiceBox&nbsp;&nbsp;<i className="icon icon-fw icon-external-link text-small" style={{ position: 'relative', 'top' : 1 }}/>
                </Button>
            } />
        );
    }

    render(){
        var file = this.props.result, tips = this.props.tips;
        var extVizButton = this.visualizeExternallyButton();
        return (
            <div className="row overview-blocks">
                { extVizButton }
                <RelatedFilesOverViewBlock tips={tips} file={file} property="related_files" wrapInColumn="col-md-6" hideIfNoValue />
                <QualityControlResults property="quality_metric" tips={tips} file={file} wrapInColumn="col-md-6" schemas={this.props.schemas} />
            </div>
        );

    }
}


export class QualityControlResults extends React.PureComponent {

    static defaultProps = { 'property' : 'quality_metric', 'hideIfNoValue' : false };

    metrics(){
        var { file, property, hideIfNoValue, tips, wrapInColumn, qualityMetric, schemas } = this.props;
        if (!qualityMetric) qualityMetric = file[property];
        let qcType = null;
        if (file['@type'].indexOf('FileFastQ') > -1){
            qcType = 'QualityMetricFastqc';
        } else {
            qcType = 'QualityMetricPairsqc';
        }
        qualityMetric['@type'] = [qcType, 'QualityMetric', 'Item'];
        var metricTips = object.tipsFromSchema(schemas || Schemas.get(), qualityMetric);

        function renderMetric(prop, title, renderPercent = false){
            if (!qualityMetric[prop]) return null;
            return (
                <div className="overview-list-element">
                    <div className="row">
                        <div className="col-xs-4 text-right">
                            <object.TooltipInfoIconContainerAuto result={qualityMetric} property={prop} tips={metricTips} elementType="h5" fallbackTitle={title} className="mb-0 mt-02" />
                        </div>
                        <div className="col-xs-8">
                            <div className="inner value">
                                { renderPercent ? ProcessedFilesQCStackedTable.percentOfTotalReads(file, property + '.' + prop) : Schemas.Term.toName(property + '.' + prop, qualityMetric[prop], true) }
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        var itemsToReturn = [
            renderMetric("Total reads", "Total Reads"),
            //renderMetric("Cis/Trans ratio", "Cis/Trans Ratio"),
            //renderMetric("% Long-range intrachromosomal reads", "% LR IC Reads"),
            renderMetric("Total Sequences", "Total Sequences"),
            renderMetric("Sequence length", "Sequence length"),
            renderMetric("Cis reads (>20kb)", "Cis reads (>20kb)", true),
            renderMetric("Short cis reads (<20kb)", "Short cis reads (<20kb)", true),
            renderMetric("Trans reads", "Trans Reads", true),
            renderMetric("Sequence length", "Sequence length"),
            renderMetric("overall_quality_status", "Overall Quality"),
            renderMetric("url", "Link to Report")
        ];

        return itemsToReturn;

    }

    render(){
        var { file, property, hideIfNoValue, tips, wrapInColumn, qualityMetric } = this.props;

        var noValue = !qualityMetric && (!file || !file[property]);
        if (noValue && hideIfNoValue) return null;

        var elem = (
            <div className="inner">
                <object.TooltipInfoIconContainerAuto result={file} property={property} tips={tips} elementType="h5" fallbackTitle="Quality Metric Results" />
                <div className="overview-list-elements-container">{ (noValue && (<em>Not Available</em>)) || this.metrics() }</div>
            </div>
        );

        if (wrapInColumn){
            return <div className={typeof wrapInColumn === 'string' ? wrapInColumn : "col-sm-12"} children={elem} />;
        } else {
            return elem;
        }
    }

}

/**
 * Reuse when showing related_files of an Item.
 *
 * @deprecated ?
 */
export class RelatedFilesOverViewBlock extends React.Component {

    static defaultProps = {
        'wrapInColumn' : true,
        'property' : 'related_files'
    }

    relatedFiles(){
        var { file, related_files, property } = this.props;
        var relatedFiles;
        if (Array.isArray(related_files) && related_files.length > 0){
            relatedFiles = related_files;
        } else {
            relatedFiles = file[property] || file.related_files;
        }

        if (!Array.isArray(relatedFiles) || relatedFiles.length === 0){
            return null;
        }

        return _.map(relatedFiles, function(rf, i){
            return (<li className="related-file" key={object.itemUtil.atId(rf.file) || i}>{ rf.relationship_type } &nbsp;-&nbsp; { object.linkFromItem(rf.file) }</li>);
        });

    }

    render(){
        var { file, related_files, property, hideIfNoValue, tips, wrapInColumn } = this.props;

        var relatedFiles = this.relatedFiles();

        if (hideIfNoValue && !relatedFiles){
            return null;
        } else if (!relatedFiles) {
            relatedFiles = <li className="related-file"><em>None</em></li>;
        }

        var elem = (
            <div className="inner">
                <object.TooltipInfoIconContainerAuto result={file} property={property || "related_files"} tips={tips} elementType="h5" fallbackTitle="Related Files" />
                <ul className="overview-list-elements-container">{ relatedFiles }</ul>
            </div>
        );

        if (wrapInColumn){
            return <div className={typeof wrapInColumn === 'string' ? wrapInColumn : "col-sm-12"} children={elem} />;
        } else {
            return elem;
        }


    }
}

