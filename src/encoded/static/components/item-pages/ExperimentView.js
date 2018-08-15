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

    getFilesTabs(width){
        var context = this.props.context;

        /* In addition to built-in headers for experimentSetType defined by RawFilesStackedTable */
        var expTableColumnHeaders = [
        ];


        var tabs = [];

        var rawFilesWithViewPermissions = Array.isArray(context.files) && context.files.length > 0 && _.filter(context.files, function(rf){
            if (rf.error && !object.itemUtil.atId(rf)) return false;
            return true;
        });

        if (rawFilesWithViewPermissions && rawFilesWithViewPermissions.length > 0) {

            tabs.push({
                tab : <span><i className="icon icon-leaf icon-fw"/> Raw Files</span>,
                key : 'raw-files',
                content : <RawFilesTableSection
                    files={rawFilesWithViewPermissions}
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
                    files={context.processed_files}
                    width={width}
                    {..._.pick(this.props, 'context', 'schemas')}
                    {...this.state}
                />
            });

        }

        return tabs;
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

        var initTabs = [],
            context = this.props.context,
            width = this.getTabViewWidth();

        if (ExperimentSetsViewOverview.parentExpSetsExistForExp(context)){ // 'Experiment Sets' tab, if any parent exp-sets.
            initTabs.push(ExperimentSetsViewOverview.getTabObject(context, this.props.schemas, width));
        }

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

    /**
     * What is to be displayed at top left of page, under title, to the left of accession (if any).
     *
     * @returns {{ title: string|JSX.Element, description: string }} JS Object ascribing what to display.
     */
    typeInfo(){
        return { 'title' : this.props.context.experiment_type || null, 'description' : "Type of Experiment" };
    }

    /**
     * What is to be displayed below Item description and above the TabbedView, if anything. Can return an array or single item.
     *
     * @returns {JSX.Element[]} React elements or components to display between Item header and Item TabbedView.
     */
    itemMidSection(){
        return [
            <Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.produced_in_pub} />,
            <OverviewHeading context={this.props.context} />
        ];
    }

}

globals.content_views.register(ExperimentView, 'Experiment'); // This function registers the "ExperimentView" class as the "view" for the "Experiment" @type (and sub-types, unless overriden).


export class ExperimentMicView extends ExperimentView {
    itemMidSection(){
        return [
            <Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.produced_in_pub} />,
            <OverviewHeadingMic context={this.props.context} />
        ];
    }
}

globals.content_views.register(ExperimentMicView, 'ExperimentMic'); // This function registers the "ExperimentMicView" class as the "view" for the "ExperimentMic" @type.





/**
 * This is the first Tab of the Experiment Item view and shows what ExperimentSets the Experiment is part of.
 * @see ExperimentView.getTabViewContents()
 */
class ExperimentSetsViewOverview extends React.Component {

    static parentExpSetsExistForExp(exp){
        return (exp && Array.isArray(exp.experiment_sets) && exp.experiment_sets.length > 0 && object.atIdFromObject(exp.experiment_sets[0]));
    }

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
        var { context, width } = this.props, setsByKey = null;

        setsByKey = _.object(_.zip(_.map(context.experiment_sets, object.atIdFromObject), context.experiment_sets));

        if (setsByKey && _.keys(setsByKey).length > 0){
            return <ExperimentSetTablesLoaded experimentSetObject={setsByKey} width={width} defaultOpenIndices={[0]} />;
        }

        return null;
    }

}

/**
 * This is rendered in middle of ExperimentView, between Item header and TabbedView.
 * @see ExperimentView.itemMidSection()
 */
class OverviewHeading extends React.Component {
    render(){
        var exp = this.props.context;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), exp); // In form of { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
        var tipsForBiosample = object.tipsFromSchema(this.props.schemas || Schemas.get(), _.extend({'@type' : ['Biosample', 'Item']}, exp.biosample));
        var commonProps = {
            'tips'          : tips,                 // Object containing 'properties' from Schema for Experiment ItemType. Informs the property title (from schema) & tooltip you get when hover over property title. Obtained from schemas.
            'result'        : exp,                  // The Item from which are getting value for 'property'.
            'wrapInColumn'  : "col-xs-6 col-md-3"   // Optional. Size of the block. @see http://getbootstrap.com/docs/3.3/examples/grid/.
        };
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

