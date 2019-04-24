'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import memoize from 'memoize-one';
import { Button } from 'react-bootstrap';
import * as store from './../../store';
import { console, object, expFxn, Schemas, layout, fileUtil, isServerSide } from './../util';
import { ExperimentSetTablesLoaded, OverviewHeadingContainer } from './components';
import { OverViewBodyItem, WrapInColumn } from './DefaultItemView';
import WorkflowRunTracingView, { FileViewGraphSection } from './WorkflowRunTracingView';

// UNCOMMENT FOR TESTING
// import * as SAMPLE_VIEWCONFIGS from './../testdata/higlass_sample_viewconfigs';
// import { test_file } from './../testdata/file/fastq-unreleased-expset';
// import { FILE } from './../testdata/file/processed-bw';


/** Container for all of the tabs on a File page. */
export default class FileView extends WorkflowRunTracingView {

    static shouldGraphExist = memoize(function(context){
        return (
            (Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0)
            // We can uncomment below line once do permissions checking on backend for graphing
            //&& _.any(context.workflow_run_outputs, object.itemUtil.atId)
        );
    });

    /**
     * Returns schema properties for this File @type, in form of:
     * { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
     */
    static schemaForFile = memoize(function(context, schemas){
        return object.tipsFromSchema(schemas, context);
    });

    componentDidMount(){
        super.componentDidMount();
    }

    getTabViewContents(){

        var initTabs = [],
            context = this.props.context,
            width = this.getTabViewWidth();

        initTabs.push(FileViewOverview.getTabObject(this.props, width));

        if (FileView.shouldGraphExist(context)){
            initTabs.push(FileViewGraphSection.getTabObject(this.props, this.state, this.handleToggleAllRuns, width));
        }

        return initTabs.concat(this.getCommonTabs(this.props));
    }

    itemMidSection(){
        return (
            <React.Fragment>
                { super.itemMidSection() }
                <FileOverviewHeading {..._.pick(this.props, 'windoWidth', 'context', 'schemas')} />
            </React.Fragment>
        );
    }

}




class FileViewOverview extends React.PureComponent {

    static getTabObject({ context, schemas, windowWidth, href }, width){
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
                    <FileViewOverview {...{ context, width, windowWidth, schemas, href }} />
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
    };

    render(){
        var { context, windowWidth, width, schemas, href } = this.props,
            experimentSetUrls = expFxn.experimentSetsFromFile(context, 'ids');

        return (
            <div>
                <div className="row overview-blocks">
                    <ExternalVisualizationButtons file={context} href={href} wrapInColumn="col-xs-12" />
                    <QualityControlResults property="quality_metric" file={context} wrapInColumn="col-md-6" schemas={schemas} />
                    <RelatedFilesOverViewBlock file={context} property="related_files" wrapInColumn="col-md-6" hideIfNoValue schemas={schemas} />
                </div>
                { experimentSetUrls && experimentSetUrls.length > 0 ?
                    <ExperimentSetTablesLoaded {...{ experimentSetUrls, width, windowWidth }} defaultOpenIndices={[0]} id={object.itemUtil.atId(context)} />
                : null }
            </div>
        );
    }

}


export class FileOverviewHeading extends React.PureComponent {

