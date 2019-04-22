'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { Collapse, Button } from 'react-bootstrap';
import { console, object, isServerSide, expFxn, layout, Schemas, fileUtil, typedefs } from './../util';
import { ItemHeader, FlexibleDescriptionBox, HiGlassAjaxLoadContainer, HiGlassPlainContainer, AdjustableDividerRow, OverviewHeadingContainer } from './components';
import { OverViewBodyItem } from './DefaultItemView';
import WorkflowRunTracingView, { FileViewGraphSection } from './WorkflowRunTracingView';
import { RawFilesStackedTableExtendedColumns, ProcessedFilesStackedTable, ProcessedFilesQCStackedTable } from './../browse/components';
import { EmbeddedHiglassActions } from './../static-pages/components';
var { Item, File, ExperimentSet } = typedefs;

// import { SET } from './../testdata/experiment_set/replicate_4DNESXZ4FW4';
// import { SET } from './../testdata/experiment_set/replicate_with_bigwigs';


/**
 * ExperimentSet Item view/page.
 *
 * @prop {Object} schemas - state.schemas passed down from app Component.
 * @prop {ExperimentSet} context - JSON representation of current ExperimentSet item.
 */
export default class ExperimentSetView extends WorkflowRunTracingView {

    static propTypes = {
        'schemas' : PropTypes.object,
        'context' : PropTypes.object
    };

    constructor(props){
        super(props);
        this.isWorkflowNodeCurrentContext = this.isWorkflowNodeCurrentContext.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        var state = {
            // `selectedFiles` not currently used -- can be passed down to RawFilesStackedTableExtendedColumns eventually to enable selection & download.
            //'selectedFiles': new Set(),
            'mounted' : false
        };
        if (!this.state) this.state = state; // May inherit from WorkfowRunTracingView
        else _.extend(this.state, state);
    }

    static anyOtherProcessedFilesExist = memoize(function(context){
        var otherProcessedFilesFromExpSetExist = (Array.isArray(context.other_processed_files) && context.other_processed_files.length > 0);

        if (otherProcessedFilesFromExpSetExist){ // Ensure have permissions
            otherProcessedFilesFromExpSetExist = OtherProcessedFilesStackedTableSection.checkOPFCollectionsPermissions(context.other_processed_files);
        }
        var expsInSetExist = (Array.isArray(context.experiments_in_set) && context.experiments_in_set.length > 0);
        if (!otherProcessedFilesFromExpSetExist && !expsInSetExist) return false;

        if (expsInSetExist){
            var expsOPFCollections = _.pluck(context.experiments_in_set, 'other_processed_files');
            var otherProcessedFilesFromExpsExist = _.any(expsOPFCollections || [], OtherProcessedFilesStackedTableSection.checkOPFCollectionsPermissions);
            if (!otherProcessedFilesFromExpSetExist && !otherProcessedFilesFromExpsExist) return false;
        }
        return true;
    });

    isWorkflowNodeCurrentContext(node){
        var ctx = this.props.context;
        if (!ctx) return false;
        if (!node || !node.meta || !node.meta.run_data || !node.meta.run_data.file) return false;
        if (Array.isArray(node.meta.run_data.file)) return false;
        if (typeof node.meta.run_data.file.accession !== 'string') return false;
        if (!ctx.processed_files || !Array.isArray(ctx.processed_files) || ctx.processed_files.length === 0) return false;
        if (_.contains(_.pluck(ctx.processed_files, 'accession'), node.meta.run_data.file.accession)) return true;
        return false;
    }

