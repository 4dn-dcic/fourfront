'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import memoize from 'memoize-one';

import { isServerSide, console, object, layout, valueTransforms, commonFileUtil, memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { getItemType } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/schema-transforms';
import { expFxn, Schemas, fileUtil } from './../util';
import { store } from './../../store';

import { SearchTableTitle } from './components/tables/ItemPageTable';
import { ExperimentSetsTableTabView, EmbeddedExperimentSetSearchTable } from './components/tables/ExperimentSetTables';
import { OverviewHeadingContainer } from './components/OverviewHeadingContainer';
import { OverViewBodyItem, WrapInColumn } from './DefaultItemView';
import WorkflowRunTracingView, { FileViewGraphSection } from './WorkflowRunTracingView';
import { QualityControlResults } from './QualityMetricView';

// UNCOMMENT FOR TESTING
// import * as SAMPLE_VIEWCONFIGS from './../testdata/higlass_sample_viewconfigs';
// import { test_file } from './../testdata/file/fastq-unreleased-expset';
// import { FILE } from './../testdata/file/processed-bw';


/** Container for all of the tabs on a File page. */
export default class FileView extends WorkflowRunTracingView {

    /**
     * Returns schema properties for this File @type, in form of:
     * { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
     */
    static schemaForFile = memoize(function(context, schemas){
        return object.tipsFromSchema(schemas, context);
    });

    constructor(props){
        super(props);
        this.shouldGraphExist = this.shouldGraphExist.bind(this);
    }

    componentDidMount(){
        super.componentDidMount();
    }

    shouldGraphExist(){
        const { context } = this.props;
        return (
            (Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0)
            // We can uncomment below line once do permissions checking on backend for graphing
            //&& _.any(context.workflow_run_outputs, object.itemUtil.atId)
        );
    }

    getTabViewContents(){
        const { context } = this.props;
        const width = this.getTabViewWidth();
        const tabs = [];

        tabs.push(FileViewOverview.getTabObject(this.props, width));

        if (getItemType(context) === 'FileReference') {
            const expSetTableProps = {
                ...this.props,
                width,
                'searchHref': (
                    "/browse/?type=ExperimentSet&" +
                    "experiments_in_set.reference_files.accession=" + context.accession
                ),
                'facets' : null
            };

            tabs.push(ExperimentSetsTableTabView.getTabObject(expSetTableProps));
        }

        if (this.shouldGraphExist(context)){
            tabs.push(FileViewGraphSection.getTabObject(this.props, this.state, this.handleToggleAllRuns, width));
        }

        return tabs.concat(this.getCommonTabs(this.props));
    }

    itemMidSection(){
        return (
            <React.Fragment>
                { super.itemMidSection() }
                <FileOverviewHeading {..._.pick(this.props, 'context', 'schemas', 'windowWidth', 'session')} />
            </React.Fragment>
        );
    }

}



function FileViewOverview (props) {
    const { context, windowWidth, width, schemas, href } = props;
    const experimentSets = expFxn.experimentSetsFromFile(context, 'list');
    const searchHref =
        experimentSets && experimentSets.length > 0 ?
            '/search/?type=ExperimentSet&accession=' + _.pluck(experimentSets, 'accession').join('&accession=')
            : null;
    const { track_and_facet_info: { experiment_bucket = null } = {} } = context || {};

    let targetTabKey = null;
    if (experiment_bucket && typeof experiment_bucket === 'string') {
        if (experiment_bucket === 'raw file') {
            targetTabKey = 'raw-files';
        } else if (experiment_bucket === 'processed file') {
            targetTabKey = 'processed-files';
        } else {
            targetTabKey = 'supplementary-files';
        }
    }
    const expSetTableProps = {
        searchHref,
        facets: null,
        defaultOpenIndices: [0],
        title: <SearchTableTitle title="Experiment Set" externalSearchLinkVisible={false} />,
        targetTabKey
    };
    return (
        <div>
            <div className="row overview-blocks">
                <ExternalVisualizationButtons file={context} href={href} wrapInColumn="col-12" />
                <QualityControlResults file={context} wrapInColumn="col-md-6" hideIfNoValue schemas={schemas} />
                <RelatedFilesOverViewBlock file={context} property="related_files" wrapInColumn="col-md-6" hideIfNoValue schemas={schemas} />
            </div>
            {searchHref ? <EmbeddedExperimentSetSearchTable {...expSetTableProps} /> : null }
        </div>
    );
}
FileViewOverview.propTypes = {
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
FileViewOverview.getTabObject = function({ context, schemas, windowWidth, href }, width){
    return {
        'tab' : <span><i className="icon icon-file-alt fas icon-fw"/> Overview</span>,
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
};


export class FileOverviewHeading extends React.PureComponent {

    static fileSizeTitleRenderFxn(field, value){
        return <span className="text-400"><i className="icon icon-fw icon-hdd far"/> { Schemas.Term.toName(field, value) }</span>;
    }
    static fileClassificationRenderFxn(field, value, allowJX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li', fullObject = null) {
        const classification = Schemas.Term.toName(field, value);
        const { track_and_facet_info: { experiment_bucket = null } = {} } = fullObject || {};
        const isSupplementary  = experiment_bucket &&  typeof experiment_bucket === 'string' && experiment_bucket != 'raw file' && experiment_bucket != 'processed file';
        return (
            <React.Fragment>
                {classification}
                {isSupplementary ? <br /> : null}
                {isSupplementary ? '(Supplementary)' : null}
            </React.Fragment>
        );
    }

    constructor(props){
        super(props);
        this.onTransitionSetOpen = this.onTransition.bind(this, true);
        this.onTransitionUnsetOpen = this.onTransition.bind(this, false);
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
        const { context, schemas, windowWidth, session } = this.props;
        const { mounted, isPropertiesOpen } = this.state;
        const gridState = layout.responsiveGridState(windowWidth);
        const isSmallerSize = mounted && (gridState === "xs" || gridState === "sm");
        const commonHeadingBlockProps = { "tips" : FileView.schemaForFile(context, schemas), "result" : context, "wrapInColumn" : "col-sm-6 col-lg-3" };
        return (
            <div className="row">
                <div className="col-12 col-md-8">
                    <OverviewHeadingContainer onStartClose={this.onTransitionUnsetOpen} onFinishOpen={this.onTransitionSetOpen}>
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_format" property="file_format" fallbackTitle="File Format" />
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_type" property="file_type" fallbackTitle="File Type" />
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_classification" property="file_classification"
                            fallbackTitle="General Classification" titleRenderFxn={FileOverviewHeading.fileClassificationRenderFxn} />
                        <OverViewBodyItem {...commonHeadingBlockProps} key="file_size" property="file_size"
                            fallbackTitle="File Size" titleRenderFxn={FileOverviewHeading.fileSizeTitleRenderFxn} />
                        {/* <OverViewBodyItem {...commonHeadingBlockProps} key="microscope_configuration" property="microscope_configuration"
                            fallbackTitle="Microscope Configuration" wrapInColumn={"col-12 col-md-6"} /> */}
                    </OverviewHeadingContainer>
                </div>
                <div className="col-12 col-md-4 mt-1 mb-3">
                    <FileViewDownloadButtonContainer file={context} size="lg" verticallyCentered={!isSmallerSize && isPropertiesOpen} session={session} />
                </div>

            </div>
        );
    }
}


export function FileViewDownloadButtonContainer(props){
    const { className, size = null, file, context, result, session } = props;
    const fileToUse = file || context || result;
    return (
        <div className={"file-download-container" + (className ? " " + className : "")}>
            <fileUtil.FileDownloadButtonAuto result={fileToUse} size={size} session={session} />
        </div>
    );
}


export class ExternalVisualizationButtons extends React.PureComponent {

    static defaultProps = {
        'wrapInColumn' : "col-12",
        'className' : "inner"
    };

    /**
     * Add a link to an external JuiceBox site for some file types.
     * @param {string} fileHref - URL used to access the file
     * @returns {JSX.Element|null} A button which opens up file to be viewed at HiGlass onClick, or void.
     */
    renderJuiceboxBtn(fileHref){
        const btnHref = "http://aidenlab.org/juicebox/?hicUrl=" + fileHref;
        return (
            <a href={btnHref} className="btn btn-primary mr-05" target="_blank" rel="noreferrer noopener">
                <span className="text-400">Visualize with</span> JuiceBox&nbsp;&nbsp;<i className="icon icon-fw icon-external-link-alt text-small fas align-baseline"/>
            </a>
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

        const btnHref = "http://epigenomegateway.wustl.edu/browser/?genome=" + genome + "&hicUrl=" + fileHref;
        return (
            <a href={btnHref} target="_blank" rel="noreferrer noopener" className="btn btn-primary">
                <span className="text-400 ml-05">Visualize with</span> Epigenome Browser&nbsp;&nbsp;
                <i className="icon icon-fw icon-external-link-alt text-small fas align-baseline"/>
            </a>
        );
    }

    render(){
        const { file, wrapInColumn, className } = this.props;
        const { open_data_url } = file || {};
        let epigenomeBtn, juiceBoxBtn;

        if (!(file.status === 'archived' || file.status === 'released')){
            return null; // External tools cannot access non-released files.
        }
        if (!open_data_url){
            return null;
        }

        const fileFormat = commonFileUtil.getFileFormatStr(file);
        if (fileFormat === 'hic'){
            juiceBoxBtn = this.renderJuiceboxBtn(open_data_url);
            epigenomeBtn = this.renderEpigenomeBtn(open_data_url, file.genome_assembly || null);
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