'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox, MenuItem, Dropdown, DropdownButton } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide } from './../util';
import { FormattedInfoBlock, TabbedView, ExperimentSetTables, ExperimentSetTablesLoaded, WorkflowNodeElement, SimpleFilesTableLoaded, Publications } from './components';
import { OverViewBodyItem, OverviewHeadingContainer } from './DefaultItemView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue, ItemPageTable } from './../browse/components';
import { browseTableConstantColumnDefinitions } from './../browse/BrowseView';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps } from './../viz/Workflow';
import { requestAnimationFrame } from './../viz/utilities';
import { RowSpacingTypeDropdown } from './WorkflowView';
import { mapEmbeddedFilesToStepRunDataIDs, allFilesForWorkflowRunMappedByUUID } from './WorkflowRunView';
import { filterOutParametersFromGraphData, filterOutReferenceFilesFromGraphData, WorkflowRunTracingView, FileViewGraphSection } from './WorkflowRunTracingView';

export default class ExperimentView extends WorkflowRunTracingView {

    static doesGraphExist(context){
        return (
            (Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0)
        );
    }

    getFilesTabs(width){
        var context = this.props.context;
        
        /* In addition to built-in headers for experimentSetType defined by RawFilesStackedTable */
        var expTableColumnHeaders = [
        ];


        var tabs = [];

        if (Array.isArray(context.files) && context.files.length > 0) {
            
            tabs.push({
                tab : <span><i className="icon icon-leaf icon-fw"/> Raw Files</span>,
                key : 'raw-files',
                content : <RawFilesTableSection
                    rawFiles={context.files}
                    width={width}
                    {..._.pick(this.props, 'context', 'schemas')}
                    {...this.state}
                />
            });

        }

        if (Array.isArray(context.processed_files) && context.processed_files.length > 0) {
            
            tabs.push({
                tab : <span><i className="icon icon-microchip icon-fw"/> Processed Files</span>,
                key : 'processed-files',
                content : <ProcessedFilesTableSection
                    processedFiles={context.processed_files}
                    width={width}
                    {..._.pick(this.props, 'context', 'schemas')}
                    {...this.state}
                />
            });

        }

        return tabs;
    }

    getTabViewContents(){

        var initTabs = [];
        var context = this.props.context;
        var width = (!isServerSide() && this.refs && this.refs.tabViewContainer && this.refs.tabViewContainer.offsetWidth) || null;
        if (width) width -= 20;

        initTabs.push(ExperimentSetsViewOverview.getTabObject(context, this.props.schemas, width));
        
        if (Array.isArray(context.processed_files) && context.processed_files.length > 0){
            initTabs.push(FileViewGraphSection.getTabObject(
                _.extend({}, this.props, {
                    'isNodeCurrentContext' : function(node){
                        if (!context) return false;
                        if (!node || !node.meta || !node.meta.run_data || !node.meta.run_data.file) return false;
                        if (Array.isArray(node.meta.run_data.file)) return false;
                        if (typeof node.meta.run_data.file.accession !== 'string') return false;
                        if (!context.processed_files || !Array.isArray(context.processed_files) || context.processed_files === 0) return false;
                        if (_.contains(_.pluck(context.processed_files, 'accession'), node.meta.run_data.file.accession)) return true;
                        return false;
                    }.bind(this)
                }),
                this.state,
                this.handleToggleAllRuns
            ));
        }

        return initTabs.concat(this.getFilesTabs(width)).concat(this.getCommonTabs());
    }

    typeInfo(){
        return { 'title' : this.props.context.experiment_type || null, 'description' : "Type of Experiment" };
    }

    itemMidSection(){
        return [<Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.produced_in_pub} />, <OverviewHeading context={this.props.context} />];
    }

}

globals.content_views.register(ExperimentView, 'Experiment');


class ExperimentSetsViewOverview extends React.Component {