    /**
     * Executed on width change, as well as this ItemView's prop change.
     */
    getTabViewContents(){
        var { context, schemas, windowWidth, href } = this.props;

        //context = SET;

        var processedFiles      = expFxn.allProcessedFilesFromExperimentSet(context),
            processedFilesLen   = (processedFiles && processedFiles.length) || 0,
            rawFiles            = expFxn.allFilesFromExperimentSet(context, false),
            rawFilesLen         = (rawFiles && rawFiles.length) || 0,
            width               = this.getTabViewWidth(),
            commonProps         = { width, context, schemas, windowWidth, href },
            tabs                = [];

        if (processedFilesLen > 0){

            // Processed Files Table Tab
            tabs.push({
                tab : <span><i className="icon icon-microchip icon-fw"/> { processedFilesLen } Processed File{ processedFilesLen > 1 ? 's' : '' }</span>,
                key : 'processed-files',
                content : <ProcessedFilesStackedTableSection files={processedFiles} {...commonProps} {...this.state} />
            });

        }

        // Raw files tab, if have experiments with raw files
        if (rawFilesLen > 0){
            tabs.push({
                tab : <span><i className="icon icon-leaf icon-fw"/> { rawFilesLen } Raw File{ rawFilesLen > 1 ? 's' : '' }</span>,
                key : 'raw-files',
                content : <RawFilesStackedTableSection files={rawFiles} {...commonProps} {...this.state} />
            });
        }

        if (processedFilesLen > 0){
            // Graph Section Tab
            tabs.push(FileViewGraphSection.getTabObject(
                _.extend({}, this.props, { 'isNodeCurrentContext' : this.isWorkflowNodeCurrentContext }),
                this.state,
                this.handleToggleAllRuns,
                width
            ));
        }

        // Other Files Tab
        if (ExperimentSetView.anyOtherProcessedFilesExist(context)){
            tabs.push({
                tab : <span><i className="icon icon-files-o icon-fw"/> Supplementary Files</span>,
                key : 'supplementary-files',
                content : <OtherProcessedFilesStackedTableSection {...commonProps} {...this.state} />
            });
        }

        return tabs.concat(this.getCommonTabs(this.props)).map((tabObj)=>{
            return _.extend(tabObj, {
                'style' : { minHeight : Math.max(this.state.mounted && !isServerSide() && (window.innerHeight - 180), 100) || 800 }
            });
        });

    }

    itemHeader(){
        return <ExperimentSetHeader {...this.props} />;
    }

    itemMidSection(){
        return (
            <React.Fragment>
                { super.itemMidSection() }
                <OverviewHeading context={this.props.context} schemas={this.props.schemas} key="overview"
                    className="with-background mb-2 mt-1" title="Experiment Set Properties" prependTitleIcon prependTitleIconFxn={(open, props)=>
                        <i className="expand-icon icon icon-th-list" />
                    } />
            </React.Fragment>
        );
    }
}



class OverviewHeading extends React.PureComponent {
    render(){
        var expSet = this.props.context;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), expSet);
        var commonProps = { 'result' : expSet, 'tips' : tips, 'wrapInColumn' : 'col-sm-6 col-md-3' };
        return (
            <OverviewHeadingContainer {...this.props}>
                {/* <OverViewBodyItem result={expSet} tips={tips} property='award.project' fallbackTitle="Project" wrapInColumn={col} /> */}
                <OverViewBodyItem {...commonProps} property='experimentset_type' fallbackTitle="Set Type" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.biosource.individual.organism' fallbackTitle="Organism" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.biosource.biosource_type' fallbackTitle="Biosource Type" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.biosource_summary' fallbackTitle="Biosource" />

                <OverViewBodyItem {...commonProps} property='experiments_in_set.experiment_type' fallbackTitle="Experiment Type(s)" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.experiment_categorizer.combined' fallbackTitle="Assay Details" titleRenderFxn={function(field, val, allowJX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li', fullObject = null){
                    var expCatObj = _.uniq(object.getNestedProperty(fullObject, 'experiments_in_set.experiment_categorizer'), false, 'combined');
                    expCatObj = (Array.isArray(expCatObj) && expCatObj.length === 1 && expCatObj[0]) || expCatObj;
                    if (expCatObj && expCatObj.combined && expCatObj.field && typeof expCatObj.value !== 'undefined'){
                        return <span><span className="text-500">{ expCatObj.field }:</span> { expCatObj.value }</span>;
                    }
                    return OverViewBodyItem.titleRenderPresets.default(...arguments);
                }} />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.modifications.modification_type' fallbackTitle="Modification Type" />
                <OverViewBodyItem {...commonProps} property='experiments_in_set.biosample.treatments.treatment_type' fallbackTitle="Treatment Type" />
            </OverviewHeadingContainer>
        );
    }
}




/**
 * Renders ItemHeader parts wrapped in ItemHeader.Wrapper, with appropriate values.
 *
 * @prop {Object} context - Same context prop as available on parent component.
 * @prop {string} href - Current page href, passed down from app or Redux store.
 */
class ExperimentSetHeader extends React.PureComponent {
    render() {
        if (this.props.debug) console.log('render ExperimentSetHeader');
        return (
            <ItemHeader.Wrapper {..._.pick(this.props, 'href', 'context', 'schemas', 'windowWidth')} className="exp-set-header-area">
                <ItemHeader.TopRow />
                <ItemHeader.MiddleRow />
                <ItemHeader.BottomRow />
            </ItemHeader.Wrapper>
        );
    }
}


