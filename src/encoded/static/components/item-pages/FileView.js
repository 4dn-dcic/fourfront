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
import { OverViewBodyItem } from './DefaultItemView';
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




class FileViewOverview extends React.Component {

    static getTabObject({context, schemas, windowWidth }, width){
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
                    <FileViewOverview {...{ context, width, windowWidth, schemas }} />
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
        var { context, windowWidth, width, schemas } = this.props,
            experimentSetUrls = expFxn.experimentSetsFromFile(context, 'ids');

        return (
            <div>
                <FileOverViewBody {...{ context, schemas, windowWidth }} />
                { experimentSetUrls && experimentSetUrls.length > 0 ?
                    <ExperimentSetTablesLoaded {...{ experimentSetUrls, width, windowWidth }} defaultOpenIndices={[0]} id={object.itemUtil.atId(context)} />
                : null }
            </div>
        );
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
        const { context, schemas } = this.props;
        const tips = FileView.schemaForFile(context, schemas);
        var commonProps = { tips, 'result' : context, 'wrapInColumn' : "col-sm-3 col-lg-3" };
        return [
            <OverViewBodyItem {...commonProps} key="file_format" property='file_format' fallbackTitle="File Format" />,
            <OverViewBodyItem {...commonProps} key="file_type" property='file_type' fallbackTitle="File Type" />,
            <OverViewBodyItem {...commonProps} key="file_classification" property='file_classification' fallbackTitle="General Classification" />,
            <OverViewBodyItem {...commonProps} key="file_size" property='file_size' fallbackTitle="File Size" titleRenderFxn={function(field, value){
                return <span className="text-400"><i className="icon icon-fw icon-hdd-o"/> { Schemas.Term.toName('file_size', value) }</span>;
            }} />
        ];
    }

