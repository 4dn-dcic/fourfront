'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';

import { console, object, commonFileUtil } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { expFxn } from './../util';

import { EmbeddedItemSearchTable } from './components/tables/ItemPageTable';
import { ExperimentSetsTableTabView } from './components/tables/ExperimentSetTables';
import { SimpleFilesTable, SimpleFilesTableLoaded } from './components/tables/SimpleFilesTable';
import { Publications } from './components/Publications';
import { OverviewHeadingContainer } from './components/OverviewHeadingContainer';
import { SelectedFilesController, uniqueFileCount } from './../browse/components/SelectedFilesController';
import { SelectedFilesDownloadButton } from './../browse/components/above-table-controls/SelectedFilesDownloadButton';
import { ProcessedFilesStackedTable, RawFilesStackedTableExtendedColumns, QCMetricsTable } from './../browse/components/file-tables';

import { OverViewBodyItem, StaticHeadersArea } from './DefaultItemView';
import WorkflowRunTracingView, { FileViewGraphSection } from './WorkflowRunTracingView';


export default class ExperimentView extends WorkflowRunTracingView {

    static processedFilesWithViewPermissions = memoize(function(context){
        return Array.isArray(context.processed_files) && _.filter(context.processed_files, function(rf){
            if (rf.error && !object.itemUtil.atId(rf)) return false;
            return true;
        });
    });

    static rawFilesWithViewPermissions = memoize(function(context){
        const { files = null } = context;
        return Array.isArray(files) && _.filter(files, function(rf){
            if (rf.error && !object.itemUtil.atId(rf)) return false;
            return true;
        });
    });

    /** Preserve selected files if href changes (due to `#tab-id`), unlike the default setting for BrowseView. */
    static resetSelectedFilesCheck(nextProps, pastProps){
        if (nextProps.context !== pastProps.context) return true;
        return false;
    }

    static defaultOpenIndices = [0];

    constructor(props){
        super(props);
        this.shouldGraphExist = this.shouldGraphExist.bind(this);
        this.isNodeCurrentContext = this.isNodeCurrentContext.bind(this);
        this.allFilesFromExperiment = memoize(expFxn.allFilesFromExperiment);
        this.allProcessedFilesFromExperiments = memoize(expFxn.allProcessedFilesFromExperiments);

        /**
         * Explicit self-assignment to remind that we inherit the following properties from WorkfowRunTracingView:
         * `loadingGraphSteps`, `allRuns`, `steps`, & `mounted`
         */
        this.state = this.state;
    }

    shouldGraphExist(){
        const { context } = this.props;
        const processedFilesWithViewPermissions = ExperimentView.processedFilesWithViewPermissions(context);
        return !!(processedFilesWithViewPermissions && processedFilesWithViewPermissions.length > 0);
    }

    getFilesTabs(){
        const { context, schemas, windowWidth, href, session, mounted } = this.props;
        const width = this.getTabViewWidth();
        const tabs = [];

        const extendedExp = _.extend({ from_experiment_set: { accession: 'NONE' } }, context);
        
        const commonProps = { width, context, schemas, windowWidth, href, session, mounted };
        const propsForTableSections = _.extend(SelectedFilesController.pick(this.props), commonProps);

        const processedFiles = this.allProcessedFilesFromExperiments([extendedExp]);
        const processedFilesLen = (processedFiles && processedFiles.length) || 0;

        if (processedFilesLen > 0) {
            tabs.push({
                tab: (
                    <span>
                        <i className="icon icon-microchip fas icon-fw" />
                        {processedFilesLen + " Processed File" + (processedFilesLen === 1 ? "" : "s")}
                    </span>
                ),
                key: 'processed-files',
                content: (
                    <SelectedFilesController resetSelectedFilesCheck={ExperimentView.resetSelectedFilesCheck} initiallySelectedFiles={processedFiles}>
                        <ExperimentProcessedFilesStackedTableSection {...propsForTableSections} files={processedFiles} />
                    </SelectedFilesController>
                )
            });
        }

        const rawFiles = this.allFilesFromExperiment(extendedExp, false, false);
        const rawFilesLen = (rawFiles && rawFiles.length) || 0;

        if (rawFilesLen > 0) {
            tabs.push({
                tab : (
                    <span>
                        <i className="icon icon-leaf fas icon-fw"/>
                        { rawFilesLen + " Raw File" + (rawFilesLen === 1 ? "" : "s") }
                    </span>
                ),
                key : 'raw-files',
                content: (
                    <SelectedFilesController resetSelectedFilesCheck={ExperimentView.resetSelectedFilesCheck} initiallySelectedFiles={rawFiles}>
                        <ExperimentRawFilesStackedTableSection {...propsForTableSections} files={rawFiles} />
                    </SelectedFilesController>
                )
            });
        }

        return tabs;
    }

