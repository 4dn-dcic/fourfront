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
import FileView, { FileOverViewBody, RelatedFilesOverViewBlock, FileViewDownloadButtonColumn } from './FileView';



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
                        <span>More Information</span>
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

        var parentExperimentsReversed = (file.experiments || []).slice(0).reverse(); // Last is newest.

        var parentExperimentWithImagingPaths = _.find(parentExperimentsReversed, function(exp){
            return Array.isArray(exp.imaging_paths) && exp.imaging_paths.length > 0 && typeof exp.imaging_paths[0].channel === 'string' && exp.imaging_paths[0].path; 
        }) || parentExperimentsReversed[0] || null;

        return (

            <div className="row overview-blocks">

                { file.thumbnail && typeof file.thumbnail === 'string' ?
                    <div className="col xs-6 col-sm-2">
                        <Thumbnail href={ file.omerolink || null } className="inline-block" alt="OMERO Thumbnail" target="_blank" src={file.thumbnail} style={{ margin : '12px 0px 0px 0px' }} />
                    </div>
                    : null
                }

                <RelatedFilesOverViewBlock tips={tips} file={file} property="related_files" wrapInColumn={"col-xs-12 col-sm-" + (file.thumbnail && typeof file.thumbnail === 'string' ? '4' : '6' )} />

                { parentExperimentWithImagingPaths ? 
                    <OverViewBodyItem result={parentExperimentWithImagingPaths} tips={object.tipsFromSchema(this.props.schemas || Schemas.get(), parentExperimentWithImagingPaths)} wrapInColumn="col-xs-12 col-md-6 pull-right" property='imaging_paths' fallbackTitle="Imaging Paths" listItemElement='div' listWrapperElement='div' singleItemClassName="block" titleRenderFxn={(field, value, allowJX = true, includeDescriptionTips = true, index = null, wrapperElementType = 'li')=>{
                        if (!value || typeof value !== 'object') return null;
                        var { channel, path } = value;

                        function getLightSourceCenterMicroscopeSettingFromFile(fileItem){
                            if (typeof channel !== 'string' || channel.slice(0,2) !== 'ch' || !fileItem) return null;
                            return fileItem.microscope_settings && (fileItem.microscope_settings[channel + '_light_source_center_wl'] || fileItem.microscope_settings[channel + '_lasers_diodes']);
                        }

                        var matchingFile = _.find(parentExperimentWithImagingPaths.files || [], getLightSourceCenterMicroscopeSettingFromFile);

                        return (
                            <div className="imaging-path-item-wrapper row">
                                <div className="index-num col-xs-2 mono-text text-500"><small>{ channel }</small></div>
                                <div className={"imaging-path col-xs-" + (matchingFile ? '7' : '10')}>{ object.itemUtil.generateLink(path, true) }</div>
                                { matchingFile ? <div className="microscope-setting col-xs-3 text-right">{ getLightSourceCenterMicroscopeSettingFromFile(matchingFile) }</div> : null }
                            </div>
                        );

                    }} />
                : null }

            </div>

        );

    }
}