    constructor(props){
        super(props);
        this.onTransitionSetOpen    = this.onTransition.bind(this, true);
        this.onTransitionUnsetOpen  = this.onTransition.bind(this, false);
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

    render(){
        const { context, schemas, windowWidth } = this.props;
        const { mounted, isPropertiesOpen }  = this.state;
        const responsiveSize = layout.responsiveGridState(windowWidth);
        const isSmallerSize = this.state.mounted && (responsiveSize === 'xs' || responsiveSize === 'sm');
        const commonHeadingBlockProps = { 'tips' : FileView.schemaForFile(context, schemas), 'result' : context, 'wrapInColumn' : "col-sm-3 col-lg-3" };
        return (
            <div className={"row" + (!isSmallerSize ? ' flexrow' : '')}>
                <div className="col-xs-12 col-md-9 col-lg-8">
                    <OverviewHeadingContainer onStartClose={this.onTransitionUnsetOpen} onFinishOpen={this.onTransitionSetOpen}>
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_format" property='file_format' fallbackTitle="File Format" />
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_type" property='file_type' fallbackTitle="File Type" />
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_classification" property='file_classification' fallbackTitle="General Classification" />
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_size" property='file_size' fallbackTitle="File Size" titleRenderFxn={function(field, value){
                            return <span className="text-400"><i className="icon icon-fw icon-hdd-o"/> { Schemas.Term.toName(field, value) }</span>;
                        }} />
                    </OverviewHeadingContainer>
                </div>
                <div className="col-xs-12 col-md-3 col-lg-4 mt-1 mb-3">
                    <FileViewDownloadButtonContainer file={context} size="lg" verticallyCentered={!isSmallerSize && isPropertiesOpen} />
                </div>

            </div>
        );
    }
}


export function FileViewDownloadButtonContainer(props){
    const { className, size, file, context, result } = props;
    const fileToUse = file || context || result;
    return (
        <div className={"file-download-container" + (className ? ' ' + className : '')}>
            <fileUtil.FileDownloadButtonAuto result={fileToUse} size={size} />
        </div>
    );
}
FileViewDownloadButtonContainer.defaultProps = { 'size' : null };





export class ExternalVisualizationButtons extends React.PureComponent {

    static defaultProps = {
        'wrapInColumn' : "col-xs-12",
        'className' : "inner"
    };

    /**
     * Add a link to an external JuiceBox site for some file types.
     * @param {string} fileHref - URL used to access the file
     * @returns {JSX.Element|null} A button which opens up file to be viewed at HiGlass onClick, or void.
     */
    renderJuiceboxBtn(fileHref){
        return (
            <Button bsStyle="primary" href={"http://aidenlab.org/juicebox/?hicUrl=" + fileHref} className="mr-05" tagret="_blank">
                <span className="text-400">Visualize with</span> JuiceBox&nbsp;&nbsp;<i className="icon icon-fw icon-external-link text-small" style={{ position: 'relative', 'top' : 1 }}/>
            </Button>
        );
    }

    /**
     * Add a link to an external Epigenome site for some file types.
     * @param {string} fileHref - URL used to access the file\
     * @param {string} genome_assembly - The file's genome assembly
     * @returns {JSX.Element|null} A button which opens up file to be viewed at HiGlass onClick, or void.
     */
    renderEpigenomeBtn(fileHref, genome_assembly) {

        // We may need to map the genome assembly to Epigenome's assemblies.
        // N.B. This map is replicated in /browse/components/file-tables.js
        const assemblyMap = {
            'GRCh38' : 'hg38',
            'GRCm38' : 'mm10'
        };
        const genome = genome_assembly && assemblyMap[genome_assembly];

        // If the file lacks a genome assembly or it isn't in the expected mappings, do not show the button.
        if (!genome) return null;

        // Build the Epigenome button
        return (
            <Button bsStyle="primary" href={"http://epigenomegateway.wustl.edu/browser/?genome=" + genome + "&hicUrl=" +fileHref} target="_blank" rel="noreferrer noopener">
                <span className="text-400 ml-05">Visualize with</span> Epigenome Browser&nbsp;&nbsp;<i className="icon icon-fw icon-external-link text-small" style={{ position: 'relative', 'top' : 1 }}/>
            </Button>
        );
    }