export class RawFilesStackedTableSection extends React.PureComponent {
    render(){
        const { context, files } = this.props;
        const fileCount = files.length;
        const anyFilesWithMetrics = !!(ProcessedFilesQCStackedTable.filterFiles(files, true));

        return (
            <div className="overflow-hidden">
                <h3 className="tab-section-title">
                    <span className="text-400">{ fileCount }</span> Raw File{ fileCount > 1 ? 's' : '' }
                </h3>
                <div className="exp-table-container">
                    <RawFilesStackedTableExtendedColumns
                        {..._.pick(this.props, 'width', 'windowWidth', 'href')}
                        experimentSet={context}
                        showMetricColumns={anyFilesWithMetrics}
                        keepCounts={false}
                        collapseLongLists={true}
                        collapseLimit={10}
                        collapseShow={7}
                    />
                </div>
            </div>
        );
    }
}

/**
 * TODO: Move to HiGlassTabView.js ?
 */
export class HiGlassAdjustableWidthRow extends React.PureComponent {

    static propTypes = {
        'width' : PropTypes.number.isRequired,
        'mounted' : PropTypes.bool.isRequired,
        'renderRightPanel' : PropTypes.func,
        'windowWidth' : PropTypes.number.isRequired,
        'higlassItem' : PropTypes.object,
    };

    constructor(props){
        super(props);
        this.correctHiGlassTrackDimensions = _.debounce(this.correctHiGlassTrackDimensions.bind(this), 100);
        this.higlassContainerRef = React.createRef();
    }

    componentDidUpdate(pastProps){
        if (pastProps.width !== this.props.width){
            this.correctHiGlassTrackDimensions();
        }
    }

    /**
     * This is required because HiGlass doesn't always update all of own tracks' widths (always updates header, tho)
     */
    correctHiGlassTrackDimensions(){
        var internalHiGlassComponent = this.higlassContainerRef.current && this.higlassContainerRef.current.getHiGlassComponent();
        if (!internalHiGlassComponent) {
            console.warn('Internal HiGlass Component not accessible.');
            return;
        }
        setTimeout(HiGlassPlainContainer.correctTrackDimensions, 10, internalHiGlassComponent);
    }

    render(){
        var { mounted, width, children, renderRightPanel, renderLeftPanelPlaceholder, windowWidth,
            leftPanelDefaultCollapsed, leftPanelCollapseHeight, leftPanelCollapseWidth, higlassItem } = this.props;

        // Don't render the HiGlass view if it isn't mounted yet or there is nothing to display.
        if (!mounted || !higlassItem || !object.itemUtil.atId(higlassItem)) {
            return (renderRightPanel && renderRightPanel(width, null)) || children;
        }

        var minOpenHeight = 300,
            maxOpenHeight = 800;

        return (
            <AdjustableDividerRow {...{ width, mounted, leftPanelCollapseHeight, leftPanelDefaultCollapsed, renderRightPanel, windowWidth }}
                height={minOpenHeight} leftPanelClassName="expset-higlass-panel"
                leftPanelCollapseWidth={leftPanelCollapseWidth || 240} // TODO: Change to 240 after updating to HiGlass version w/ resize viewheader stuff fixed.
                renderLeftPanel={(leftPanelWidth, resetXOffset, collapsed, rightPanelHeight)=>{
                    if (collapsed){
                        var useHeight = leftPanelCollapseHeight || rightPanelHeight || minOpenHeight;
                        if (typeof renderLeftPanelPlaceholder === 'function'){
                            return renderLeftPanelPlaceholder(leftPanelWidth, resetXOffset, collapsed, useHeight);
                        } else {
                            return (
                                <h5 className="placeholder-for-higlass text-center clickable mb-0 mt-0" style={{ 'lineHeight': useHeight + 'px', 'height': useHeight }} onClick={resetXOffset}
                                    data-html data-place="right" data-tip="Open HiGlass Visualization for file(s)">
                                    <i className="icon icon-fw icon-television"/>
                                </h5>
                            );
                        }
                    } else {
                        return (
                            <React.Fragment>
                                <EmbeddedHiglassActions context={higlassItem} showDescription={false} />
                                <HiGlassAjaxLoadContainer higlassItem={higlassItem} className={collapsed ? 'disabled' : null} style={{'padding-top':'10px'}} height={Math.min(Math.max(rightPanelHeight - 16, minOpenHeight - 16), maxOpenHeight)} ref={this.higlassContainerRef} />
                            </React.Fragment>
                        );
                    }
                }}
                rightPanelClassName="exp-table-container" onDrag={this.correctHiGlassTrackDimensions} />
        );
    }
}


