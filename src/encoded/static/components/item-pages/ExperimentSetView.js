'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { Collapse, Button } from 'react-bootstrap';
import * as store from './../../store';
import { ajax, console, DateUtility, object, isServerSide, Filters, expFxn, layout, Schemas } from './../util';
import * as globals from './../globals';
import { ItemPageTitle, ItemHeader, FormattedInfoBlock, FlexibleDescriptionBox, ItemDetailList, ItemFooterRow, Publications, TabbedView, AuditTabView, AttributionTabView, SimpleFilesTable, HiGlassContainer, AdjustableDividerRow } from './components';
import { OverViewBodyItem, OverviewHeadingContainer } from './DefaultItemView';
import { WorkflowRunTracingView, FileViewGraphSection } from './WorkflowRunTracingView';
import { FacetList, RawFilesStackedTable, RawFilesStackedTableExtendedColumns, ProcessedFilesStackedTable, ProcessedFilesQCStackedTable } from './../browse/components';
import { requestAnimationFrame } from './../viz/utilities';

// import { SET } from './../testdata/experiment_set/replicate_4DNESXZ4FW4';
// import { SET } from './../testdata/experiment_set/replicate_with_bigwigs';


/**
 * ExperimentSet Item view/page.
 *
 * @prop {Object} schemas - state.schemas passed down from app Component.
 * @prop {Object} context - JSON representation of current ExperimentSet item.
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
            'selectedFiles': new Set(),
            'mounted' : false
        };
        if (!this.state) this.state = state; // May inherit from WorkfowRunTracingView
        else _.extend(this.state, state);
    }

    static anyOtherProcessedFilesExist(context){
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
    }

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
        var { context, schemas } = this.props;

        //context = SET;

        var processedFiles = expFxn.allProcessedFilesFromExperimentSet(context),
            width = this.getTabViewWidth(),
            tabs = [];

        if (processedFiles && processedFiles.length > 0){

            // Processed Files Table Tab
            tabs.push({
                tab : <span><i className="icon icon-microchip icon-fw"/> Processed Files</span>,
                key : 'processed-files',
                content : <ProcessedFilesStackedTableSection processedFiles={processedFiles} width={width} context={context} schemas={schemas} {...this.state} />
            });

        }

        // Raw files tab, if have experiments
        if (Array.isArray(context.experiments_in_set) && context.experiments_in_set.length > 0){
            tabs.push({
                tab : <span><i className="icon icon-leaf icon-fw"/> Raw Files</span>,
                key : 'experiments',
                content : <RawFilesStackedTableSection width={width} context={context} schemas={schemas} {...this.state} />
            });
        }

        if (processedFiles && processedFiles.length > 0){

            // Graph Section Tab
            if (Array.isArray(context.processed_files) && context.processed_files.length > 0){
                tabs.push(FileViewGraphSection.getTabObject(
                    _.extend({}, this.props, { 'isNodeCurrentContext' : this.isWorkflowNodeCurrentContext }),
                    this.state,
                    this.handleToggleAllRuns
                ));
            }
        }

        // Other Files Tab
        if (ExperimentSetView.anyOtherProcessedFilesExist(context)){
            tabs.push({
                tab : <span><i className="icon icon-files-o icon-fw"/> Supplementary Files</span>,
                key : 'other-processed-files',
                content : <OtherProcessedFilesStackedTableSection width={width} context={context} schemas={schemas} {...this.state} />
            });
        }

        return tabs.concat(this.getCommonTabs(context)).map((tabObj)=>{
            return _.extend(tabObj, {
                'style' : { minHeight : Math.max(this.state.mounted && !isServerSide() && (window.innerHeight - 180), 100) || 800 }
            });
        });

    }

    itemHeader(){
        return <ExperimentSetHeader {...this.props} />;
    }

    itemMidSection(){
        return (super.itemMidSection() || []).concat(
            <OverviewHeading context={this.props.context} schemas={this.props.schemas} key="overview"
                className="with-background mb-2 mt-1" title="Experiment Set Properties" prependTitleIcon prependTitleIconFxn={(open, props)=>
                    <i className="expand-icon icon icon-th-list" />
                } />
        );
    }

    tabbedView(){
        return <TabbedView contents={this.getTabViewContents} />;
    }
}

// Register ExperimentSetView to be the view for these @types.
globals.content_views.register(ExperimentSetView, 'ExperimentSet');
globals.content_views.register(ExperimentSetView, 'ExperimentSetReplicate');

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
 * @memberof module:item-pages/experiment-set-view
 * @private
 * @prop {Object} context - Same context prop as available on parent component.
 * @prop {string} href - Current page href, passed down from app or Redux store.
 */