    isNodeCurrentContext(node){
        const { context } = this.props;
        if (!context) return false;
        if (!node || !node.meta || !node.meta.run_data || !node.meta.run_data.file) return false;
        if (Array.isArray(node.meta.run_data.file)) return false;
        if (typeof node.meta.run_data.file.accession !== 'string') return false;
        if (!context.processed_files || !Array.isArray(context.processed_files) || context.processed_files === 0) return false;
        if (_.contains(_.pluck(context.processed_files, 'accession'), node.meta.run_data.file.accession)) return true;
        return false;
    }

    /**
     * This function is called by base class (DefaultItemView) render method to grab list of JS Objects which describe the Tabs and their content.
     * Properties which should be on the Objects within list are:
     *   'tab'      - React elements ascribing the 'title' of the tab (and any icons next to it.
     *   'key'      - Any unique string (among all tabs).
     *   'disabled' - Whether tab should appear grayed out and unclickable, e.g. for a graph which is still loading.
     *   'content'  - What is to be displayed in the body of the tab.
     *
     * @returns {{ tab : JSX.Element, key: string, disabled: boolean, content: JSX.Element }[]} List of JSON objects representing Tabs and their content.
     */
    getTabViewContents(){
        const { context } = this.props;
        const { accession } = context;
        const width = this.getTabViewWidth();
        const initTabs = [];

        // ExpSets
        if (accession && parentExpSetsExistForExp(context)){ // 'Experiment Sets' tab, if any parent exp-sets.

            initTabs.push(ExperimentSetsTableTabView.getTabObject({
                ...this.props,
                width,
                'facets' : null,
                'searchHref' : "/search/?type=ExperimentSet&experiments_in_set.accession=" + encodeURIComponent(accession),
                'defaultOpenIndices': ExperimentView.defaultOpenIndices,
            }));

        }
        // Raw/Processed/Supplementary Files
        initTabs.push(...this.getFilesTabs());
        // Graph
        if (this.shouldGraphExist()){
            initTabs.push(FileViewGraphSection.getTabObject(
                _.extend({}, this.props, { 'isNodeCurrentContext' : this.isNodeCurrentContext }),
                this.state,
                this.handleToggleAllRuns,
                width
            ));
        }

        return initTabs.concat(this.getCommonTabs());
    }

    /**
     * What is to be displayed at top left of page, under title, to the left of accession (if any).
     *
     * @returns {{ title: string|JSX.Element, description: string }} JS Object ascribing what to display.
     */
    typeInfo(){
        const experimentType = expFxn.getExperimentTypeStr(this.props.context);
        if (experimentType){
            return {
                'title' : experimentType,
                'description' : "Type of Experiment"
            };
        }
        return null;
    }

    /**
     * What is to be displayed below Item description and above the TabbedView, if anything. Can return an array or single item.
     *
     * @returns {JSX.Element[]} React elements or components to display between Item header and Item TabbedView.
     */
    itemMidSection(){
        const { context } = this.props;
        return (
            <React.Fragment>
                <Publications.PublicationBelowHeaderRow publication={context.produced_in_pub} />
                <StaticHeadersArea context={context} />
                <OverviewHeading context={context} />
            </React.Fragment>
        );
    }

}



export class ExperimentMicView extends ExperimentView {
    /** Uses OverviewHeadingMic instead of OverviewHeading as in ExperimentView. */
    itemMidSection(){
        return (
            <React.Fragment>
                <Publications.PublicationBelowHeaderRow publication={this.props.context.produced_in_pub} />
                <StaticHeadersArea context={this.props.context} key="static-headers-area" />
                <OverviewHeadingMic context={this.props.context} />
            </React.Fragment>
        );
    }
}


const parentExpSetsExistForExp = memoize(function(exp){
    return (exp && Array.isArray(exp.experiment_sets) && exp.experiment_sets.length > 0 && object.atIdFromObject(exp.experiment_sets[0]));
});


/**
 * This is rendered in middle of ExperimentView, between Item header and TabbedView.
 * @see ExperimentView.itemMidSection()
 */
