'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox, Thumbnail } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide } from './../util';
import { FormattedInfoBlock, TabbedView, ExperimentSetTables, ExperimentSetTablesLoaded, WorkflowNodeElement } from './components';
import { ItemBaseView } from './DefaultItemView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue, ItemPageTable } from './../browse/components';
import { browseTableConstantColumnDefinitions } from './../browse/BrowseView';
import { filterOutParametersFromGraphData, filterOutReferenceFilesFromGraphData, FileViewGraphSection } from './WorkflowRunTracingView';
import FileView from './FileView';



export default class FileMicroscopyView extends FileView {

    getTabViewContents(){

        var initTabs = [];
        var context = this.props.context;

        var width = (!isServerSide() && this.refs && this.refs.tabViewContainer && this.refs.tabViewContainer.offsetWidth) || null;
        if (width) width -= 20;

        initTabs.push(FileMicroscopyViewOverview.getTabObject(context, this.props.schemas, width));

        if (FileView.doesGraphExist(context)){
            initTabs.push(FileViewGraphSection.getTabObject(this.props, this.state, this.handleToggleAllRuns));
        }
        
        return initTabs.concat(this.getCommonTabs());
    }

}

globals.content_views.register(FileMicroscopyView, 'FileMicroscopy');


class FileMicroscopyViewOverview extends React.Component {

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
                    <FileMicroscopyViewOverview context={context} schemas={schemas} width={width} />
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
            })).isRequired
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

                        

                        <div className="col-sm-4 col-lg-4">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'file_format'} tips={tips} elementType="h5" fallbackTitle="File Format" />
                                <div>
                                    { Schemas.Term.toName('file_format', file.file_format) || 'Unknown/Other' }
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-4 col-lg-4">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property="file_type" tips={tips} elementType="h5" fallbackTitle="File Type" />
                                <div>
                                    { Schemas.Term.toName('file_type', file.file_type) || 'Unknown/Other'}
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-4 col-lg-4">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'file_classification'} tips={tips} elementType="h5" fallbackTitle="General Classification" />
                                <div>
                                    { file.file_classification ? Schemas.Term.toName('file_classification', file.file_classification) : 'Unknown/Other' }
                                </div>
                            </div>
                        </div>
                        { file.thumbnail ?
                        <div className="col-sm-4 col-lg-4">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property="thumbnail" tips={tips} elementType="h5" fallbackTitle="Thumbnail" />
                                  <Thumbnail href={ file.omerolink } className="inline-block" alt="thumbnail" target="_blank" src= { file.thumbnail } />
                            </div>
                        </div>
                        : null }
                        


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

