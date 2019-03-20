'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { Collapse, Button } from 'react-bootstrap';
import { console, object, isServerSide, expFxn, layout, Schemas, fileUtil, typedefs } from './../util';
import { ItemHeader, FlexibleDescriptionBox, HiGlassAjaxLoadContainer, HiGlassContainer, HiGlassPlainContainer, AdjustableDividerRow, OverviewHeadingContainer } from './components';
import { OverViewBodyItem } from './DefaultItemView';
import WorkflowRunTracingView, { FileViewGraphSection } from './WorkflowRunTracingView';
import { RawFilesStackedTable, RawFilesStackedTableExtendedColumns, ProcessedFilesStackedTable, ProcessedFilesQCStackedTable } from './../browse/components';
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
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
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
        var { context, schemas, windowWidth } = this.props;

        //context = SET;

        var processedFiles  = expFxn.allProcessedFilesFromExperimentSet(context),
            rawFiles        = expFxn.allFilesFromExperimentSet(context, false),
            width           = this.getTabViewWidth(),
            commonProps     = { width, context, schemas, windowWidth },
            tabs            = [];

        if (processedFiles && processedFiles.length > 0){

            // Processed Files Table Tab
            tabs.push({
                tab : <span><i className="icon icon-microchip icon-fw"/> Processed Files</span>,
                key : 'processed-files',
                content : <ProcessedFilesStackedTableSection files={processedFiles} {...commonProps} {...this.state} />
            });

        }

        // Raw files tab, if have experiments with raw files
        if (Array.isArray(context.experiments_in_set) && context.experiments_in_set.length > 0 && Array.isArray(rawFiles) && rawFiles.length > 0){
            tabs.push({
                tab : <span><i className="icon icon-leaf icon-fw"/> Raw Files</span>,
                key : 'raw-files',
                content : <RawFilesStackedTableSection files={rawFiles} {...commonProps} {...this.state} />
            });
        }

        if (processedFiles && processedFiles.length > 0){

            // Graph Section Tab
            if (Array.isArray(context.processed_files) && context.processed_files.length > 0){
                tabs.push(FileViewGraphSection.getTabObject(
                    _.extend({}, this.props, { 'isNodeCurrentContext' : this.isWorkflowNodeCurrentContext }),
                    this.state,
                    this.handleToggleAllRuns,
                    width
                ));
            }
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

        var { context, files } = this.props;

        var fileCount = files.length,
            expSetCount = (context.experiments_in_set && context.experiments_in_set.length) || 0,
            anyFilesWithMetrics = !!(ProcessedFilesQCStackedTable.filterFiles(files, true));

        return (
            <div className="exp-table-section">
                { expSetCount ?
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ fileCount }</span> Raw Files</span>
                </h3>
                : null }
                <div className="exp-table-container">
                    <RawFilesStackedTableExtendedColumns
                        {..._.pick(this.props, 'width', 'windowWidth', 'facets')}
                        experimentSetType={this.props.context.experimentset_type}
                        showMetricColumns={anyFilesWithMetrics}
                        experimentSetAccession={this.props.context.accession || null}
                        experimentArray={this.props.context.experiments_in_set}
                        replicateExpsArray={this.props.context.replicate_exps}
                        keepCounts={false}
                        //columnHeaders={expTableColumnHeaders}
                        collapseLongLists={true}
                        collapseLimit={10}
                        collapseShow={7}
                    />
                    {/* filesWithMetrics.length ? [
                        <h3 className="tab-section-title mt-12">
                            <span>Quality Metrics</span>
                        </h3>,
                        <RawFilesQCStackedTable
                            files={filesWithMetrics}
                            width={this.props.width}
                            experimentSetAccession={this.props.context.accession || null}
                            experimentArray={this.props.context.experiments_in_set}
                            replicateExpsArray={this.props.context.replicate_exps}
                            collapseLongLists={true}
                        />
                    ] : null */}
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
        'files'  : PropTypes.array,
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
        if (this.props.file && pastProps.width !== this.props.width){
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

    collapsedToolTipContent(){
        var fileTitles = _.filter(_.map(this.props.files, function(f){
            return f.accession || f.display_title || null;
        }));
        if (fileTitles.length > 3){
            fileTitles = fileTitles.slice(0, 2);
            fileTitles.push('...');
        }
        return "Open HiGlass Visualization for file(s)&nbsp; <span class='text-600'>" + ( fileTitles.join(', ') ) + "</span>&nbsp;&nbsp;&nbsp;<i class='icon icon-arrow-right'></i>";
    }

    render(){
        var { mounted, width, files, children, renderRightPanel, renderLeftPanelPlaceholder, windowWidth,
            leftPanelDefaultCollapsed, leftPanelCollapseHeight, leftPanelCollapseWidth, higlassItem } = this.props;
        if (!files || !mounted) return (renderRightPanel && renderRightPanel(width, null)) || children;

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
                                    data-html data-place="right" data-tip={this.collapsedToolTipContent()}>
                                    <i className="icon icon-fw icon-television"/>
                                </h5>
                            );
                        }
                    } else {
                        // TODO: Adjust heights
                        return (
                            <React.Fragment>
                                <EmbeddedHiglassActions context={higlassItem} />
                                <HiGlassAjaxLoadContainer higlassItem={higlassItem} className={collapsed ? 'disabled' : null} height={Math.min(Math.max(rightPanelHeight + 16, minOpenHeight), maxOpenHeight)} ref={this.higlassContainerRef} />
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
     * Renderer for "columnClass" : "file" column definition.
     * It takes a different param signature than ordinary file-detail columns, which accept `file`, `fieldName`, `headerIndex`, and `fileEntryBlockProps`.
     *
     * @param {File} file - File for row/column.
     * @param {{ expTable: { props: { leftPanelCollapsed: boolean, resetDivider: function }}}} tableProps - Props passed down from FileEntryBlock, including reference to parent StackedTable as expTable.
     * @param {Object} param - Props passed in from a FileEntryBlock.
     * @param {string} param.fileAtId - The atId of current file.
     * @param {string} param.fileTitleString - The title of current of file.
     * @returns {?JSX.Element}
     */
    static renderFileColumn(file, tableProps, { fileAtId, fileTitleString }){
        var className = file.accession ? 'mono-text' : null,
            fileFormat = fileUtil.getFileFormatStr(file),
            title = fileAtId ? <a href={fileAtId} className={className} children={fileTitleString}/> : <div className={className} children={fileTitleString}/>,
            tb = (tableProps && tableProps.expTable && tableProps.expTable.props) || {},
            collapsibleAndCollapsed = tb.leftPanelCollapsed && typeof tb.resetDivider === 'function';

        if (file && file.higlass_uid && (
            (fileFormat && ['mcool', 'bg', 'bw', 'bed', 'beddb'].indexOf(fileFormat))
            || (file.file_type_detailed && (
                file.file_type_detailed.indexOf('(mcool)')  > -1 ||
                file.file_type_detailed.indexOf('(bw)')     > -1 ||
                file.file_type_detailed.indexOf('(bg)')     > -1 ||
                file.file_type_detailed.indexOf('(bed)')    > -1 ||
                file.file_type_detailed.indexOf('(bigbed)') > -1 ||
                file.file_type_detailed.indexOf('(beddb)')  > -1
            ))
        )){

            // I think the idea behind this was to allow Files to be dragged from table and into HiGlass workspace or something.
            // It's not complete in many ways and probably now deprecated re: viewconfigs-as-items, so likely safe to remove.
            var onDragStart = function(evt){
                if (!evt || !evt.dataTransfer) return;
                // evt.dataTransfer.setData('text/4dn-item-context', JSON.stringify(file));
                evt.dataTransfer.setData('text/higlass-tileset-info', JSON.stringify({ 'tilesetUid' : file.higlass_uid, 'genome_assembly' : file.genome_assembly, 'file_format' : fileFormat }));
            };

            // Currently-visualized MCOOL File HiGlass Indicator
            if (Array.isArray(tb.currentlyVisualizedFiles) && _.map(tb.currentlyVisualizedFiles, object.itemUtil.atId).indexOf(fileAtId) > -1){
                var hiGlassIndicatorProps = _.extend({
                        'className' : "indicator-higlass-available" + (collapsibleAndCollapsed ? ' clickable in-stacked-table-button' : ' in-stacked-table-icon-indicator')
                    }, collapsibleAndCollapsed ? {
                        'onClick' : tb.resetDivider,
                        'bsSize' : 'xs',
                        'bsStyle' : 'primary'
                    } : {}),
                    childIcon = <i className="icon icon-fw icon-television text-smaller" data-tip={"This file " + (!collapsibleAndCollapsed && typeof tb.leftPanelCollapsed === 'boolean' ? "is being" : "may be") + " visualized with the HiGlass browser."} />,
                    hiGlassIndicator = collapsibleAndCollapsed ? <Button {...hiGlassIndicatorProps} children={childIcon}/> : <span {...hiGlassIndicatorProps}><i className="icon icon-angle-left" style={{ marginRight : 4 }}/>{ childIcon }</span>;
                return <span onDragStart={onDragStart}>{ title } { hiGlassIndicator }</span>;
            }
            return <span onDragStart={onDragStart}>{title}</span>; // TODO: Buttons to make this actively-visualized file.
        }
        return null; // Fallback to default title renderer.
    }

    /** Never changes ... */
    static extendedColumnHeaders = memoize(function(){
        /** Add in extended 'file' column render fxn */
        var columnHeaders, fileColumnIndex = _.findIndex(ProcessedFilesStackedTable.defaultProps.columnHeaders, { 'columnClass' : 'file' });
        if (typeof fileColumnIndex !== 'number') {
            columnHeaders = ProcessedFilesStackedTable.defaultProps.columnHeaders;
        } else {
            columnHeaders = ProcessedFilesStackedTable.defaultProps.columnHeaders.slice(0);
            columnHeaders[fileColumnIndex] = _.extend({}, columnHeaders[fileColumnIndex], { 'render' : ProcessedFilesStackedTableSection.renderFileColumn, 'initialWidth' : columnHeaders[fileColumnIndex].initialWidth + 20 });
        }
        return columnHeaders;
    });

    /**
     * *SUBJECT TO CHANGE*
     * Might change to return list of MCOOL AND BIGWIG files. Or something else (act re: state.currentVisualizedFileType or something).
     *
     * Currently:
     * If any one "mcool" file exists, return it.
     * Else, if any bigwig files exist, return those.
     * Else, return null.
     */
    static findAllFilesToVisualize = memoize(function(context){
        return OtherProcessedFilesStackedTableSectionPart.findAllFilesToVisualize( // <- this function might be moved closer to HiGlassContainer in near future.
            expFxn.allProcessedFilesFromExperimentSet(context)
        );
    });

    /** TODO WIP
    * Looks for static Higlass content in the context.
    * @param {object} context
    * @return {string} Returns the HiGlass item in the context (or null if it doesn't)
    */
    static getHiglassItemFromProcessedFiles = memoize(function(context){
        // ProcessedFilesStackedTableSection.getHiglassItemFromProcessedFiles(props.context)
        if (!("static_content" in context)) {
            return null;
        }

        // Look for any static_content sections with tab:processed-files as the location
        const higlassTabs = _.filter(context.static_content, function(section){
            return section.location === "tab:processed-files";
        });

        // Return the content of the first higlassTab.
        return ( higlassTabs.length > 0 ? higlassTabs[0]["content"] : null);
    });

    renderTopRow(){
        const { mounted, width, files, context, windowWidth } = this.props;

        if (!mounted) return null;

        // Used in ProcessedFilesStackedTable for icons/buttons
        const currentlyVisualizedFiles = ProcessedFilesStackedTableSection.findAllFilesToVisualize(context);
        const processedFilesTableProps = {
            files, currentlyVisualizedFiles, windowWidth,
            'experimentSetAccession' : context.accession || null,
            'experimentArray' : context.experiments_in_set,
            'replicateExpsArray' : context.replicate_exps,
            'collapseLimit' : 10, 'collapseShow' : 7,
            'columnHeaders' : ProcessedFilesStackedTableSection.extendedColumnHeaders()
        };

        if (currentlyVisualizedFiles && currentlyVisualizedFiles.length > 0){
            const higlassItem = ProcessedFilesStackedTableSection.getHiglassItemFromProcessedFiles(context);
            const hiGlassProps = { width, mounted, windowWidth, higlassItem, files : currentlyVisualizedFiles };
            return (
                <HiGlassAdjustableWidthRow {...hiGlassProps} renderRightPanel={(rightPanelWidth, resetDivider, leftPanelCollapsed)=>
                    <ProcessedFilesStackedTable {..._.extend({ 'width' : Math.max(rightPanelWidth, 320), leftPanelCollapsed, resetDivider }, processedFilesTableProps)} />
                } />
            );
        } else {
            return <ProcessedFilesStackedTable {...processedFilesTableProps} width={width}/>;
        }
    }

    render(){
        var { mounted, width, files, context, leftPanelCollapseWidth, windowWidth } = this.props,
            filesWithMetrics = ProcessedFilesQCStackedTable.filterFiles(files);

        if (!mounted) return null;

        return (
            <div className="processed-files-table-section exp-table-section" style={{ 'overflowX' : 'hidden' }}>
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ files.length }</span> Processed Files</span>
                </h3>
                { this.renderTopRow() }
                <div className="row">
                    <div className="exp-table-container col-xs-12">
                        { filesWithMetrics.length ? [
                            <h3 className="tab-section-title mt-12" key="tab-section-title-metrics">
                                <span>Quality Metrics</span>
                            </h3>,
                            <ProcessedFilesQCStackedTable {...{ width, windowWidth }} key="metrics-table"
                                files={filesWithMetrics} experimentSetAccession={context.accession || null}
                                experimentArray={context.experiments_in_set} replicateExpsArray={context.replicate_exps}
                                collapseLimit={10} collapseShow={7} collapseLongLists={true} />
                        ] : null }
                    </div>
                </div>
            </div>
        );
    }
}


