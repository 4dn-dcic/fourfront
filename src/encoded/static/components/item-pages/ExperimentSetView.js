'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Collapse } from 'react-bootstrap';
import { ajax, console, DateUtility, object, isServerSide, Filters, expFxn, layout, Schemas } from './../util';
import * as globals from './../globals';
import { ItemPageTitle, ItemHeader, FormattedInfoBlock, FlexibleDescriptionBox, ItemDetailList, ItemFooterRow, Publications, TabbedView, AuditTabView, AttributionTabView, SimpleFilesTable } from './components';
import { OverViewBodyItem, OverviewHeadingContainer } from './DefaultItemView';
import { WorkflowRunTracingView, FileViewGraphSection } from './WorkflowRunTracingView';
import { FacetList, RawFilesStackedTable, RawFilesStackedTableExtendedColumns, ProcessedFilesStackedTable, ProcessedFilesQCStackedTable } from './../browse/components';

// import { SET } from './../testdata/experiment_set/replicate_4DNESXZ4FW4';


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
        if (Array.isArray(context.other_processed_files) && context.other_processed_files.length > 0) return true;
        if (!Array.isArray(context.experiments_in_set) || context.experiments_in_set.length === 0) return false;
        var exp, i;
        for (i = 0; i < context.experiments_in_set.length; i++){
            exp = context.experiments_in_set[i];
            if (Array.isArray(exp.other_processed_files) && exp.other_processed_files.length > 0) return true;
        }
        return false;
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

    getTabViewContents(){

        var context = this.props.context, schemas = this.props.schemas;

        /* In addition to built-in headers for experimentSetType defined by RawFilesStackedTable */
        var expTableColumnHeaders = [{ 'columnClass' : 'file-detail', 'title' : 'File Info'}];

        if (context.experimentset_type === 'replicate') {
            expTableColumnHeaders.unshift({ 'columnClass' : 'file-detail', 'title' : 'File Type'});
        }

        var processedFiles = expFxn.allProcessedFilesFromExperimentSet(context);

        var width = (!isServerSide() && this.refs && this.refs.tabViewContainer && this.refs.tabViewContainer.offsetWidth) || null;

        if (width) width -= 20;

        var tabs = [];

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
        return [
            <Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.produced_in_pub} schemas={this.props.schemas} />,
            <OverviewHeading context={this.props.context} schemas={this.props.schemas} />
        ];
    }

    itemFooter(){
        return null; //<ItemFooterRow context={this.props.context} schemas={this.props.schemas} />;
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

        if (this.props.context.experimentset_type === 'replicate') {
            expTableColumnHeaders.unshift({ columnClass: 'file-detail', title : 'File Type'});
        }

        var context = this.props.context;
        var files = expFxn.allFilesFromExperimentSet(context, false);
        var fileCount = files.length;
        var expSetCount = (context.experiments_in_set && context.experiments_in_set.length) || 0;
        var filesWithMetrics = ProcessedFilesQCStackedTable.filterFiles(files);
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
                        showMetricColumns={filesWithMetrics.length > 0}
                        facets={ this.props.facets }
                        experimentSetAccession={this.props.context.accession || null}
                        experimentArray={this.props.context.experiments_in_set}
                        replicateExpsArray={this.props.context.replicate_exps}
                        keepCounts={false}
                        columnHeaders={expTableColumnHeaders}
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

export class ProcessedFilesStackedTableSection extends React.PureComponent {
    render(){
        var filesWithMetrics = ProcessedFilesQCStackedTable.filterFiles(this.props.processedFiles);
        return (
            <div className="processed-files-table-section">
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ this.props.processedFiles.length }</span> Processed Files</span>
                </h3>
                <ProcessedFilesStackedTable
                    files={this.props.processedFiles}
                    width={this.props.width}
                    experimentSetAccession={this.props.context.accession || null}
                    experimentArray={this.props.context.experiments_in_set}
                    replicateExpsArray={this.props.context.replicate_exps}
                    collapseLongLists={false}
                />
                { filesWithMetrics.length ? [
                    <h3 className="tab-section-title mt-12">
                        <span>Quality Metrics</span>
                    </h3>,
                    <ProcessedFilesQCStackedTable
                        files={filesWithMetrics}
                        width={this.props.width}
                        experimentSetAccession={this.props.context.accession || null}
                        experimentArray={this.props.context.experiments_in_set}
                        replicateExpsArray={this.props.context.replicate_exps}
                        collapseLongLists={false}
                    />
                ] : null }
            </div>
        );
    }
}