const OverviewHeading = React.memo(function OverviewHeading(props){
    const { context, schemas } = props;
    const { biosample } = context;
    const tips = object.tipsFromSchema(schemas, context); // In form of { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
    const tipsForBiosample = object.tipsFromSchema(schemas, _.extend({ '@type' : ['Biosample', 'Item'] }, biosample));
    const commonProps = {
        'tips'          : tips,                 // Object containing 'properties' from Schema for Experiment ItemType. Informs the property title (from schema) & tooltip you get when hover over property title. Obtained from schemas.
        'result'        : context,              // The Item from which are getting value for 'property'.
        'wrapInColumn'  : "col-6 col-md-3"   // Optional. Size of the block. @see http://getbootstrap.com/docs/3.3/examples/grid/.
    };
    const commonBioProps = _.extend({ 'tips' : tipsForBiosample, 'result' : biosample }, { 'wrapInColumn' : commonProps.wrapInColumn });

    return (
        <OverviewHeadingContainer>
            <OverViewBodyItem {...commonProps} property="experiment_type" fallbackTitle="Experiment Type" />
            <OverViewBodyItem {...commonProps} property="follows_sop" fallbackTitle="Follows SOP" fallbackValue="No" />
            <OverViewBodyItem {...commonProps} property="biosample" fallbackTitle="Biosample" />
            <OverViewBodyItem {...commonProps} property="digestion_enzyme" fallbackTitle="Digestion Enzyme" />
            <OverViewBodyItem {...commonBioProps} property="modifications_summary" fallbackTitle="Biosample Modifications" />
            <OverViewBodyItem {...commonBioProps} property="treatments_summary" fallbackTitle="Biosample Treatments" />
            <OverViewBodyItem {...commonBioProps} property="biosource" fallbackTitle="Biosample Biosource" />
        </OverviewHeadingContainer>
    );
});

/**
 * This is rendered in middle of ExperimentView, between Item header and TabbedView.
 * @see ExperimentView.itemMidSection()
 */
const OverviewHeadingMic = React.memo(function OverviewHeadingMic(props){
    const { context: exp, schemas } = props;
    const tips = object.tipsFromSchema(schemas, exp); // In form of { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
    const tipsForBiosample = object.tipsFromSchema(schemas, _.extend({ '@type' : ['Biosample', 'Item'] }, exp.biosample));
    const commonProps = {
        'tips'          : tips,                 // Object containing 'properties' from Schema for Experiment ItemType. Informs the property title (from schema) & tooltip you get when hover over property title. Obtained from schemas.
        'result'        : exp,                  // The Item from which are getting value for 'property'.
        'wrapInColumn'  : "col-6 col-md-3"   // Optional. Size of the block. @see http://getbootstrap.com/docs/3.3/examples/grid/.
    };
    const commonBioProps = _.extend({ 'tips' : tipsForBiosample, 'result' : exp.biosample }, { 'wrapInColumn' : commonProps.wrapInColumn });

    return (
        <OverviewHeadingContainer>
            <OverViewBodyItem {...commonProps} property="experiment_type" fallbackTitle="Experiment Type" />
            <OverViewBodyItem {...commonProps} property="follows_sop" fallbackTitle="Follows SOP" fallbackValue="No" />
            <OverViewBodyItem {...commonProps} property="biosample" fallbackTitle="Biosample" />
            <OverViewBodyItem {...commonBioProps} property="biosource" fallbackTitle="Biosample Biosource" />
            <OverViewBodyItem {...commonBioProps} property="modifications_summary" fallbackTitle="Biosample Modifications" />
            <OverViewBodyItem {...commonBioProps} property="treatments_summary" fallbackTitle="Biosample Treatments" />
            <OverViewBodyItem {...commonProps} property="microscopy_technique" fallbackTitle="Microscopy Technique" />
            <OverViewBodyItem {...commonProps} property="microscope_qc" fallbackTitle="Microscope Quality Control" />

            <OverViewBodyItem {...commonProps} property="sample_image" fallbackTitle="Sample Image"
                wrapInColumn="col-12 col-md-3" singleItemClassName="block"
                titleRenderFxn={OverViewBodyItem.titleRenderPresets.embedded_item_with_image_attachment} hideIfNoValue />

            <OverViewBodyItem {...commonProps} property="imaging_paths" fallbackTitle="Imaging Paths"
                wrapInColumn="col-12 col-md-9 pull-right" listItemElement="div" listWrapperElement="div" singleItemClassName="block"
                titleRenderFxn={OverViewBodyItem.titleRenderPresets.imaging_paths_from_exp} collapseLimit={3} collapseShow={2} />

        </OverviewHeadingContainer>
    );
});


