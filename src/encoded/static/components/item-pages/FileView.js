'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide } from './../util';
import { FormattedInfoBlock, TabbedView, ExperimentSetTables, ExperimentSetTablesLoaded, WorkflowNodeElement } from './components';
import { OverViewBodyItem, OverviewHeadingContainer } from './DefaultItemView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue, ItemPageTable } from './../browse/components';
import { browseTableConstantColumnDefinitions } from './../browse/BrowseView';
import Graph, { parseAnalysisSteps, parseBasicIOAnalysisSteps } from './../viz/Workflow';
import { requestAnimationFrame } from './../viz/utilities';
import { commonGraphPropsFromProps, doValidAnalysisStepsExist, RowSpacingTypeDropdown } from './WorkflowView';
import { mapEmbeddedFilesToStepRunDataIDs, allFilesForWorkflowRunMappedByUUID } from './WorkflowRunView';
import { filterOutParametersFromGraphData, filterOutReferenceFilesFromGraphData, WorkflowRunTracingView, FileViewGraphSection } from './WorkflowRunTracingView';


export default class FileView extends WorkflowRunTracingView {

    /* TODO : Move to WorkflowRunTracingView, DRY up re: WorkflowRunTracingView.loadGraphSteps() */
    static doesGraphExist(context){
        return (
            (Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0)
        );
    }

    getTabViewContents(){

        var initTabs = [];
        var context = this.props.context;

        var width = (!isServerSide() && this.refs && this.refs.tabViewContainer && this.refs.tabViewContainer.offsetWidth) || null;
        if (width) width -= 20;

        initTabs.push(FileViewOverview.getTabObject(context, this.props.schemas, width));
        
        var steps = this.state.steps;

        if (FileView.doesGraphExist(context)){
            initTabs.push(FileViewGraphSection.getTabObject(this.props, this.state, this.handleToggleAllRuns));
        }

        return initTabs.concat(this.getCommonTabs());
    }

    itemMidSection(){
        return <OverviewHeading context={this.props.context} />;
    }

}

globals.content_views.register(FileView, 'File');


class FileViewOverview extends React.Component {

    static getTabObject(context, schemas, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'experiments-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <FileViewOverview context={context} schemas={schemas} width={width} />
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
        var { context } = this.props;

        var setsByKey;
        var table = null;

        if (context && (
            (Array.isArray(context.experiments) && context.experiments.length > 0) || (Array.isArray(context.experiment_sets) && context.experiment_sets.length > 0)
        )){
            setsByKey = expFxn.experimentSetsFromFile(context);
        }

        if (setsByKey && _.keys(setsByKey).length > 0){
            table = <ExperimentSetTablesLoaded experimentSetObject={setsByKey} width={this.props.width} defaultOpenIndices={[0]} />;
        }

        return (
            <div>
                <OverViewBody result={context} schemas={this.props.schemas} />
                { table }
            </div>
        );

    }

}

class OverviewHeading extends React.Component {
    render(){
        var file = this.props.context;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), file); // In form of { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
        var commonProps = {
            'tips'          : tips,
            'result'        : file,
            'wrapInColumn'  : "col-xs-6 col-md-3"
        };

        return (
            <OverviewHeadingContainer>
                <OverViewBodyItem tips={tips} result={file} property='file_format' fallbackTitle="File Format" wrapInColumn="col-sm-4 col-lg-4" />

                <OverViewBodyItem tips={tips} result={file} property='file_type' fallbackTitle="File Type" wrapInColumn="col-sm-4 col-lg-4" />

                <OverViewBodyItem tips={tips} result={file} property='file_classification' fallbackTitle="General Classification" wrapInColumn="col-sm-4 col-lg-4" />
            </OverviewHeadingContainer>
        );
    }
}

class OverViewBody extends React.Component {

    relatedFiles(){
        var file = this.props.result;
        if (!Array.isArray(file.related_files) || file.related_files.length === 0){
            return null;
        }

        return _.map(file.related_files, function(rf){

            return (
                <li className="related-file">
                    { rf.relationship_type } &nbsp;-&nbsp; { object.linkFromItem(rf.file) }
                </li>
            );
        });

    }

    render(){
        var file = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), file);

        return (
            <div className="row">
                <div className="col-md-9 col-xs-12">
                    <div className="row overview-blocks">

                        <RelatedFilesOverViewBlock tips={tips} file={file} property="related_files" wrapInColumn hideIfNoValue />

                    </div>
                </div>

                <div className="col-md-3 col-xs-12">
                    <div className="file-download-container">
                        <fileUtil.FileDownloadButtonAuto result={file} />
                        { file.file_size && typeof file.file_size === 'number' ?
                        <h6 className="text-400">
                            <i className="icon icon-fw icon-hdd-o" /> { Schemas.Term.toName('file_size', file.file_size) }
                        </h6>
                        : null }
                    </div>
                </div>

            </div>
        );

    }
}

/**
 * Reuse when showing related_files of an Item.
 */
export class RelatedFilesOverViewBlock extends React.Component {

    static defaultProps = {
        'wrapInColumn' : true,
        'property' : 'related_files'
    }

    relatedFiles(){
        var { file, related_files, property } = this.props;
        var relatedFiles;
        if (typeof related_files === 'undefined' || related_files === null){
            relatedFiles = file[property] || file.related_files;
        } else {
            relatedFiles = related_files;
        }

        if (!Array.isArray(relatedFiles) || relatedFiles.length === 0){
            return null;
        }

        return _.map(relatedFiles, function(rf, i){
            return (<li className="related-file" key={object.itemUtil.atId(rf.file) || i}>{ rf.relationship_type } &nbsp;-&nbsp; { object.linkFromItem(rf.file) }</li>);
        });

    }

    render(){
        var { file, related_files, property, hideIfNoValue, tips, wrapInColumn } = this.props;
        var relatedFiles;
        if (typeof related_files === 'undefined' || related_files === null){
            relatedFiles = file[property] || file.related_files;
        } else {
            relatedFiles = related_files;
        }

        var vals = this.relatedFiles();

        if (hideIfNoValue && !vals){
            return null;
        } else {
            vals = <li className="related-file"><em>None</em></li>;
        }

        var elem = (
            <div className="inner">
                <object.TooltipInfoIconContainerAuto result={file} property={property || "related_files"} tips={tips} elementType="h5" fallbackTitle="Related Files" />
                <ul className="overview-list-elements-container">{ vals }</ul>
            </div>
        );

        if (wrapInColumn){
            return <div className={typeof wrapInColumn === 'string' ? wrapInColumn : "col-sm-12"} children={elem} />;
        } else {
            return elem;
        }


    }
}