export class OtherProcessedFilesStackedTableSectionPart extends React.PureComponent {

    /**
     * Most likely deprecated as `OtherProcessedFilesStackedTableSection.extendCollectionsWithExperimentFiles` performs the same task(s) as part of its execution.
     * Eventually can remove function and state.files, instead using 
     * @deprecated
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

    static defaultProps = {
        'defaultOpen' : false
    };

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = {
            'open' : props.defaultOpen,
            'files' : OtherProcessedFilesStackedTableSectionPart.filesWithFromExpAndExpSetProperty(props)
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.context !== this.props.context || nextProps.collection !== this.props.collection){
            this.setState({ 'files' : OtherProcessedFilesStackedTableSectionPart.filesWithFromExpAndExpSetProperty(nextProps) });
        }
    }

    toggleOpen(e){
        this.setState(function(oldState){
            return { 'open' : !oldState.open };
        });
    }

    render(){
        const { collection, index, context, width } = this.props;
        const { open, files } = this.state;
        return (
            <div data-open={open} className="supplementary-files-section-part" key={collection.title || 'collection-' + index}>
                <h4>
                    <span className="inline-block clickable" onClick={this.toggleOpen}>
                        <i className={"text-normal icon icon-fw icon-" + (open ? 'minus' : 'plus')} />
                        { collection.title || "Collection " + index } <span className="text-normal text-300">({ files.length } file{files.length === 1 ? '' : 's'})</span>
                    </span>
                </h4>
                <FlexibleDescriptionBox description={collection.description} className="description" fitTo="grid" expanded={open} />
                <Collapse in={open}>
                    <div className="table-for-collection">
                        <ProcessedFilesStackedTable
                            files={files} width={width - 21} experimentSetAccession={context.accession || null}
                            experimentArray={context.experiments_in_set} replicateExpsArray={context.replicate_exps} collapseLongLists={true} />
                    </div>
                </Collapse>
            </div>
        );
    }

}


export class OtherProcessedFilesStackedTableSection extends React.PureComponent {

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
        var collectionsFromExpSet = _.map(props.context.other_processed_files, function(opfCollection){
            return _.extend({}, opfCollection, {
                'files' : _.map(opfCollection.files || [], function(opf){ return _.extend({ 'from_experiment_set' : props.context, 'from_experiment' : { 'from_experiment_set' : props.context, 'accession' : 'NONE' } }, opf); })
            });
        });
        var collectionsFromExpSetTitles = _.pluck(collectionsFromExpSet, 'title');
        var collectionsFromExpSetObject = _.object(_.zip(collectionsFromExpSetTitles, collectionsFromExpSet)); // TODO what if 2 titles are identical? Validate/prevent on back-end.

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
            if (collectionsFromExpSetObject[collection.title]){
                _.forEach(collection.files, function(f){
                    var duplicateExistingFile = _.find(collectionsFromExpSetObject[collection.title].files, function(existFile){ return object.itemUtil.atId(existFile) === object.itemUtil.atId(f); });
                    if (duplicateExistingFile){
                        console.error('Found existing/duplicate file in ExperimentSet other_processed_files of Experiment File ' + f['@id']);
                    } else {
                        collectionsFromExpSetObject[collection.title].files.push(f);
                    }
                });
            } else {
                collectionsFromExpsUnBubbled = collectionsFromExpsUnBubbled.concat(collection.files);
            }
        });
        return _.values(collectionsFromExpSetObject).concat(collectionsFromExpsUnBubbled);
    }

    render(){
        var { context, width } = this.props;
        return (
            <div className="processed-files-table-section">
                <h3 className="tab-section-title">
                    <span className="text-400">{ this.state.otherProcessedFileSetsCombined.length }</span> Collections of Supplementary Files
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                { _.map(this.state.otherProcessedFileSetsCombined, (collection, index, all) => <OtherProcessedFilesStackedTableSectionPart {...{ collection, index, context, width }} key={index} defaultOpen={(all.length < 4) || (index < 3)} />) }
            </div>
        );
    }
}