const RawFilesTableSection = React.memo(function RawFilesTableSection(props){
    const { files, context, width, schemas } = props;
    const { uuid: expUUID } = context || {};
    const columns = _.clone(SimpleFilesTable.defaultProps.columns);

    columns['related_files'] = {
        'title' : 'Relations',
        'minColumnWidth' : 120,
        'render' : function(result, columnDefinition, props, width){
            var related_files = _.map(_.filter(result.related_files, function(rF){ return rF.file && object.atIdFromObject(rF.file); }), function(fContainer, i){
                var link = object.atIdFromObject(fContainer.file);
                var title = typeof fContainer.file.accession === 'string' ? <span className="text-monospace">{fContainer.file.accession}</span> : fContainer.file.display_title;
                return <span key={link || i}>{ fContainer.relationship_type } { link ? <a href={link}>{ title }</a> : title }</span>;
            });
            return related_files;
        }
    };

    // Add column for paired end if any files have one.
    if (_.any(files, function(f) { return typeof f.paired_end !== 'undefined'; })){
        columns['paired_end'] = {
            "title" : 'End',
            'widthMap' : { 'sm' : 30, 'md' : 40, 'lg' : 50 },
            'minColumnWidth' : 30
        };
    }

    // Get all files which have expUUID in experiments.uuid[] excluding reference and processed files.
    const searchHref = `/search/?type=File&experiments.uuid=${encodeURIComponent(expUUID)}&type%21=FileProcessed&type%21=FileReference`;

    return (
        <div className="raw-files-table-section">
            <h3 className="tab-section-title">
                <span><span className="text-400">{ files.length }</span> Raw File{ files.length === 1 ? '' : 's' }</span>
            </h3>
            <EmbeddedItemSearchTable {...{ searchHref, schemas, columns, width }} facets={null} />
        </div>
    );
});

class ExperimentRawFilesStackedTableSection extends React.PureComponent {

    static selectedFilesUniqueCount = memoize(uniqueFileCount);

    renderHeader(){
        const { context, files, selectedFiles, session } = this.props;
        const selectedFilesUniqueCount = ExperimentRawFilesStackedTableSection.selectedFilesUniqueCount(selectedFiles);
        const fileCount = files.length;
        const filenamePrefix = (context.accession || context.display_title) + "_raw_files_";

        return (
            <h3 className="tab-section-title">
                <span className="text-400">{ fileCount }</span>{ ' Raw File' + (fileCount > 1 ? 's' : '')}
                { selectedFiles ? // Make sure data structure is present (even if empty)
                    <div className="download-button-container pull-right" style={{ marginTop : -10 }}>
                        <SelectedFilesDownloadButton {...{ selectedFiles, filenamePrefix, context, session }} disabled={selectedFilesUniqueCount === 0}
                            id="exp-raw-files-download-files-btn" analyticsAddFilesToCart>
                            <i className="icon icon-download fas icon-fw mr-07 align-baseline"/>
                            <span className="d-none d-sm-inline">Download </span>
                            <span className="count-to-download-integer">{ selectedFilesUniqueCount }</span>
                            <span className="d-none d-sm-inline text-400"> Raw Files</span>
                        </SelectedFilesDownloadButton>
                    </div>
                    : null }
            </h3>
        );
    }

    render(){
        const { context, files } = this.props;
        const anyFilesWithMetrics = !!(commonFileUtil.filterFilesWithEmbeddedMetricItem(files, true));
        return (
            <div className="overflow-hidden">
                { this.renderHeader() }
                <div className="exp-table-container">
                    <RawFilesStackedTableExtendedColumns {..._.extend(_.pick(this.props, 'width', 'windowWidth', 'href'), SelectedFilesController.pick(this.props))}
                        experiment={context} showMetricColumns={anyFilesWithMetrics} collapseLongLists={true} collapseLimit={10} collapseShow={7}
                        incrementalExpandLimit={100} incrementalExpandStep={100} analyticsImpressionOnMount />
                </div>
            </div>
        );
    }
}