export class ProcessedFilesStackedTableSection extends React.PureComponent {

    /**
    * Searches the context for HiGlass static_content, and returns the HiGlassItem (except the viewconfig)
    * @param {object} context - Object that has static_content.
    * @return {object} Returns the HiGlassItem in the context (or null if it doesn't)
    */
    static getHiglassItemFromProcessedFiles = memoize(function(context){
        if (!("static_content" in context)) {
            return null;
        }

        // Look for any static_content sections with tab:processed-files as the location and return the first appearance.
        const higlassTab = _.find(context.static_content, function(section){
            return section.location === "tab:processed-files";
        });
        return (higlassTab ? higlassTab.content : null);
    });

    renderTopRow(){
        const { mounted, width, files, context, windowWidth, href } = this.props;

        if (!mounted) return null;

        const processedFilesTableProps = {
            files,
            windowWidth,
            href,
            'collapseLimit' : 10,
            'collapseShow' : 7
        };

        const higlassItem = ProcessedFilesStackedTableSection.getHiglassItemFromProcessedFiles(context);

        if (higlassItem && object.itemUtil.atId(higlassItem)){
            const hiGlassProps = { width, mounted, windowWidth, higlassItem };
            return (
                <HiGlassAdjustableWidthRow {...hiGlassProps} renderRightPanel={function(rightPanelWidth, resetDivider, leftPanelCollapsed){
                    return <ProcessedFilesStackedTable {...processedFilesTableProps} width={Math.max(rightPanelWidth, 320)} />;
                }} />
            );
        } else {
            return <ProcessedFilesStackedTable {...processedFilesTableProps} width={width}/>;
        }
    }

    renderQCMetricsTablesRow(){
        const { width, files, windowWidth, href } = this.props;
        const filesWithMetrics = ProcessedFilesQCStackedTable.filterFiles(files);

        if (!filesWithMetrics || filesWithMetrics.length === 0) return null;

        return (
            <div className="row">
                <div className="exp-table-container col-xs-12">
                    <h3 className="tab-section-title mt-12" key="tab-section-title-metrics">
                        <span>Quality Metrics</span>
                    </h3>
                    <ProcessedFilesQCStackedTable {...{ width, windowWidth, href }} key="metrics-table"
                        files={filesWithMetrics} collapseLimit={10} collapseShow={7} collapseLongLists={true} />
                </div>
            </div>
        );
    }

    render(){
        const { mounted, files } = this.props;

        if (!mounted) return null;

        return (
            <div className="processed-files-table-section exp-table-section">
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ files.length }</span> Processed Files</span>
                </h3>
                { this.renderTopRow() }
                { this.renderQCMetricsTablesRow() }
            </div>
        );
    }
}


export class OtherProcessedFilesStackedTableSectionPart extends React.PureComponent {

    static defaultProps = {
        'defaultOpen' : false
    };

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.renderFilesTable = this.renderFilesTable.bind(this);

        this.state = {
            'open'      : props.defaultOpen
        };
    }

    toggleOpen(e){
        this.setState(function(oldState){
            return { 'open' : !oldState.open };
        });
    }

    renderFilesTable(width, resetDividerFxn, leftPanelCollapsed){
        var { context, collection, href } = this.props;
        return (
            <ProcessedFilesStackedTable files={collection.files} width={width} collapseLongLists={true} href={href} />
        );
    }

    render(){
        const { collection, index, context, width, mounted, defaultOpen, windowWidth } = this.props;
        const files = collection.files;
        const open = this.state.open;
        const higlassItem = collection.higlass_view_config;
        return (
            <div data-open={open} className="supplementary-files-section-part" key={collection.title || 'collection-' + index}>
                <h4>
                    <span className="inline-block clickable" onClick={this.toggleOpen}>
                        <i className={"text-normal icon icon-fw icon-" + (open ? 'minus' : 'plus')} />
                        { collection.title || "Collection " + index } <span className="text-normal text-300">({ files.length } file{files.length === 1 ? '' : 's'})</span>
                    </span>
                </h4>
                { collection.description ?
                    <FlexibleDescriptionBox description={collection.description} className="description"
                        fitTo="grid" expanded={open} windowWidth={windowWidth} />
                    :
                    <div className="mb-15"/>
                }
                <Collapse in={open} mountOnEnter>
                    <div className="table-for-collection">
                        { higlassItem ?
                            <HiGlassAdjustableWidthRow higlassItem={higlassItem} windowWidth={windowWidth} mounted={mounted} width={width - 21}
                                renderRightPanel={this.renderFilesTable} leftPanelDefaultCollapsed={defaultOpen === false} />
                        : this.renderFilesTable(width - 21) }
                    </div>
                </Collapse>
            </div>
        );
    }
}