    static getTabObject(context, schemas, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Experiment Sets</span>,
            'key' : 'experiments-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <ExperimentSetsViewOverview context={context} schemas={schemas} width={width} />
                </div>
            )
        };
    }

    static propTypes = {
        'context' : PropTypes.shape({
            'experiment_sets' : PropTypes.arrayOf(PropTypes.shape({
                'link_id' : PropTypes.string.isRequired
            })).isRequired
        }).isRequired
    }

    render(){
        var { context, width } = this.props, setsByKey = null, table = null;

        if (context && Array.isArray(context.experiment_sets) && context.experiment_sets.length > 0 && object.atIdFromObject(context.experiment_sets[0])) {
            setsByKey = _.object(_.zip(_.map(context.experiment_sets, object.atIdFromObject), context.experiment_sets));
        }

        if (setsByKey && _.keys(setsByKey).length > 0){
            table = <ExperimentSetTablesLoaded experimentSetObject={setsByKey} width={width} defaultOpenIndices={[0]} />;
        }

        return table;
    }

}

class OverviewHeading extends React.Component {
    render(){
        var exp = this.props.context;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), exp);
        var tipsForBiosample = object.tipsFromSchema(this.props.schemas || Schemas.get(), _.extend({'@type' : ['Biosample', 'Item']}, exp.biosample));
        var commonProps = { 'tips' : tips, 'result' : exp, 'wrapInColumn' : "col-xs-6 col-md-3" };
        var commonBioProps = _.extend({ 'tips' : tipsForBiosample, 'result' : exp.biosample }, { 'wrapInColumn' : commonProps.wrapInColumn });

        return (
            <OverviewHeadingContainer>
                <OverViewBodyItem {...commonProps} property='experiment_type' fallbackTitle="Experiment Type" />
                <OverViewBodyItem {...commonProps} property='follows_sop' fallbackTitle="Follows SOP" fallbackValue="No" />
                <OverViewBodyItem {...commonProps} property='biosample' fallbackTitle="Biosample" />
                <OverViewBodyItem {...commonProps} property='digestion_enzyme' fallbackTitle="Digestion Enzyme" />
                <OverViewBodyItem {...commonBioProps} property='modifications_summary' fallbackTitle="Biosample Modifications" />
                <OverViewBodyItem {...commonBioProps} property='treatments_summary' fallbackTitle="Biosample Treatments" />
                <OverViewBodyItem {...commonBioProps} property='biosource' fallbackTitle="Biosample Biosource" />
            </OverviewHeadingContainer>
        );
    }
}

export class RawFilesTableSection extends React.Component {
    render(){
        var rawFiles = this.props.rawFiles;
        var columns = _.clone(SimpleFilesTableLoaded.defaultProps.columns);
        var columnDefinitionOverrideMap = _.clone(SimpleFilesTableLoaded.defaultProps.columnDefinitionOverrideMap);

        columns['related_files'] = 'Relations';
        columnDefinitionOverrideMap['related_files'] = {
            'minColumnWidth' : 120,
            'render' : function(result, columnDefinition, props, width){
                var related_files = _.map(_.filter(result.related_files, function(rF){ return rF.file && object.atIdFromObject(rF.file); }), function(fContainer, i){
                    var link = object.atIdFromObject(fContainer.file);
                    var title = typeof fContainer.file.accession === 'string' ? <span className="mono-text">{fContainer.file.accession}</span> : fContainer.file.display_title;
                    return <span key={link || i}>{ fContainer.relationship_type } { link ? <a href={link}>{ title }</a> : title }</span>;
                });
                return related_files;
            }
        };

        // Add column for paired end if any files have one.
        if (_.any(rawFiles, function(f) { return typeof f.paired_end !== 'undefined'; })){
            columns['paired_end'] = 'End';
            columnDefinitionOverrideMap['paired_end'] = {
                'minColumnWidth' : 30,
                'widthMap' : { 'sm' : 30, 'md' : 40, 'lg' : 50 }
            };
        }
        
        return (
            <div className="raw-files-table-section">
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ rawFiles.length }</span> Raw File{ rawFiles.length === 1 ? '' : 's' }</span>
                </h3>
                <SimpleFilesTableLoaded
                    files={rawFiles}
                    schemas={this.props.schemas}
                    columns={columns}
                    columnDefinitionOverrideMap={columnDefinitionOverrideMap}
                    width={this.props.width}
                />
            </div>
        );
    }
}

export class ProcessedFilesTableSection extends React.Component {
    render(){
        var processedFiles = this.props.processedFiles;
        return (
            <div className="processed-files-table-section">
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ processedFiles.length }</span> Processed File{ processedFiles.length === 1 ? '' : 's' }</span>
                </h3>
                <SimpleFilesTableLoaded
                    files={processedFiles}
                    schemas={this.props.schemas}
                    width={this.props.width}
                />
            </div>
        );
    }
}