const ProcessedFilesTableSection = React.memo(function ProcessedFilesTableSection(props){
    const { files, context, schemas } = props;
    //const { uuid: expUUID } = context;
    const fileUrls = _.map(files, object.itemUtil.atId);
    //const searchHref = `/search/?type=FileProcessed&experiments.uuid=${encodeURIComponent(expUUID)}`;
    return (
        <div className="processed-files-table-section">
            <h3 className="tab-section-title">
                <span><span className="text-400">{ files.length }</span> Processed File{ files.length === 1 ? '' : 's' }</span>
            </h3>
            {/* <EmbeddedItemSearchTable {...{ searchHref, schemas }} facets={null} /> */}
            <SimpleFilesTableLoaded {..._.pick(props, 'schemas', 'width')} fileUrls={fileUrls} id={object.itemUtil.atId(context)} />
        </div>
    );
});

class ExperimentProcessedFilesStackedTableSection extends React.PureComponent {

    /**
     * Searches the context for HiGlass static_content, and returns the HiGlassItem (except the viewconfig).
     *
     * @param {object} context - Object that has static_content.
     * @return {object} Returns the HiGlassItem in the context (or null if it doesn't)
     */
    static getHiglassItemFromProcessedFiles = memoize(function(context){
        if (!Array.isArray(context.static_content)){
            return null;
        }

        // Return the first appearance of a HiglassViewConfig Item located at "tab:processed-files"
        const higlassTab = _.find(context.static_content, function(section){
            return section.location === "tab:processed-files" && isHiglassViewConfigItem(section.content);
        });

        return (higlassTab ? higlassTab.content : null);
    });

    static tableProps(sectionProps){
        return _.extend(
            _.pick(sectionProps, 'files', 'windowWidth', 'href'),
            { 'collapseLimit': 10, 'collapseShow': 7, 'incrementalExpandLimit': 100, 'incrementalExpandStep': 100, 'analyticsImpressionOnMount': true },
            SelectedFilesController.pick(sectionProps)
        );
    }

    static selectedFilesUniqueCount = memoize(uniqueFileCount);

    constructor(props){
        super(props);
        _.bindAll(this, 'renderHeader', 'renderTopRow', 'renderProcessedFilesTableAsRightPanel');
    }

    renderHeader(){
        const { context, files, selectedFiles, session } = this.props;

        const selectedFilesUniqueCount = ExperimentProcessedFilesStackedTableSection.selectedFilesUniqueCount(selectedFiles);
        const filenamePrefix = (context.accession || context.display_title) + "_processed_files_";
        return (
            <h3 className="tab-section-title">
                <span>
                    <span className="text-400">{files.length}</span> Processed Files
                </span>
                {selectedFiles ? // Make sure data structure is present (even if empty)
                    <div className="download-button-container pull-right" style={{ marginTop: -10 }}>
                        <SelectedFilesDownloadButton {...{ selectedFiles, filenamePrefix, context, session }} disabled={selectedFilesUniqueCount === 0}
                            id="expset-processed-files-download-files-btn" analyticsAddFilesToCart>
                            <i className="icon icon-download icon-fw fas mr-07 align-baseline" />
                            <span className="d-none d-sm-inline">Download </span>
                            <span className="count-to-download-integer">{selectedFilesUniqueCount}</span>
                            <span className="d-none d-sm-inline text-400"> Processed Files</span>
                        </SelectedFilesDownloadButton>
                    </div>
                    : null}
            </h3>
        );
    }

    renderProcessedFilesTableAsRightPanel(rightPanelWidth, resetDivider, leftPanelCollapsed){
        return <ProcessedFilesStackedTable {...ExperimentProcessedFilesStackedTableSection.tableProps(this.props)} width={Math.max(rightPanelWidth, 320)} key="p-table" />;
    }

    renderTopRow(){
        const { mounted, width, context, windowWidth, selectedFiles } = this.props;

        const higlassItem = ExperimentProcessedFilesStackedTableSection.getHiglassItemFromProcessedFiles(context);

        if (higlassItem && object.itemUtil.atId(higlassItem)){
            // selectedFiles passed in to re-render panel if changes.
            return <HiGlassAdjustableWidthRow {...{ width, mounted, windowWidth, higlassItem, selectedFiles }} renderRightPanel={this.renderProcessedFilesTableAsRightPanel} />;
        } else {
            return <ProcessedFilesStackedTable {...ExperimentProcessedFilesStackedTableSection.tableProps(this.props)} width={width} key="p-table"/>;
        }
    }

    render(){
        const { context, session, files, selectedFiles } = this.props;
        return (
            <div className="processed-files-table-section exp-table-section">
                {this.renderHeader()}
                {this.renderTopRow()}
                <QCMetricsTable {...this.props} />
            </div>
        );
    }
}