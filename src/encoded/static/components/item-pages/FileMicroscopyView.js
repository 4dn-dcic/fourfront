'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox, Thumbnail } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide } from './../util';
import { FormattedInfoBlock, TabbedView, ExperimentSetTables, ExperimentSetTablesLoaded, WorkflowNodeElement } from './components';
import { OverViewBodyItem } from './DefaultItemView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue, ItemPageTable } from './../browse/components';
import { browseTableConstantColumnDefinitions } from './../browse/BrowseView';
import { filterOutParametersFromGraphData, filterOutReferenceFilesFromGraphData, FileViewGraphSection } from './WorkflowRunTracingView';
import FileView, { FileOverViewBody, RelatedFilesOverViewBlock } from './FileView';



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
                <FileMicOverViewBody result={context} schemas={this.props.schemas} />
                { table }
            </div>
        );

    }

}

/**
 * Adds a Thumbnail item to FileOverViewBody.
 */
class FileMicOverViewBody extends FileOverViewBody {
    render(){
        var file = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), file);

        return (
            <div className="row">
                <div className="col-md-9 col-xs-12">
                    <div className="row overview-blocks">

                        

                        { file.thumbnail && typeof file.thumbnail === 'string' ?
                            <div className="col xs-6 col-sm-2">
                                <Thumbnail href={ file.omerolink || null } className="inline-block" alt="OMERO Thumbnail" target="_blank" src={file.thumbnail} style={{ margin : '12px 0px 0px 0px' }} />
                            </div>
                            : null
                        }

                        <RelatedFilesOverViewBlock tips={tips} file={file} property="related_files" wrapInColumn="col-xs-12 col-sm-6" />

                    </div>

                </div>
                { this.downloadButtonColumn() }
            </div>
        );

    }
}