export class OtherProcessedFilesStackedTableSectionPart extends React.PureComponent {

    /**
     * This function might be moved closer to HiGlassContainer in near future.
     * @see ProcessedFilesStackedTable.findAllFilesToVisualize()
     *
     * @deprecated
     * @param {Item[]} files - Files to filter to visualize, according to their `higlass_uid` and `genome_assembly` properties (if any).
     * @returns {Item[]|null} List of files to be visualized.
     */
    static findAllFilesToVisualize = memoize(function(files){

        var firstMcoolFile = _.find(files || [], function(f){
            return fileUtil.getFileFormatStr(f) === 'mcool' && f.higlass_uid;
        }) || null;

        if (firstMcoolFile) {
            return [firstMcoolFile]; // 1 MCOOL file, if present
        }

        /**
         * @todo Maybe rename this function to be 'is 1d horizontal track file' as has evolved since original form.
         */
        function isValidBWVizFile(f){
            var fileFormat   = fileUtil.getFileFormatStr(f),
                horizTrackFormats = ['bg', 'bw', 'bed', 'bigbed', 'beddb'];
            return f.higlass_uid && horizTrackFormats.indexOf(fileFormat) > -1;
        }

        var bigwigFiles = _.filter(files || [], isValidBWVizFile);
        if (bigwigFiles.length > 0) {
            return bigwigFiles; // All BigWig files, if present.
        }

        return null;
    });

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
        var { context, collection } = this.props;
        return (
            <ProcessedFilesStackedTable files={collection.files} width={width} experimentSetAccession={context.accession || null} columnHeaders={ProcessedFilesStackedTableSection.extendedColumnHeaders()} resetDivider={resetDividerFxn}
                experimentArray={context.experiments_in_set} replicateExpsArray={context.replicate_exps} collapseLongLists={true} leftPanelCollapsed={leftPanelCollapsed} />
        );
    }

    render(){
        const { collection, index, context, width, mounted, defaultOpen, windowWidth } = this.props;
        const files = collection.files;
        const currentlyVisualizedFiles = OtherProcessedFilesStackedTableSectionPart.findAllFilesToVisualize(files);
        const open = this.state.open;
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
                        { currentlyVisualizedFiles ? (
                            <HiGlassAdjustableWidthRow files={currentlyVisualizedFiles} windowWidth={windowWidth} mounted={mounted} width={width - 21}
                                renderRightPanel={this.renderFilesTable} leftPanelDefaultCollapsed={defaultOpen === false} />)
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
