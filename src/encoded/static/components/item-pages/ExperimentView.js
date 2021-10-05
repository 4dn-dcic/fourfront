'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';

import Collapse from 'react-bootstrap/esm/Collapse';
import { FlexibleDescriptionBox } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/FlexibleDescriptionBox';
import { console, object, layout, commonFileUtil } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { expFxn, Schemas } from './../util';

import { EmbeddedItemSearchTable } from './components/tables/ItemPageTable';
import { ExperimentSetsTableTabView } from './components/tables/ExperimentSetTables';
import { SimpleFilesTable, SimpleFilesTableLoaded } from './components/tables/SimpleFilesTable';
import { Publications } from './components/Publications';
import { HiGlassAdjustableWidthRow } from './HiGlassViewConfigView';
import { isHiglassViewConfigItem } from './components/HiGlass/HiGlassPlainContainer';
import { OverviewHeadingContainer } from './components/OverviewHeadingContainer';
import { SelectedFilesController, uniqueFileCount } from './../browse/components/SelectedFilesController';
import { SelectedFilesDownloadButton } from './../browse/components/above-table-controls/SelectedFilesDownloadButton';
import { ProcessedFilesStackedTable, RawFilesStackedTableExtendedColumns, QCMetricsTable } from './../browse/components/file-tables';

import { OverViewBodyItem, StaticHeadersArea } from './DefaultItemView';
import WorkflowRunTracingView, { FileViewGraphSection } from './WorkflowRunTracingView';


export default class ExperimentView extends WorkflowRunTracingView {

    static shouldShowSupplementaryFilesTabView = memoize(function(context){
        const opfCollections = ExperimentSupplementaryFilesTabView.combinedOtherProcessedFiles(context);
        const referenceFiles = ExperimentSupplementaryFilesTabView.allReferenceFiles(context);
        return (opfCollections.length > 0 || referenceFiles.length > 0);
    });

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
        const { context, schemas, windowWidth, href, session } = this.props;
        const { mounted } = this.state;
        const width = this.getTabViewWidth();
        const tabs = [];

        const extendedExp = _.extend({ from_experiment_set: { accession: 'NONE' } }, context);
        
        const commonProps = { width, context, schemas, windowWidth, href, session, mounted };
        const propsForTableSections = _.extend(SelectedFilesController.pick(this.props), commonProps);

        const processedFiles = this.allProcessedFilesFromExperiments([extendedExp]);
        const processedFilesUniqueLen = (processedFiles && processedFiles.length && ExperimentProcessedFilesStackedTableSection.allFilesUniqueCount(processedFiles)) || 0;