class ExperimentSetHeader extends React.PureComponent {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        if (this.props.debug) console.log('render ExperimentSetHeader');
        return (
            <ItemHeader.Wrapper className="exp-set-header-area" context={this.props.context} href={this.props.href} schemas={this.props.schemas}>
                <ItemHeader.TopRow />
                <ItemHeader.MiddleRow />
                <ItemHeader.BottomRow />
            </ItemHeader.Wrapper>
        );
    }
}


export class RawFilesStackedTableSection extends React.PureComponent {
    render(){

        /* In addition to built-in headers for experimentSetType defined by RawFilesStackedTable */
        var expTableColumnHeaders = [
            { columnClass: 'file-detail', title: 'File Info'},
            { columnClass: 'file-detail', title: 'File Size', initialWidth: 80, field : "file_size" }
        ];

        var context = this.props.context;
        var files = expFxn.allFilesFromExperimentSet(context, false);
        var fileCount = files.length;
        var expSetCount = (context.experiments_in_set && context.experiments_in_set.length) || 0;
        var anyFilesWithMetrics = !!(ProcessedFilesQCStackedTable.filterFiles(files, true));
        return (
            <div className="exp-table-section">
                { expSetCount ? 
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ fileCount }</span> Raw Files</span>
                </h3>
                : null }
                <div className="exp-table-container">
                    <RawFilesStackedTableExtendedColumns
                        width={this.props.width}
                        experimentSetType={this.props.context.experimentset_type}
                        showMetricColumns={anyFilesWithMetrics}
                        facets={ this.props.facets }
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
        'renderRightPanel' : PropTypes.func
    };

    constructor(props){
        super(props);
        this.correctHiGlassTrackDimensions = _.debounce(this.correctHiGlassTrackDimensions.bind(this), 100);
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
        var hiGlassContainer = this.refs && this.refs.adjustableRow && this.refs.adjustableRow.refs && this.refs.adjustableRow.refs.hiGlassContainer;
        var internalHiGlassComponent = hiGlassContainer && hiGlassContainer.refs && hiGlassContainer.refs.hiGlassComponent;
        if (hiGlassContainer && !internalHiGlassComponent) {
            console.warn('Internal HiGlass Component not accessible.');
            return;
        } else if (!hiGlassContainer) {
            return;
        }
        setTimeout(()=>{
            requestAnimationFrame(()=>{
                _.forEach(internalHiGlassComponent.tiledPlots, (tp) => tp && tp.measureSize());
            });
        }, 10);
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
        var { mounted, width, files, children, renderRightPanel, renderLeftPanelPlaceholder, leftPanelDefaultCollapsed, leftPanelCollapseHeight, leftPanelCollapseWidth } = this.props;
        if (!files || !mounted) return (renderRightPanel && renderRightPanel(width, null)) || children;

        var minOpenHeight = 300,
            maxOpenHeight = 800;

        return (
            <AdjustableDividerRow
                width={width} mounted={mounted} height={minOpenHeight} leftPanelCollapseHeight={leftPanelCollapseHeight}
                leftPanelClassName="expset-higlass-panel" leftPanelDefaultCollapsed={leftPanelDefaultCollapsed}
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
                        return <HiGlassContainer files={files} className={collapsed ? 'disabled' : null} height={Math.min(Math.max(rightPanelHeight + 25, minOpenHeight), maxOpenHeight)} ref="hiGlassContainer" />;
                    }
                }}
                rightPanelClassName="exp-table-container" renderRightPanel={renderRightPanel}
                onDrag={this.correctHiGlassTrackDimensions} ref="adjustableRow" />
        );
    }
}