/**
* This object renders the "Supplementary Files" section.
*/
export class OtherProcessedFilesStackedTableSection extends React.PureComponent {

    static checkOPFCollectionPermission(opfCollection){
        return _.any(opfCollection.files || [], function(opf){
            return opf && object.itemUtil.atId(opf) && !opf.error;
        });
    }

    static checkOPFCollectionsPermissions(opfCollections){
        return _.any(opfCollections || [], OtherProcessedFilesStackedTableSection.checkOPFCollectionPermission);
    }

    static extendCollectionsWithExperimentFiles = memoize(function(context){
        // Clone -- so we don't modify props.context in place
        var collectionsFromExpSet = _.map(
            context.other_processed_files,
            function(opfCollection){
                return _.extend({}, opfCollection, {
                    'files' : _.map(opfCollection.files || [], function(opf){ return _.extend({ 'from_experiment_set' : context, 'from_experiment' : { 'from_experiment_set' : context, 'accession' : 'NONE' } }, opf); })
                });
            }
        );
        var collectionsFromExpSetTitles = _.pluck(collectionsFromExpSet, 'title');
        var collectionsByTitle = _.object(_.zip(collectionsFromExpSetTitles, collectionsFromExpSet)); // TODO what if 2 titles are identical? Validate/prevent on back-end.

        // Add 'from_experiment' info to each collection file so it gets put into right 'experiment' row in StackedTable.
        var collectionsFromExps = _.reduce(context.experiments_in_set || [], function(m, exp){
            if (Array.isArray(exp.other_processed_files) && exp.other_processed_files.length > 0){
                return m.concat(
                    _.map(exp.other_processed_files, function(opfCollection){
                        return _.extend({}, opfCollection, {
                            'files' : _.map(opfCollection.files || [], function(opf){ return _.extend({ 'from_experiment' : _.extend({ 'from_experiment_set' : context }, exp), 'from_experiment_set' : context }, opf); })
                        });
                    })
                );
            }
            return m;
        }, []);

        var collectionsFromExpsUnBubbled = [];
        _.forEach(collectionsFromExps, function(collection){
            if (collectionsByTitle[collection.title]){
                _.forEach(collection.files, function(f){
                    var duplicateExistingFile = _.find(collectionsByTitle[collection.title].files, function(existFile){ return (object.itemUtil.atId(existFile) || 'a') === (object.itemUtil.atId(f) || 'b'); });
                    if (duplicateExistingFile){
                        console.error('Found existing/duplicate file in ExperimentSet other_processed_files of Experiment File ' + f['@id']);
                    } else {
                        collectionsByTitle[collection.title].files.push(f);
                    }
                });
            } else {
                collectionsByTitle[collection.title] = collection;
            }
        });

        return _.filter(_.values(collectionsByTitle), OtherProcessedFilesStackedTableSection.checkOPFCollectionPermission);
    });

    render(){
        var { context, width, mounted, windowWidth } = this.props,
            gridState = mounted && layout.responsiveGridState(windowWidth),
            otherProcessedFileSetsCombined = OtherProcessedFilesStackedTableSection.extendCollectionsWithExperimentFiles(context);

        return (
            <div className="processed-files-table-section">
                <h3 className="tab-section-title">
                    <span className="text-400">{ otherProcessedFileSetsCombined.length }</span> Collections of Supplementary Files
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { _.map(otherProcessedFileSetsCombined, (collection, index, all) => {
                    var defaultOpen = (gridState === 'sm' || gridState === 'xs' || !gridState) ? false : ((all.length < 4) || (index < 2));
                    return <OtherProcessedFilesStackedTableSectionPart {...{ collection, index, context, width, mounted, windowWidth }} key={index} defaultOpen={defaultOpen} />;
                }) }
            </div>
        );
    }
}