    render(){
        var responsiveSize = layout.responsiveGridState(this.props.windowWidth);
        var isSmallerSize = this.state.mounted && (responsiveSize === 'xs' || responsiveSize === 'sm');
        return (
            <div className={"row" + (!isSmallerSize ? ' flexrow' : '')}>
                <div className="col-xs-12 col-md-9 col-lg-8">
                    <OverviewHeadingContainer onStartClose={this.onTransitionUnsetOpen} onFinishOpen={this.onTransitionSetOpen} children={this.overviewBlocks()}/>
                </div>
                <div className="col-xs-12 col-md-3 col-lg-4 mt-1 mb-3">
                    <FileViewDownloadButtonContainer file={this.props.context} size="lg" verticallyCentered={!isSmallerSize && this.state.isPropertiesOpen} />
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





export function FileVisualizationButtons(props){

    const { file } = this.props;

    var fileFormat              = fileUtil.getFileFormatStr(file),
        fileIsPublic            = (file.status === 'archived' || file.status === 'released'),
        fileIsHic               = (fileFormat === 'hic'),
        genome_assembly         = ("genome_assembly" in file) ? file.genome_assembly : null,
        fileHref                = file.href,
        pageHref                = this.props.href || (store && store.getState().href),
        hrefParts               = url.parse(pageHref),
        host                    = hrefParts.protocol + '//' + hrefParts.host,
        juiceBoxBtn             = this.renderJuiceboxlLink(fileHref, fileIsHic, fileIsPublic, host),
        epigenomeBtn            = this.renderEpigenomeLink(fileHref, fileIsHic, fileIsPublic, host, genome_assembly);
}


export class FileOverViewBody extends React.PureComponent {

    /**
     * Add a link to an external JuiceBox site for some file types.
     * @param {string} fileHref          - URL path used to access the file
     * @param {boolean} fileIsHic        - If true the file format is HiC
     * @param {boolean} fileIsPublic     - If true the file can be publicly viewed
     * @param {string} host              - The host part of the current url
     *
     * @returns {JSX.Element|null} A button which opens up file to be viewed at HiGlass onClick, or void.
     */
    renderJuiceboxlLink(fileHref, fileIsHic, fileIsPublic, host){



        var externalLinkButton = null;
        // Do not show the link if the file cannot be viewed by the public.
        if (fileIsHic && fileIsPublic) {

            // Make an external juicebox link.
            var onClick = function(evt){

                // If we're on the server side, there is no need to make an external link.
                if (isServerSide()) return null;

                var targetLocation = "http://aidenlab.org/juicebox/?hicUrl=" + host + fileHref;
                var win = window.open(targetLocation, '_blank');
                win.focus();
            };

            // Build the juicebox button
            externalLinkButton = (
                <Button bsStyle="primary" onClick={onClick} className="mr-05">
                    <span className="text-400">Visualize with</span> JuiceBox&nbsp;&nbsp;<i className="icon icon-fw icon-external-link text-small" style={{ position: 'relative', 'top' : 1 }}/>
                </Button>
            );
        }

        // Return the External link.
        return externalLinkButton;
    }

    /**
     * Add a link to an external Epigenome site for some file types.
     * @param {string} fileHref          - URL path used to access the file
     * @param {boolean} fileIsHic        - If true the file format is HiC
     * @param {boolean} fileIsPublic     - If true the file can be publicly viewed
     * @param {string} host              - The host part of the current url
     * @param {string} genome_assembly   - The file's genome assembly
     *
     * @returns {JSX.Element|null} A button which opens up file to be viewed at HiGlass onClick, or void.
     */
    renderEpigenomeLink(fileHref, fileIsHic, fileIsPublic, host, genome_assembly) {
        var externalLinkButton = null;

        // We may need to map the genome assembly to Epigenome's assemblies.
        const assemblyMap = {
            'GRCh38' : 'hg38',
            'GRCm38' : 'mm10'
        };

        // If the file lacks a genome assembly or it isn't in the expected mappings, do not show the button.
        if (!(genome_assembly && genome_assembly in assemblyMap)) {
            return null;
        }

        // Do not show the link if the file cannot be viewed by the public.
        if (fileIsHic && fileIsPublic) {
            // Make an external juicebox link.
            var onClick = function(evt){

                // If we're on the server side, there is no need to make an external link.
                if (isServerSide()) return null;

                const epiGenomeMapping = assemblyMap[genome_assembly];
                var targetLocation  = "http://epigenomegateway.wustl.edu/browser/?genome=" + epiGenomeMapping + "&hicUrl=" + host + fileHref;

                var win = window.open(targetLocation, '_blank');
                win.focus();
            };

            // Build the Epigenome button
            externalLinkButton = (
                <Button bsStyle="primary" onClick={onClick}>
                    <span className="text-400 ml-05">Visualize with</span> Epigenome Browser&nbsp;&nbsp;<i className="icon icon-fw icon-external-link text-small" style={{ position: 'relative', 'top' : 1 }}/>
                </Button>
            );
        }

        // Return the External link.
        return externalLinkButton;
    }

    /**
     * Generate the HTML markup for external visualization links.
     **/
    visualizeExternallyButton(){
        var file                    = this.props.result,
            fileFormat              = fileUtil.getFileFormatStr(file),
            fileIsPublic            = (file.status === 'archived' || file.status === 'released'),
            fileIsHic               = (fileFormat === 'hic'),
            genome_assembly         = ("genome_assembly" in file) ? file.genome_assembly : null,
            fileHref                = file.href,
            pageHref                = this.props.href || (store && store.getState().href),
            hrefParts               = url.parse(pageHref),
            host                    = hrefParts.protocol + '//' + hrefParts.host,
            juiceBoxBtn             = this.renderJuiceboxlLink(fileHref, fileIsHic, fileIsPublic, host),
            epigenomeBtn            = this.renderEpigenomeLink(fileHref, fileIsHic, fileIsPublic, host, genome_assembly);

        if (!juiceBoxBtn && !epigenomeBtn){
            return null;
        }

        return (
            <div className="inner col-xs-12">
                <div className="inner">
                    <h5>{ "Visualization" + (juiceBoxBtn && epigenomeBtn ? 's' : '') }</h5>
                    { juiceBoxBtn }
                    { epigenomeBtn }
                </div>
            </div>
        );
    }

    render(){
        const { context, schemas } = this.props;
        const extVizButton = this.visualizeExternallyButton();
        return (
            <div className="row overview-blocks">
                { extVizButton }
                <QualityControlResults property="quality_metric" file={context} wrapInColumn="col-md-6" schemas={schemas} />
                <RelatedFilesOverViewBlock file={context} property="related_files" wrapInColumn="col-md-6" hideIfNoValue schemas={schemas} />
            </div>
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

        var elem = (
            <div className="inner">
                <object.TooltipInfoIconContainerAuto result={file} property={property} tips={tips} elementType="h5" fallbackTitle="Quality Metric Results" />
                <div className="overview-list-elements-container">{ (noValue && (<em>Not Available</em>)) || this.metrics() }</div>
            </div>
        );

        if (wrapInColumn){
            return <div className={typeof wrapInColumn === 'string' ? wrapInColumn : "col-sm-12"}>{ elem }</div>;
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