        if (processedFilesUniqueLen > 0) {
            tabs.push({
                tab: (
                    <span>
                        <i className="icon icon-microchip fas icon-fw" />
                        {processedFilesUniqueLen + " Processed File" + (processedFilesUniqueLen === 1 ? "" : "s")}
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
        const rawFilesUniqueLen = (rawFiles && rawFiles.length && ExperimentRawFilesStackedTableSection.allFilesUniqueCount(rawFiles)) || 0;

        if (rawFilesUniqueLen > 0) {
            tabs.push({
                tab : (
                    <span>
                        <i className="icon icon-leaf fas icon-fw"/>
                        { rawFilesUniqueLen + " Raw File" + (rawFilesUniqueLen === 1 ? "" : "s") }
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

        // Supplementary Files Tab
        if (ExperimentView.shouldShowSupplementaryFilesTabView(context)){
            tabs.push({
                tab : <span><i className="icon icon-copy far icon-fw"/> Supplementary Files</span>,
                key : 'supplementary-files',
                content: (
                    <SelectedFilesController resetSelectedFilesCheck={ExperimentView.resetSelectedFilesCheck} initiallySelectedFiles={[]/*allFiles*/}>
                        <ExperimentSupplementaryFilesTabView {...propsForTableSections} {...this.state} />
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
                titleRenderFxn={OverViewBodyItem.titleRenderPresets.imaging_paths_from_exp} collapseLimit={5} collapseShow={4} />

        </OverviewHeadingContainer>
    );
});

class ExperimentRawFilesStackedTableSection extends React.PureComponent {

    static selectedFilesUniqueCount = memoize(uniqueFileCount);
    static allFilesUniqueCount = memoize(uniqueFileCount);

    renderHeader(){
        const { context, files, selectedFiles, session } = this.props;
        const allFilesUniqueCount = ExperimentRawFilesStackedTableSection.allFilesUniqueCount(files);
        const selectedFilesUniqueCount = ExperimentRawFilesStackedTableSection.selectedFilesUniqueCount(selectedFiles);
        const filenamePrefix = (context.accession || context.display_title) + "_raw_files_";

        return (
            <h3 className="tab-section-title">
                <span className="text-400">{ allFilesUniqueCount }</span>{ ' Raw File' + (allFilesUniqueCount > 1 ? 's' : '')}
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

    static allFilesUniqueCount = memoize(uniqueFileCount);
    static selectedFilesUniqueCount = memoize(uniqueFileCount);

    constructor(props){
        super(props);
        _.bindAll(this, 'renderHeader', 'renderTopRow', 'renderProcessedFilesTableAsRightPanel');
    }

    renderHeader(){
        const { context, files, selectedFiles, session } = this.props;

        const allFilesUniqueCount = ExperimentProcessedFilesStackedTableSection.allFilesUniqueCount(files);
        const selectedFilesUniqueCount = ExperimentProcessedFilesStackedTableSection.selectedFilesUniqueCount(selectedFiles);
        const filenamePrefix = (context.accession || context.display_title) + "_processed_files_";
        return (
            <h3 className="tab-section-title">
                <span>
                    <span className="text-400">{allFilesUniqueCount}</span> Processed Files
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

class ExperimentSupplementaryFilesOPFCollection extends React.PureComponent {

    static collectionStatus = function(files){
        const statuses = _.uniq(_.pluck(files, 'status'));
        const len = statuses.length;
        if (len === 1){
            return statuses[0];
        } else if (len > 1) {
            return statuses;
        }
        return null;
    }

    static defaultProps = {
        'defaultOpen' : false
    };

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.renderFilesTable = this.renderFilesTable.bind(this);
        // Usually have >1 SupplementaryFilesOPFCollection on page so we memoize at instance level not class level.
        this.collectionStatus = memoize(ExperimentSupplementaryFilesOPFCollection.collectionStatus);

        this.state = {
            'open' : props.defaultOpen
        };
    }

    toggleOpen(e){
        this.setState(function(oldState){
            return { 'open' : !oldState.open };
        });
    }

    renderFilesTable(width, resetDividerFxn, leftPanelCollapsed){
        const { collection, href } = this.props;
        const passProps = _.extend({ width, href }, SelectedFilesController.pick(this.props));
        return (
            <ProcessedFilesStackedTable {...passProps} files={collection.files} collapseLongLists analyticsImpressionOnMount />
        );
    }

    renderStatusIndicator(){
        const { collection } = this.props;
        const { files, description } = collection;
        const status = this.collectionStatus(files);
        if (!status) return null;

        const outerClsName = "d-inline-block pull-right mr-12 ml-2 mt-1";
        if (typeof status === 'string'){
            const capitalizedStatus = Schemas.Term.toName("status", status);
            return (
                <div data-tip={"Status for all files in this collection is " + capitalizedStatus} className={outerClsName}>
                    <i className="item-status-indicator-dot mr-07" data-status={status} />
                    { capitalizedStatus }
                </div>
            );
        } else {
            const capitalizedStatuses = _.map(status, Schemas.Term.toName.bind(null, "status"));
            return (
                <div data-tip={"All files in collection have one of the following statuses - " + capitalizedStatuses.join(', ')} className={outerClsName}>
                    <span className="indicators-collection d-inline-block mr-05">
                        { _.map(status, function(s){ return <i className="item-status-indicator-dot mr-02" data-status={s} />; }) }
                    </span>
                    Multiple
                </div>
            );
        }
    }

    render(){
        const { collection, index, width, mounted, defaultOpen, windowWidth, href, selectedFiles } = this.props;
        const { files, higlass_view_config, description, title } = collection;
        const { open } = this.state;
        const qcMetricsHeading = (
            <h4 className="text-500 mt-2 mb-1">
                <span>Quality Metrics</span>
            </h4>
        );

        return (
            <div data-open={open} className="supplementary-files-section-part" key={title || 'collection-' + index}>
                { this.renderStatusIndicator() }
                <h4>
                    <span className="d-inline-block clickable" onClick={this.toggleOpen}>
                        <i className={"text-normal icon icon-fw fas icon-" + (open ? 'minus' : 'plus')} />
                        { title || "Collection " + index } <span className="text-normal text-300">({ files.length } file{files.length === 1 ? '' : 's'})</span>
                    </span>
                </h4>
                { description ?
                    <FlexibleDescriptionBox description={description} className="description"
                        fitTo="grid" expanded={open} windowWidth={windowWidth} />
                    : <div className="mb-15"/>
                }
                <Collapse in={open} mountOnEnter>
                    <div className="table-for-collection">
                        { higlass_view_config ?
                            <HiGlassAdjustableWidthRow higlassItem={higlass_view_config} windowWidth={windowWidth} mounted={mounted} width={width - 21}
                                renderRightPanel={this.renderFilesTable} selectedFiles={selectedFiles} leftPanelDefaultCollapsed={defaultOpen === false} />
                            : this.renderFilesTable(width - 21) }
                        <QCMetricsTable {...{ 'width': width - 20, windowWidth, href, files, 'heading': qcMetricsHeading }} />
                    </div>
                </Collapse>
            </div>
        );
    }
}


class ExperimentSupplementaryReferenceFilesSection extends React.PureComponent {

    static defaultProps = {
        'defaultOpen' : true,
        'columnHeaders' : (function(){
            const colHeaders = ProcessedFilesStackedTable.defaultProps.columnHeaders.slice();
            colHeaders.push({
                columnClass: 'file-detail', title: 'Status', initialWidth: 30, field : "status",
                render : function(file, field, detailIndex, fileEntryBlockProps){
                    const capitalizedStatus = Schemas.Term.toName("status", file.status);
                    return <i className="item-status-indicator-dot" data-status={file.status} data-tip={capitalizedStatus} />;
                }
            });
            return colHeaders;
        })()
    };

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = { 'open' : props.defaultOpen };
    }

    toggleOpen(e){
        this.setState(function({ open  }){
            return { 'open' : !open };
        });
    }

    render(){
        const { files, width, href, columnHeaders } = this.props;
        const { open } = this.state;
        const filesLen = files.length;
        const passProps = _.extend({ width : width - 21, href, files }, SelectedFilesController.pick(this.props));
        return (
            <div data-open={open} className="reference-files-section supplementary-files-section-part">
                <h4 className="mb-15">
                    <span className="d-inline-block clickable" onClick={this.toggleOpen}>
                        <i className={"text-normal icon icon-fw fas icon-" + (open ? 'minus' : 'plus')} />
                        { filesLen + " Reference File" + (filesLen > 1 ? "s" : "") }
                    </span>
                </h4>
                <Collapse in={open} mountOnEnter>
                    <div className="table-for-collection">
                        <ProcessedFilesStackedTable {...passProps} files={files} columnHeaders={columnHeaders} />
                    </div>
                </Collapse>
            </div>
        );
    }
}

class ExperimentSupplementaryFilesTabView extends React.PureComponent {

    static selectedFilesUniqueCount = memoize(uniqueFileCount);

    /** @returns {boolean} true if at least one file inside the collection is viewable */
    static checkOPFCollectionPermission({ files }){
        return _.any(files || [], function(file){
            return file && object.itemUtil.atId(file) && !file.error;
        });
    }

    /** @returns {boolean} true if at least one collection has at least one file inside the collection that is viewable */
    static checkOPFCollectionsPermissions(opfCollections){
        return _.any(opfCollections || [], ExperimentSupplementaryFilesTabView.checkOPFCollectionPermission);
    }

    /**
     * Combines files from Experiment.other_processed_files
     *
     * @param {Experiment} context - JSON response from server for this endpoint/page depicting an Experiment.
     * @returns {{ files: File[], title: string, type: string, description: string }[]} List of uniqued-by-title viewable collections.
     */
    static combinedOtherProcessedFiles = memoize(function(context){

        const collectionsByTitle = {};
        const experiment = _.extend({}, context);

        const allCollectionsFromExperiment = [];
        _.forEach(experiment.other_processed_files || [], function(collection){
            const { files : origFiles } = collection;
            const files = _.map(origFiles || [], function(file){
                return _.extend({ 'from_experiment' : _.extend({ 'from_experiment_set' : {'accession': 'NONE'} }, experiment), 'from_experiment_set' : {'accession': 'NONE'} }, file);
            });
            allCollectionsFromExperiment.push(_.extend({}, collection, { files }));
        });

        _.forEach(allCollectionsFromExperiment, function(collection){
            const { title, files, description } = collection;
            if (collectionsByTitle[title]){ // Same title exists already from ExpSet.other_processed_files or another Experiment.other_processed_files.
                // Add in files unless is already present (== duplicate).
                _.forEach(files, function(f){
                    const duplicateExistingFile = _.find(collectionsByTitle[title].files, function(existFile){
                        return (object.itemUtil.atId(existFile) || 'a') === (object.itemUtil.atId(f) || 'b');
                    });
                    if (duplicateExistingFile){
                        logger.error('Found existing/duplicate file in other_processed_files of Experiment File ' + f['@id']);
                        // TODO send to analytics?
                    } else {
                        collectionsByTitle[title].files.push(f);
                    }
                });
                //clone description from exp's OPF if expset's OPF collection's missing
                collectionsByTitle[title].description = collectionsByTitle[title].description || description;
            } else {
                collectionsByTitle[title] = collection;
            }
        });

        // Ensure have view permissions
        return _.filter(_.values(collectionsByTitle), ExperimentSupplementaryFilesTabView.checkOPFCollectionPermission);
    });

    static allReferenceFiles = memoize(function(context){
        // We keep track of duplicates and add a "from_experiment.accessions" property if any to help mark/ID
        // it as being present on multiple experiments.
        // Alternatively we might have been able to set "from_experiment.accession" (no "s") to "NONE" but this
        // would imply that is attached to ExperimentSet and not Experiment for metadata.tsv stuff later down the road
        // and present issues.
        // Also changing "from_experiment" to an array is a bit more of a pain than ideal...

        const experiment = _.extend({}, context);

        const referenceFilesByAtID = new Map(); // We use map to ensure we keep order of first encounter.

        _.forEach(experiment.reference_files || [], function (file) {
            // Add "from_experiment" and "from_experiment_set" to allow to be properly distributed in stacked block table.
            // Also for metadata TSV downloads.
            const fileAtID = object.itemUtil.atId(file);
            const existingFile = referenceFilesByAtID.get(fileAtID);
            if (existingFile) {
                if (!Array.isArray(existingFile.from_experiment.from_multiple_accessions)) {
                    existingFile.from_experiment.from_multiple_accessions = [existingFile.from_experiment.accession];
                }
                // We assume there's no duplicate reference files within a single experiment
                existingFile.from_experiment.from_multiple_accessions.push(experiment.accession);
                return;
            } else {
                // Add "from_experiment" and "from_experiment_set" to allow to be properly distributed in stacked block table.
                // Also for metadata TSV downloads.
                const extendedFile = _.extend({}, file, {
                    'from_experiment': _.extend({}, experiment, {
                        'from_experiment_set': {'accession': 'NONE'}
                    }),
                    'from_experiment_set': {'accession': 'NONE'}
                });
                referenceFilesByAtID.set(fileAtID, extendedFile);
            }
        });

        return [ ...referenceFilesByAtID.values() ];
    });

    render(){
        const { context, session, width, mounted, windowWidth, href, selectedFiles } = this.props;
        const gridState = mounted && layout.responsiveGridState(windowWidth);
        const otherProcessedFileSetsCombined = ExperimentSupplementaryFilesTabView.combinedOtherProcessedFiles(context);
        const otherProcessedFileSetsCombinedLen = otherProcessedFileSetsCombined.length;

        const referenceFiles = ExperimentSupplementaryFilesTabView.allReferenceFiles(context);
        const referenceFilesLen = referenceFiles.length;

        const titleDetailString = (
            (referenceFilesLen > 0 ? (referenceFilesLen + " Reference File" + (referenceFilesLen > 1 ? "s" : "")) : "") +
            (otherProcessedFileSetsCombinedLen > 0 && referenceFilesLen > 0 ? " and " : '') +
            (otherProcessedFileSetsCombinedLen > 0 ? (otherProcessedFileSetsCombinedLen + " Processed Files Collection" + (otherProcessedFileSetsCombinedLen > 1 ? "s" : "")) : '')
        );

        const selectedFilesUniqueCount = ExperimentSupplementaryFilesTabView.selectedFilesUniqueCount(selectedFiles);

        const commonProps = { context, width, mounted, windowWidth, href, ...SelectedFilesController.pick(this.props) };

        const filenamePrefix = (context.accession || context.display_title) + "_supp_files_";
        // TODO: Metadata.tsv stuff needs to be setup before we can select files from other_processed_files & reference_files
        //const commonProps = _.extend({ context, width, mounted, windowWidth }, SelectedFilesController.pick(this.props));

        return (
            <div className="processed-files-table-section">
                <h3 className="tab-section-title">
                    Supplementary Files
                    { titleDetailString.length > 0 ? <span className="small">&nbsp;&nbsp; &bull; {titleDetailString}</span> : null }
                    {selectedFiles ? // Make sure data structure is present (even if empty)
                        <div className="download-button-container pull-right" style={{ marginTop: -10 }}>
                            <SelectedFilesDownloadButton {...{ selectedFiles, filenamePrefix, context, session }} disabled={selectedFilesUniqueCount === 0}
                                id="expset-raw-files-download-files-btn" analyticsAddFilesToCart>
                                <i className="icon icon-download fas icon-fw mr-07 align-baseline" />
                                <span className="d-none d-sm-inline">Download </span>
                                <span className="count-to-download-integer">{selectedFilesUniqueCount}</span>
                                <span className="d-none d-sm-inline text-400"> Supplementary Files</span>
                            </SelectedFilesDownloadButton>
                        </div>
                        : null}
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { referenceFilesLen > 0 ?
                    <ExperimentSupplementaryReferenceFilesSection {...commonProps} files={referenceFiles} />
                    : null }
                { _.map(otherProcessedFileSetsCombined, function(collection, index, all){
                    const defaultOpen = (gridState === 'sm' || gridState === 'xs' || !gridState) ? false : ((all.length < 4) || (index < 2));
                    return <ExperimentSupplementaryFilesOPFCollection {..._.extend({ collection, index, defaultOpen }, commonProps)} key={index} />;
                }) }
            </div>
        );
    }
}