/**
 * This is rendered in middle of ExperimentView, between Item header and TabbedView.
 * @see ExperimentView.itemMidSection()
 */
class OverviewHeadingMic extends React.Component {
    render(){
        var exp = this.props.context;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), exp); // In form of { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
        var tipsForBiosample = object.tipsFromSchema(this.props.schemas || Schemas.get(), _.extend({'@type' : ['Biosample', 'Item']}, exp.biosample));
        var commonProps = {
            'tips'          : tips,                 // Object containing 'properties' from Schema for Experiment ItemType. Informs the property title (from schema) & tooltip you get when hover over property title. Obtained from schemas.
            'result'        : exp,                  // The Item from which are getting value for 'property'.
            'wrapInColumn'  : "col-xs-6 col-md-3"   // Optional. Size of the block. @see http://getbootstrap.com/docs/3.3/examples/grid/.
        };
        var commonBioProps = _.extend({ 'tips' : tipsForBiosample, 'result' : exp.biosample }, { 'wrapInColumn' : commonProps.wrapInColumn });

        return (
            <OverviewHeadingContainer>
                <OverViewBodyItem {...commonProps} property='experiment_type' fallbackTitle="Experiment Type" />
                <OverViewBodyItem {...commonProps} property='follows_sop' fallbackTitle="Follows SOP" fallbackValue="No" />
                <OverViewBodyItem {...commonProps} property='biosample' fallbackTitle="Biosample" />
                <OverViewBodyItem {...commonBioProps} property='biosource' fallbackTitle="Biosample Biosource" />
                <OverViewBodyItem {...commonBioProps} property='modifications_summary' fallbackTitle="Biosample Modifications" />
                <OverViewBodyItem {...commonBioProps} property='treatments_summary' fallbackTitle="Biosample Treatments" />
                
                <OverViewBodyItem {...commonProps} property='imaging_paths' fallbackTitle="Imaging Paths"
                    wrapInColumn="col-xs-12 col-md-6 pull-right" listItemElement='div' listWrapperElement='div' singleItemClassName="block"
                    titleRenderFxn={OverViewBodyItem.titleRenderPresets.imaging_paths_from_exp} />

                <OverViewBodyItem {...commonProps} property='microscopy_technique' fallbackTitle="Microscopy Technique" />
                <OverViewBodyItem {...commonProps} property='microscope_qc' fallbackTitle="Microscope Quality Control" />
            </OverviewHeadingContainer>
        );
    }
}

export class RawFilesTableSection extends React.Component {
    render(){
        var files = this.props.files;
        var columns = _.clone(SimpleFilesTableLoaded.defaultProps.columns);
        var columnDefinitionOverrideMap = _.clone(SimpleFilesTableLoaded.defaultProps.columnDefinitionOverrideMap);

        columns['related_files'] = {
            'title' : 'Relations',
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
        if (_.any(files, function(f) { return typeof f.paired_end !== 'undefined'; })){
            columns['paired_end'] = {
                "title" : 'End',
                'widthMap' : { 'sm' : 30, 'md' : 40, 'lg' : 50 },
                'minColumnWidth' : 30
            };
        }
        
        return (
            <div className="raw-files-table-section">
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ files.length }</span> Raw File{ files.length === 1 ? '' : 's' }</span>
                </h3>
                <SimpleFilesTableLoaded {..._.pick(this.props, 'files', 'schemas', 'width')}
                    columns={columns} columnDefinitionOverrideMap={columnDefinitionOverrideMap} />
            </div>
        );
    }
}

export class ProcessedFilesTableSection extends React.Component {
    render(){
        var files = this.props.files;
        return (
            <div className="processed-files-table-section">
                <h3 className="tab-section-title">
                    <span><span className="text-400">{ files.length }</span> Processed File{ files.length === 1 ? '' : 's' }</span>
                </h3>
                <SimpleFilesTableLoaded {..._.pick(this.props, 'files', 'schemas', 'width')} />
            </div>
        );
    }
}
