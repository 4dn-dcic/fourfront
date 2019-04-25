'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox, Thumbnail } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide } from './../util';
import { FormattedInfoBlock, TabbedView, ExperimentSetTables, ExperimentSetTablesLoaded, WorkflowNodeElement } from './components';
import { OverViewBodyItem } from './DefaultItemView';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue } from './../browse/components';
import { filterOutParametersFromGraphData, filterOutReferenceFilesFromGraphData, FileViewGraphSection } from './WorkflowRunTracingView';
import FileView, { FileOverViewBody, RelatedFilesOverViewBlock, FileViewDownloadButtonColumn, QualityControlResults } from './FileView';


export default class FileMicroscopyView extends FileView {

    getTabViewContents(){
        var tabs =  super.getTabViewContents();

        // Replace default FileOverview (1st tab) with FileMicroscopyViewOverview
        tabs[0] = FileMicroscopyViewOverview.getTabObject(
            this.props,
            tabs[0].content && tabs[0].content.props.children[2] && tabs[0].content.props.children[2].props.width
        );

        return tabs;
    }

}


class FileMicroscopyViewOverview extends React.Component {

    static getTabObject({context, schemas, windowWidth }, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'experiments-info',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>More Information</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <FileMicroscopyViewOverview {...{ context, schemas, windowWidth, width }} />
                </div>
            )
        };
    }

    static propTypes = {
        'context' : PropTypes.shape({
            'experiments' : PropTypes.arrayOf(PropTypes.shape({
                'experiment_sets' : PropTypes.arrayOf(PropTypes.shape({
                    '@id' : PropTypes.string.isRequired
                }))
            })).isRequired
        }).isRequired
    }

    render(){
        var { context, schemas, width, windowWidth } = this.props;

        var setUrls = expFxn.experimentSetsFromFile(context, 'ids'),
            table;

        if (setUrls && setUrls.length > 0){
            table = <ExperimentSetTablesLoaded experimentSetUrls={setUrls} width={width} windowWidth={windowWidth} defaultOpenIndices={[0]} id={object.itemUtil.atId(context)} />;
        }

        return (
            <div>
                <FileMicOverViewBody result={context} schemas={schemas} windowWidth={windowWidth} />
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

        var parentExperimentsReversed = (file.experiments || []).slice(0).reverse(); // Last is newest.

        var parentExperimentWithImagingPaths = _.find(parentExperimentsReversed, function(exp){
            return Array.isArray(exp.imaging_paths) && exp.imaging_paths.length > 0 && typeof exp.imaging_paths[0].channel === 'string' && exp.imaging_paths[0].path;
        }) || parentExperimentsReversed[0] || null;

        var thumbnail = typeof file.thumbnail === 'string' && file.thumbnail;
        if (thumbnail && thumbnail.slice(-5) === '/100/') {
            thumbnail = thumbnail.slice(0, -5) + '/360/';
        }

        return (
            <div>
                <div className="row overview-blocks">

                    { thumbnail ?
                        <div className="col xs-6 col-sm-4">
                            <Thumbnail href={ file.omerolink || null } className="inline-block" alt="OMERO Thumbnail" target="_blank" src={thumbnail} style={{ margin : '12px 0px 0px 0px' }} />
                        </div>
                        : null
                    }

                    { parentExperimentWithImagingPaths ?
                        <OverViewBodyItem
                            result={parentExperimentWithImagingPaths} tips={object.tipsFromSchema(this.props.schemas || Schemas.get(), parentExperimentWithImagingPaths)}
                            wrapInColumn={"col-xs-12 pull-right col-sm-" + (thumbnail ? '8' : '12')} property='imaging_paths' fallbackTitle="Imaging Paths"
                            listItemElement='div' listWrapperElement='div' singleItemClassName="block" titleRenderFxn={OverViewBodyItem.titleRenderPresets.imaging_paths_from_exp} />
                    : null }

                    <QualityControlResults property="quality_metric" tips={tips} file={file} wrapInColumn={thumbnail ? "col-sm-8" : "col-sm-6"} schemas={this.props.schemas} />

                    <RelatedFilesOverViewBlock tips={tips} file={file} property="related_files" wrapInColumn={"col-xs-12 " + (thumbnail ? "col-sm-8" : "col-sm-6")} />

                </div>
            </div>

        );

    }
}
