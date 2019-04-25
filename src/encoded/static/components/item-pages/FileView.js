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
        const context = this.props.context;
        const width = this.getTabViewWidth();
        let tabs = [];

        tabs.push(FileViewOverview.getTabObject(this.props, width));

        if (FileView.shouldGraphExist(context)){
            tabs.push(FileViewGraphSection.getTabObject(this.props, this.state, this.handleToggleAllRuns, width));
        }

        return tabs.concat(this.getCommonTabs(this.props));
    }

    itemMidSection(){
        const gridState = layout.responsiveGridState(this.props.windowWidth);
        return (
            <React.Fragment>
                { super.itemMidSection() }
                <FileOverviewHeading {..._.pick(this.props, 'context', 'schemas')} gridState={gridState} />
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
                    '@id' : PropTypes.string.isRequired
                }))
            })),
            'experiment_sets' : PropTypes.arrayOf(PropTypes.shape({
                'experiments_in_set' : PropTypes.arrayOf(PropTypes.shape({
                    '@id' : PropTypes.string.isRequired
                }))
            }))
        }).isRequired
    };

    render(){
        const { context, windowWidth, width, schemas, href } = this.props;
        const experimentSetUrls = expFxn.experimentSetsFromFile(context, 'ids');

        return (
            <div>
                <div className="row overview-blocks">
                    <ExternalVisualizationButtons file={context} href={href} wrapInColumn="col-xs-12" />
                    <QualityControlResults file={context} wrapInColumn="col-md-6" hideIfNoValue schemas={schemas} />
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
        const { context, schemas, gridState } = this.props;
        const { mounted, isPropertiesOpen } = this.state;
        const isSmallerSize = mounted && (gridState === 'xs' || gridState === 'sm');
        const commonHeadingBlockProps = { 'tips' : FileView.schemaForFile(context, schemas), 'result' : context, 'wrapInColumn' : "col-sm-6 col-lg-3" };
        return (
            <div className={"row" + (!isSmallerSize ? ' flexrow' : '')}>
                <div className="col-xs-12 col-md-8">
                    <OverviewHeadingContainer onStartClose={this.onTransitionUnsetOpen} onFinishOpen={this.onTransitionSetOpen}>
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_format" property='file_format' fallbackTitle="File Format" />
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_type" property='file_type' fallbackTitle="File Type" />
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_classification" property='file_classification' fallbackTitle="General Classification" />
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_size" property='file_size' fallbackTitle="File Size" titleRenderFxn={function(field, value){
                            return <span className="text-400"><i className="icon icon-fw icon-hdd-o"/> { Schemas.Term.toName(field, value) }</span>;
                        }} />
                    </OverviewHeadingContainer>
                </div>
                <div className="col-xs-12 col-md-4 mt-1 mb-3">
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




function QCMetricFromEmbed(props){
    const { metric, qcProperty, fallbackTitle, tips, percent } = props;
    if (!metric[qcProperty]) return null;
    return (
        <div className="overview-list-element">
            <div className="row">
                <div className="col-xs-4 text-right">
                    <object.TooltipInfoIconContainerAuto result={metric} property={qcProperty} tips={tips} elementType="h5" fallbackTitle={fallbackTitle || qcProperty} className="mb-0 mt-02" />
                </div>
                <div className="col-xs-8">
                    <div className="inner value">
                        { percent ? QCMetricFromEmbed.percentOfTotalReads(metric, qcProperty) : Schemas.Term.toName('quality_metric.' + qcProperty, metric[qcProperty], true) }
                    </div>
                </div>
            </div>
        </div>
    );
}
QCMetricFromEmbed.percentOfTotalReads = function(quality_metric, field){
    var numVal = object.getNestedProperty(quality_metric, field);
    if (numVal && typeof numVal === 'number' && quality_metric && quality_metric['Total reads']){
        var percentVal = Math.round((numVal / quality_metric['Total reads']) * 100 * 1000) / 1000;
        var numValRounded = Schemas.Term.roundLargeNumber(numVal);
        return (
            <span className="inline-block" data-tip={"Percent of total reads (= " + numValRounded + ")."}>{ percentVal + '%' }</span>
        );
    }
    return '-';
};


export function QCMetricFromSummary(props){
    const { title } = props;
    const { value, tooltip } = QCMetricFromSummary.formatByNumberType(props);

    return (
        <div className="overview-list-element">
            <div className="row">
                <div className="col-xs-4 text-right">
                    <h5 className="mb-0 mt-02">{ title }</h5>
                </div>
                <div className="col-xs-8">
                    <div className="inner value">
                        { tooltip ? <i className="icon icon-fw icon-info-circle mr-05" data-tip={tooltip} /> : null }
                        { value }
                    </div>
                </div>
            </div>
        </div>
    );
}
QCMetricFromSummary.formatByNumberType = function({ value, tooltip, numberType }){
    // We expect these values to always be strings or undefined which are passed by value (not reference).\
    // Hence we use var instead of const and safely overwrite them.
    if (numberType === 'percent'){
        value += '%';
    } else if (numberType && ['number', 'integer'].indexOf(numberType) > -1) {
        value = parseFloat(value);
        if (!tooltip && value >= 1000) {
            tooltip = Schemas.Term.decorateNumberWithCommas(value);
        }
        value = Schemas.Term.roundLargeNumber(value);
    }
    return { value, tooltip };
};


export class QualityControlResults extends React.PureComponent {

    static defaultProps = {
        'hideIfNoValue' : false
    };

    /** To be deprecated (?) */
    metricsFromEmbeddedReport(){
        const { file, schemas } = this.props;
        const commonProps = { 'metric' : file.quality_metric, 'tips' : object.tipsFromSchema(schemas || Schemas.get(), file.quality_metric) };
        return (
            <div className="overview-list-elements-container">
                <QCMetricFromEmbed {...commonProps} qcProperty="Total reads" fallbackTitle="Total Reads in File" />
                <QCMetricFromEmbed {...commonProps} qcProperty="Total Sequences" />
                <QCMetricFromEmbed {...commonProps} qcProperty="Sequence length" />
                <QCMetricFromEmbed {...commonProps} qcProperty="Cis reads (>20kb)" percent />
                <QCMetricFromEmbed {...commonProps} qcProperty="Short cis reads (<20kb)" percent />
                <QCMetricFromEmbed {...commonProps} qcProperty="Trans reads" fallbackTitle="Trans Reads" percent />
                <QCMetricFromEmbed {...commonProps} qcProperty="Sequence length" />
                <QCMetricFromEmbed {...commonProps} qcProperty="overall_quality_status" fallbackTitle="Overall Quality" />
                <QCMetricFromEmbed {...commonProps} qcProperty="url" fallbackTitle="Link to Report" />
            </div>
        );
    }

    metricsFromSummary(){
        const { file, schemas } = this.props;
        const metric = file && file.quality_metric;
        const metricURL = metric && metric.url;
        return (
            <div className="overview-list-elements-container">
                { _.map(file.quality_metric_summary, function(qmsItem){ return <QCMetricFromSummary {...qmsItem} key={qmsItem.title} />; }) }
                { metricURL ?
                    <QCMetricFromSummary title="Report" tooltip="Link to full quality metric report" value={
                        <React.Fragment>
                            <a href={metricURL} target="_blank" rel="noopener noreferrer">{ Schemas.Term.hrefToFilename(metricURL) }</a>
                            <i className="ml-05 icon icon-fw icon-external-link text-small"/>
                        </React.Fragment>
                    } />
                : null }
            </div>
        );

    }

    render(){
        const { file, hideIfNoValue, schemas, wrapInColumn } = this.props;

        let metrics, titleProperty = "quality_metric_summary";

        const qualityMetricEmbeddedExists = file && file.quality_metric && object.itemUtil.atId(file.quality_metric);
        const qualityMetricSummaryExists = file && Array.isArray(file.quality_metric_summary) && file.quality_metric_summary.length > 0;

        if (qualityMetricSummaryExists){
            metrics = this.metricsFromSummary();
        } else if (qualityMetricEmbeddedExists){
            metrics = this.metricsFromEmbeddedReport();
            titleProperty = "quality_metric";
        } else if (hideIfNoValue){
            return null;
        }

        const tips = FileView.schemaForFile(file, schemas);

        return (
            <WrapInColumn wrap={wrapInColumn} defaultWrapClassName="col-sm-12">
                <div className="inner">
                <object.TooltipInfoIconContainerAuto result={file} property={titleProperty} tips={tips} elementType="h5" fallbackTitle="Quality Metric Summary" />
                    { metrics || (<em>Not Available</em>) }
                </div>
            </WrapInColumn>
        );
    }

}



/**
 * Reuse when showing related_files of an Item.
 */
export class RelatedFilesOverViewBlock extends React.PureComponent {

    static defaultProps = {
        'wrapInColumn' : true,
        'property' : 'related_files'
    };

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
        const { file, property, hideIfNoValue, schemas, wrapInColumn } = this.props;
        const tips = FileView.schemaForFile(file, schemas);

        var relatedFiles = this.relatedFiles();

        if (hideIfNoValue && !relatedFiles){
            return null;
        } else if (!relatedFiles) {
            relatedFiles = <li className="related-file"><em>None</em></li>;
        }

        return (
            <WrapInColumn wrap={wrapInColumn} defaultWrapClassName="col-sm-12">
                <div className="inner">
                    <object.TooltipInfoIconContainerAuto result={file} property={property || "related_files"} tips={tips} elementType="h5" fallbackTitle="Related Files" />
                    <ul className="overview-list-elements-container">{ relatedFiles }</ul>
                </div>
            </WrapInColumn>
        );
    }

}