    render(){
        const { file, href, wrapInColumn, className } = this.props;
        var epigenomeBtn, juiceBoxBtn;

        if (!(file.status === 'archived' || file.status === 'released')){
            return null; // External tools cannot access non-released files.
        }
        if (!file.href){
            return null;
        }

        const fileFormat = fileUtil.getFileFormatStr(file);
        const hrefParts = url.parse(href || (store && store.getState().href));
        const fileUrl = (hrefParts.protocol + '//' + hrefParts.host) + file.href;


        if (fileFormat === 'hic'){
            juiceBoxBtn = this.renderJuiceboxBtn(fileUrl);
            epigenomeBtn = this.renderEpigenomeBtn(fileUrl, file.genome_assembly || null);
        }

        if (!juiceBoxBtn && !epigenomeBtn){
            return null;
        }

        return (
            <WrapInColumn wrap={wrapInColumn}>
                <div className={className}>
                    <h5>Visualization</h5>
                    { juiceBoxBtn }
                    { epigenomeBtn }
                </div>
            </WrapInColumn>
        );
    }

}



export class QualityControlResults extends React.PureComponent {

    /**
     * Converts file + field (param) into a human-readable percentage.
     *
     * @param {Item} file - File to get 'percentOfTotalReads' from.
     * @param {string} field - Property where 'percentOfTotalReads' value can be found.
     * @param {number} colIndex - Unused.
     * @param {Object} props - Unused.
     * @returns {JSX.Element|string} Human-readable value for percent of total reads.
     */
    static percentOfTotalReads(file, field, colIndex, props){
        var numVal = object.getNestedProperty(file, field);
        if (numVal && typeof numVal === 'number' && file.quality_metric && file.quality_metric['Total reads']){
            var percentVal = Math.round((numVal / file.quality_metric['Total reads']) * 100 * 1000) / 1000;
            var numValRounded = Schemas.Term.roundLargeNumber(numVal);
            return (
                <span className="inline-block" data-tip={"Percent of total reads (= " + numValRounded + ")."}>{ percentVal + '%' }</span>
            );
        }
        return '-';
    }

    static defaultProps = { 'property' : 'quality_metric', 'hideIfNoValue' : false };

    metrics(){
        var { file, property, hideIfNoValue, wrapInColumn, qualityMetric, schemas } = this.props;
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
                                { renderPercent ? QualityControlResults.percentOfTotalReads(file, property + '.' + prop) : Schemas.Term.toName(property + '.' + prop, qualityMetric[prop], true) }
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        var itemsToReturn = [
            renderMetric("Total reads", "Total Reads in File"),
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
        const { file, property, hideIfNoValue, schemas, wrapInColumn, qualityMetric } = this.props;
        const tips = FileView.schemaForFile(file, schemas);

        var noValue = !qualityMetric && (!file || !file[property]);
        if (noValue && hideIfNoValue) return null;

        return (
            <WrapInColumn wrap={wrapInColumn} defaultWrapClassName="col-sm-12">
                <div className="inner">
                    <object.TooltipInfoIconContainerAuto result={file} property={property} tips={tips} elementType="h5" fallbackTitle="Quality Metric Results" />
                    <div className="overview-list-elements-container">{ (noValue && (<em>Not Available</em>)) || this.metrics() }</div>
                </div>
            </WrapInColumn>
        );
    }

}



/**
 * Reuse when showing related_files of an Item.
 *
 * @deprecated ?
 */
export class RelatedFilesOverViewBlock extends React.PureComponent {

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
        const { file, related_files, property, hideIfNoValue, schemas, wrapInColumn } = this.props;
        const tips = FileView.schemaForFile(file, schemas);

        var relatedFiles = this.relatedFiles();

        if (hideIfNoValue && !relatedFiles){
            return null;
        } else if (!relatedFiles) {
            relatedFiles = <li className="related-file"><em>None</em></li>;
        }

        const elem = (
            <div className="inner">
                <object.TooltipInfoIconContainerAuto result={file} property={property || "related_files"} tips={tips} elementType="h5" fallbackTitle="Related Files" />
                <ul className="overview-list-elements-container">{ relatedFiles }</ul>
            </div>
        );

        if (wrapInColumn){
            return <div className={typeof wrapInColumn === 'string' ? wrapInColumn : "col-sm-12"}>{ elem }</div>;
        } else {
            return elem;
        }


    }
}