export class ProcessedFilesStackedTableSection extends React.PureComponent {

    /**
     * Renderer for "columnClass" : "file" column definition.
     *
     * columnClass : 'file' render method takes different params than ordinary file-detail columns.
     *
     * @param {{ '@id' : string, 'file_format' : string, 'higlass_uid' : string }} file - File for row/column
     * @param {{ 'expTable' : { 'props' : { 'leftPanelCollapsed' : boolean, 'resetDivider' : function } } }} tableProps - Props passed down from FileEntryBlock, including reference to parent StackedTable as expTable.
     * @param {{ 'fileAtId' : string, 'fileTitleString' : string }} param2 - Some properties calculated by StackedTable FileEntryBlock and passed in to help cut down on JS calculation.
     */
    static renderFileColumn(file, tableProps, { fileAtId, fileTitleString }){
        var className = file.accession ? 'mono-text' : null,
            title = fileAtId ? <a href={fileAtId} className={className} children={fileTitleString}/> : <div className={className} children={fileTitleString}/>,
            tb = (tableProps && tableProps.expTable && tableProps.expTable.props) || {},
            collapsibleAndCollapsed = tb.leftPanelCollapsed && typeof tb.resetDivider === 'function';

        // HiC File External Link/Button to JuiceBox
        if (file && ((file.file_format && file.file_format === 'hic') || (file.file_type_detailed && file.file_type_detailed.indexOf('(hic)') > -1) ) && file.href){
            var onClick = function(evt){
                    var pageHref = tableProps.href || tb.href || (store && store.getState().href),
                        hrefParts = url.parse(pageHref),
                        host = hrefParts.protocol + '//' + hrefParts.host,
                        targetLocation = "http://aidenlab.org/juicebox/?hicUrl=" + host + file.href;
                    if (isServerSide()) return null;
                    var win = window.open(targetLocation, '_blank');
                    win.focus();
                },
                juiceBoxExternalLinkBtn = (
                    <Button bsSize="xs" bsStyle="primary" className="text-600 inline-block clickable in-stacked-table-button" data-tip="Visualize this file in JuiceBox" onClick={onClick}>
                        <i className="icon icon-fw icon-external-link text-smaller"/>
                    </Button>
                );
            return <span>{ title } { juiceBoxExternalLinkBtn }</span>;

        } else if (file && file.higlass_uid && (
            (file.file_format && (file.file_format === 'mcool' || file.file_format === 'bw' || file.file_format === 'bg'))
            || (file.file_type_detailed && (file.file_type_detailed.indexOf('(mcool)') > -1 || file.file_type_detailed.indexOf('(bw)') > -1 || file.file_type_detailed.indexOf('(bg)') > -1))
        )){

            var onDragStart = function(evt){
                if (!evt || !evt.dataTransfer) return;
                // evt.dataTransfer.setData('text/4dn-item-context', JSON.stringify(file));
                evt.dataTransfer.setData('text/higlass-tileset-info', JSON.stringify({ 'tilesetUid' : file.higlass_uid, 'genome_assembly' : file.genome_assembly, 'file_format' : file.file_format }));
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

    static extendedColumnHeaders(){
        /** Add in extended 'file' column render fxn */
        var columnHeaders, fileColumnIndex = _.findIndex(ProcessedFilesStackedTable.defaultProps.columnHeaders, { 'columnClass' : 'file' });
        if (typeof fileColumnIndex !== 'number') {
            columnHeaders = ProcessedFilesStackedTable.defaultProps.columnHeaders;
        } else {
            columnHeaders = ProcessedFilesStackedTable.defaultProps.columnHeaders.slice(0);
            columnHeaders[fileColumnIndex] = _.extend({}, columnHeaders[fileColumnIndex], { 'render' : ProcessedFilesStackedTableSection.renderFileColumn, 'initialWidth' : columnHeaders[fileColumnIndex].initialWidth + 20 });
        }
        return columnHeaders;
    }

    /**
     * *SUBJECT TO CHANGE*
     * Might change to return list of MCOOL AND BIGWIG files. Or something else (act re: state.currentVisualizedFileType or something).
     *
     * Currently:
     * If any one "mcool" file exists, return it.
     * Else, if any bigwig files exist, return those.
     * Else, return null.
     */
    static findAllFilesToVisualize(context){
        return OtherProcessedFilesStackedTableSectionPart.findAllFilesToVisualize( // <- this function might be moved closer to HiGlassContainer in near future.
            expFxn.allProcessedFilesFromExperimentSet(context)
        );
    }

    constructor(props){
        super(props);
        this.state = {
            'currentlyVisualizedFiles' : ProcessedFilesStackedTableSection.findAllFilesToVisualize(props.context), // TODO: May change, act on some 'currentVisualizedFileType' param or state, etc.
            'filesWithMetrics' : ProcessedFilesQCStackedTable.filterFiles(props.processedFiles)
        };
        this.columnHeaders = ProcessedFilesStackedTableSection.extendedColumnHeaders();
    }

    componentWillReceiveProps(nextProps){
        var nextState = {};
        if (nextProps.processedFiles !== this.props.processedFiles){
            nextState.filesWithMetrics = ProcessedFilesQCStackedTable.filterFiles(nextProps.processedFiles);
        }
        if (nextProps.context !== this.props.context){
            nextState.currentlyVisualizedFiles = ProcessedFilesStackedTableSection.findAllFilesToVisualize(nextProps.context);
        }
        if (_.keys(nextState).length > 0){
            this.setState(nextState);
        }
    }

    renderTopRow(){
        const { mounted, width, processedFiles, context } = this.props;
        if (!mounted) return null;

        // Used in ProcessedFilesStackedTable for icons/buttons
        const currentlyVisualizedFiles = this.state.currentlyVisualizedFiles;
        const processedFilesTableProps = {
            'files' : processedFiles, currentlyVisualizedFiles,
            'experimentSetAccession' : context.accession || null,
            'experimentArray' : context.experiments_in_set,
            'replicateExpsArray' : context.replicate_exps,
            'collapseLimit' : 10, 'collapseShow' : 7,
            'columnHeaders' : this.columnHeaders
        };

        if (currentlyVisualizedFiles && currentlyVisualizedFiles.length > 0){
            const hiGlassProps = { width, mounted, files : currentlyVisualizedFiles };
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
        var { mounted, width, processedFiles, context, leftPanelCollapseWidth } = this.props;
        if (!mounted) return null;

        return (
            <div className="processed-files-table-section exp-table-section">
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ processedFiles.length }</span> Processed Files</span>
                </h3>
                { this.renderTopRow() }
                <div className="row">
                    <div className="exp-table-container col-xs-12">
                        { this.state.filesWithMetrics.length ? [
                            <h3 className="tab-section-title mt-12" key="tab-section-title-metrics">
                                <span>Quality Metrics</span>
                            </h3>,
                            <ProcessedFilesQCStackedTable
                                key="metrics-table"
                                files={this.state.filesWithMetrics}
                                width={width}
                                experimentSetAccession={context.accession || null}
                                experimentArray={context.experiments_in_set}
                                replicateExpsArray={context.replicate_exps}
                                collapseLimit={10} collapseShow={7}
                                collapseLongLists={true}
                            />
                        ] : null }
                    </div>
                </div>
            </div>
        );
    }
}


export class OtherProcessedFilesStackedTableSectionPart extends React.Component {

    /**
     * Most likely deprecated as `OtherProcessedFilesStackedTableSection.extendCollectionsWithExperimentFiles` performs the same task(s) as part of its execution.
     * Eventually can remove function and state.files, instead using props.collection.files directly.
     * @deprecated - TODO: Check/test removal of this function and finalize.
     * @param {{ 'collection' : { 'files': { 'accession' : string, '@id' : string }[] }, 'context' : { 'accession' : string, '@id' : string } }} props - Object with 'collection', 'context' (expSet) properties.
     */
    static filesWithFromExpAndExpSetProperty(props){
        return _.map(props.collection.files, (origFile)=>{
            if (origFile.from_experiment && origFile.from_experiment.from_experiment_set && origFile.from_experiment_set){ // This will most likely execute as these files pass through `extendCollectionsWithExperimentFiles`
                // console.info(origFile.accession + ' is well-formed already.');
                return origFile;
            }
            var file = _.clone(origFile); // Extend w/ dummy experiment to make accession triples with (these will have NONE in place of (middle) exp accession).
            file.from_experiment_set = (file.from_experiment && file.from_experiment.from_experiment_set) || props.context;
            file.from_experiment = _.extend({ 'accession' : "NONE" , 'from_experiment_set' : file.from_experiment_set }, file.from_experiment || {});
            return file;
        });
    }

    /**
     * This function might be moved closer to HiGlassContainer in near future.
     * @see ProcessedFilesStackedTable.findAllFilesToVisualize()
     *
     * @param {{ '@id' : string, 'display_title' : string, 'higlass_uid' : string, 'genome_assembly' : string }[]} files - Files to filter to visualize.
     * @returns {!{ '@id' : string, 'display_title' : string, 'higlass_uid' : string, 'genome_assembly' : string }[]} List of files to be visualized.
     */
    static findAllFilesToVisualize(files){

        var firstMcoolFile = _.find(files || [], function(f){
            return f.file_format === 'mcool' && f.higlass_uid;
        }) || null;

        if (firstMcoolFile) {
            return [firstMcoolFile]; // 1 MCOOL file, if present
        }

        function isValidBWVizFile(f){ return (f.file_format === 'bg' || f.file_format === 'bw') && f.higlass_uid; }

        var bigwigFiles = _.filter(files || [], isValidBWVizFile);
        if (bigwigFiles.length > 0) {
            return bigwigFiles; // All BigWig files, if present.
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

        var files = OtherProcessedFilesStackedTableSectionPart.filesWithFromExpAndExpSetProperty(props);
        this.state = {
            'open'      : props.defaultOpen,
            'files'     : files,
            'currentlyVisualizedFiles' : OtherProcessedFilesStackedTableSectionPart.findAllFilesToVisualize(files)
        };
        this.columnHeaders = ProcessedFilesStackedTableSection.extendedColumnHeaders();
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.context !== this.props.context || nextProps.collection !== this.props.collection){
            var files = OtherProcessedFilesStackedTableSectionPart.filesWithFromExpAndExpSetProperty(nextProps),
                currentlyVisualizedFiles = OtherProcessedFilesStackedTableSectionPart.findAllFilesToVisualize(files);

            this.setState({ files, currentlyVisualizedFiles });
        }
    }

    toggleOpen(e){
        this.setState(function(oldState){
            return { 'open' : !oldState.open };
        });
    }

    renderFilesTable(width, resetDividerFxn, leftPanelCollapsed){
        var context = this.props.context;
        return (
            <ProcessedFilesStackedTable files={this.state.files} width={width} experimentSetAccession={context.accession || null} columnHeaders={this.columnHeaders} resetDivider={resetDividerFxn}
                experimentArray={context.experiments_in_set} replicateExpsArray={context.replicate_exps} collapseLongLists={true} leftPanelCollapsed={leftPanelCollapsed} />
        );
    }

    render(){
        const { collection, index, context, width, mounted, defaultOpen } = this.props;
        const { open, files, currentlyVisualizedFiles } = this.state;
        return (
            <div data-open={open} className="supplementary-files-section-part" key={collection.title || 'collection-' + index}>
                <h4>
                    <span className="inline-block clickable" onClick={this.toggleOpen}>
                        <i className={"text-normal icon icon-fw icon-" + (open ? 'minus' : 'plus')} />
                        { collection.title || "Collection " + index } <span className="text-normal text-300">({ files.length } file{files.length === 1 ? '' : 's'})</span>
                    </span>
                </h4>
                { collection.description ? <FlexibleDescriptionBox description={collection.description} className="description" fitTo="grid" expanded={open} /> : <div className="mb-15"/> }
                <Collapse in={open} mountOnEnter>
                    <div className="table-for-collection">
                        { currentlyVisualizedFiles ? <HiGlassAdjustableWidthRow files={currentlyVisualizedFiles} mounted={mounted} width={width - 21} renderRightPanel={this.renderFilesTable} leftPanelDefaultCollapsed={defaultOpen === false} /> : this.renderFilesTable(width - 21) }
                    </div>
                </Collapse>
            </div>
        );
    }
}


export class OtherProcessedFilesStackedTableSection extends React.PureComponent {

    static checkOPFCollectionPermission(opfCollection){
        return _.any(opfCollection.files || [], function(opf){
            return opf && object.itemUtil.atId(opf) && !opf.error;
        });
    }

    static checkOPFCollectionsPermissions(opfCollections){
        return _.any(opfCollections || [], OtherProcessedFilesStackedTableSection.checkOPFCollectionPermission);
    }

    constructor(props){
        super(props);
        this.extendCollectionsWithExperimentFiles = this.extendCollectionsWithExperimentFiles.bind(this);
        this.state = {
            'otherProcessedFileSetsCombined' : this.extendCollectionsWithExperimentFiles(props)
        };
    }

    componentWillReceiveProps(nextProps){
        if (this.props.context !== nextProps.context){
            this.setState({ 'otherProcessedFileSetsCombined' : this.extendCollectionsWithExperimentFiles(nextProps) });
        }
    }

    extendCollectionsWithExperimentFiles(props){

        // Clone -- so we don't modify props.context in place
        var collectionsFromExpSet = _.map(
            props.context.other_processed_files,
            function(opfCollection){
                return _.extend({}, opfCollection, {
                    'files' : _.map(opfCollection.files || [], function(opf){ return _.extend({ 'from_experiment_set' : props.context, 'from_experiment' : { 'from_experiment_set' : props.context, 'accession' : 'NONE' } }, opf); })
                });
            }
        );
        var collectionsFromExpSetTitles = _.pluck(collectionsFromExpSet, 'title');
        var collectionsByTitle = _.object(_.zip(collectionsFromExpSetTitles, collectionsFromExpSet)); // TODO what if 2 titles are identical? Validate/prevent on back-end.

        // Add 'from_experiment' info to each collection file so it gets put into right 'experiment' row in StackedTable.
        var collectionsFromExps = _.reduce(props.context.experiments_in_set || [], function(m, exp){
            if (Array.isArray(exp.other_processed_files) && exp.other_processed_files.length > 0){
                return m.concat(
                    _.map(exp.other_processed_files, function(opfCollection){
                        return _.extend({}, opfCollection, {
                            'files' : _.map(opfCollection.files || [], function(opf){ return _.extend({ 'from_experiment' : _.extend({ 'from_experiment_set' : props.context }, exp), 'from_experiment_set' : props.context }, opf); })
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
    }

    render(){
        var { context, width, mounted } = this.props;
        var gridState = mounted && layout.responsiveGridState();
        return (
            <div className="processed-files-table-section">
                <h3 className="tab-section-title">
                    <span className="text-400">{ this.state.otherProcessedFileSetsCombined.length }</span> Collections of Supplementary Files
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { _.map(this.state.otherProcessedFileSetsCombined, (collection, index, all) => {
                    var defaultOpen = (gridState === 'sm' || gridState === 'xs' || !gridState) ? false : ((all.length < 4) || (index < 2));
                    return <OtherProcessedFilesStackedTableSectionPart {...{ collection, index, context, width, mounted }} key={index} defaultOpen={defaultOpen} />;
                }) }
            </div>
        );
    }
}
