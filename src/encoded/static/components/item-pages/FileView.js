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
import { FileDownloadButton } from '../util/file';

let HiGlassComponent = null;

export default class FileView extends WorkflowRunTracingView {

    /* TODO : Move to WorkflowRunTracingView, DRY up re: WorkflowRunTracingView.loadGraphSteps() */
    static doesGraphExist(context){
        return (
            (Array.isArray(context.workflow_run_outputs) && context.workflow_run_outputs.length > 0)
        );
    }

    constructor(props){
        super(props);
        this.validateHiGlassData = this.validateHiGlassData.bind(this);
        this.state.validatingHiGlassTileData = true;
        this.state.isValidHiGlassData = false;

        this.hiGlassViewConfig = {
            "editable": true,
            "zoomFixed": false,
            "trackSourceServers": [
                "http://54.86.58.34/api/v1"
            ],
            "exportViewUrl": "/api/v1/viewconfs",
            "views": [
                {
                    "uid": "aa",
                    "initialXDomain": [
                        234746886.15079364,
                        238230126.6906902
                    ],
                    "tracks": {
                        "top": [],
                        "left": [],
                        "center": [
                            {
                                "uid": "c1",
                                "type": "combined",
                                "height": 551,
                                "contents": [
                                    {
                                        "server": "http://54.86.58.34/api/v1",
                                        "tilesetUid": "W2hNwnu2TwiDqqCUxxzA1g",
                                        "type": "heatmap",
                                        "position": "center",
                                        "uid": "GjuZed1ySGW1IzZZqFB9BA"
                                    }
                                ],
                                "position": "center"
                            }
                        ],
                        "right": [],
                        "bottom": []
                    },
                    "layout": {
                        "w": 12,
                        "h": 13,
                        "x": 0,
                        "y": 0,
                        "i": "aa",
                        "moved": false,
                        "static": false
                    },
                    "initialYDomain": [
                        235207586.8246398,
                        238862012.2628646
                    ]
                }
            ],
        };
    }

    componentDidMount(){
        super.componentDidMount();
        this.validateHiGlassData();
    }

    /** Request the ID in this.hiGlassViewConfig, ensure that is available and has min_pos, max_pos, then update state. */
    validateHiGlassData(){
        var tilesetUid = "W2hNwnu2TwiDqqCUxxzA1g";
        var uid = "GjuZed1ySGW1IzZZqFB9BA";

        var fallback = function(){
            this.setState({
                'isValidHiGlassData' : false,
                'validatingHiGlassTileData' : false
            });
        }.bind(this);

        // TODO: grab server, ?d= & ?s= URI params from this.hiGlassViewConfig.
        ajax.load('http://54.86.58.34/api/v1/tileset_info/?d=' + tilesetUid + 'g&s=' + uid, (resp)=>{
            if (resp[tilesetUid] && resp[tilesetUid].name && Array.isArray(resp[tilesetUid].min_pos) && Array.isArray(resp[tilesetUid].max_pos) && resp[tilesetUid].min_pos.length > 0 && resp[tilesetUid].max_pos.length > 0) {
                this.setState({
                    'isValidHiGlassData' : true,
                    'validatingHiGlassTileData' : false
                });
            } else {
                fallback();
            }
        }, 'GET', fallback);
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

        if (context.file_format === 'mcool'){
            initTabs.push(HiGlassTabView.getTabObject(context, this.hiGlassViewConfig, !this.state.isValidHiGlassData, this.state.validatingHiGlassTileData));
        }

        return initTabs.concat(this.getCommonTabs());
    }

    itemMidSection(){
        return <layout.WindowResizeUpdateTrigger><FileOverviewHeading context={this.props.context} /></layout.WindowResizeUpdateTrigger>;
    }

}

globals.content_views.register(FileView, 'File');


class HiGlassTabView extends React.Component {

    static getTabObject(context, viewConfig, disabled, isValidating){
        return {
            'tab' : <span><i className={"icon icon-fw icon-" + (isValidating ? 'circle-o-notch icon-spin' : 'search')}/> HiGlass Browser</span>,
            'key' : 'higlass',
            'disabled' : disabled,
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>HiGlass Browser</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <HiGlassTabView viewConfig={viewConfig} context={context} />
                </div>
            )
        };
        
    }

    constructor(props){
        super(props);
        this.state = { 'mounted' : false }; 
        this.options = { "bounded" : true };
        this.hiGlassElement = null;
    }

    componentDidMount(){
        setTimeout(()=>{ // Allow tab CSS transition to finish (the render afterwards lags browser a little bit).
            HiGlassComponent = require('higlass').HiGlassComponent;
            this.setState({ 'mounted' : true });
        }, 250);
    }

    render(){
        let hiGlassInstance = null;
        if (this.state.mounted){
            hiGlassInstance = (
                <HiGlassComponent
                    ref={(r)=>{ this.hiGlassElement = window.hiGlassElement = r; }}
                    options={this.options}
                    viewConfig={this.props.viewConfig}
                />
            );
        }
        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className="higlass-tab-view-contents">
                <link type="text/css" rel="stylesheet" href="https://unpkg.com/higlass@0.10.19/dist/styles/hglib.css" />
                <div className="higlass-wrapper row" style={{ 'height' : 650 }}>
                    { hiGlassInstance || (
                        <div className="col-sm-12 text-center mt-4">
                            <h3><i className="icon icon-fw icon-circle-o-notch icon-spin"/></h3>
                            Initializing
                        </div>
                    ) }
                </div>
            </div>
        );
    }
}

class FileViewOverview extends React.Component {

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
                <FileOverViewBody result={context} schemas={this.props.schemas} />
                { table }
            </div>
        );

    }

}

export class FileOverviewHeading extends React.Component {

    constructor(props){
        super(props);
        this.onTransition = this.onTransition.bind(this);
        this.overviewBlocks = this.overviewBlocks.bind(this);
        this.state = {
            isPropertiesOpen : true,
            mounted : false
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    onTransition(isOpen = false){
        this.setState({ isPropertiesOpen : isOpen });
    }

    overviewBlocks(){
        var file = this.props.context;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), file); // In form of { 'description' : {'title', 'description', 'type'}, 'experiment_type' : {'title', 'description', ...}, ... }
        return [
            <OverViewBodyItem tips={tips} result={file} property='file_format' fallbackTitle="File Format" wrapInColumn="col-sm-3 col-lg-3" />,
            <OverViewBodyItem tips={tips} result={file} property='file_type' fallbackTitle="File Type" wrapInColumn="col-sm-3 col-lg-3" />,
            <OverViewBodyItem tips={tips} result={file} property='file_classification' fallbackTitle="General Classification" wrapInColumn="col-sm-3 col-lg-3" />,
            <OverViewBodyItem tips={tips} result={file} property='file_size' fallbackTitle="File Size" wrapInColumn="col-sm-3 col-lg-3" titleRenderFxn={(field, size)=>
                <span className="text-400"><i className="icon icon-fw icon-hdd-o"/> { Schemas.Term.toName('file_size', size) }</span>
            } />
        ];
    }

    render(){
        var responsiveSize = layout.responsiveGridState();
        var isSmallerSize = this.state.mounted && (responsiveSize === 'xs' || responsiveSize === 'sm');
        return (
            <div className={"row" + (!isSmallerSize ? ' flexrow' : '')}>
                <div className="col-xs-12 col-md-9 col-lg-8">
                    <OverviewHeadingContainer onStartClose={this.onTransition.bind(this, false)} onFinishOpen={this.onTransition.bind(this, true)} children={this.overviewBlocks()}/>
                </div>
                <div className={"col-xs-12 col-md-3 col-lg-4 mt-1" + (this.state.isPropertiesOpen || isSmallerSize ? ' mb-3' : '')}>
                    <FileViewDownloadButtonContainer file={this.props.context} size="lg" verticallyCentered={!isSmallerSize && this.state.isPropertiesOpen} />
                </div>

            </div>
        );
    }
}

export class FileViewDownloadButtonContainer extends React.Component {

    static defaultProps = {
        'size' : null
    }

    render(){
        var file = this.props.file || this.props.context || this.props.result;
        return (
            <layout.VerticallyCenteredChild disabled={!this.props.verticallyCentered}>
                <div className={"file-download-container" + (this.props.className ? ' ' + this.props.className : '')}>
                    <fileUtil.FileDownloadButtonAuto result={file} size={this.props.size} />
                </div>
            </layout.VerticallyCenteredChild>
        );
    }
}

export class FileOverViewBody extends React.Component {

    render(){
        var file = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), file);

        return (
            <div className="row">

                <div className="col-md-9 col-xs-12">
                    <div className="row overview-blocks">

                        <RelatedFilesOverViewBlock tips={tips} file={file} property="related_files" wrapInColumn />

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
        if (Array.isArray(related_files) && related_files.length > 0){
            relatedFiles = related_files;
        } else {
            relatedFiles = file[property] || file.related_files;
        }

        if (!Array.isArray(relatedFiles) || relatedFiles.length === 0){
            return null;
        }

        console.log('RFFFF', relatedFiles);

        return _.map(relatedFiles, function(rf, i){
            return (<li className="related-file" key={object.itemUtil.atId(rf.file) || i}>{ rf.relationship_type } &nbsp;-&nbsp; { object.linkFromItem(rf.file) }</li>);
        });

    }

    render(){
        var { file, related_files, property, hideIfNoValue, tips, wrapInColumn } = this.props;

        var relatedFiles = this.relatedFiles();

        if (hideIfNoValue && !relatedFiles){
            return null;
        } else if (!relatedFiles) {
            relatedFiles = <li className="related-file"><em>None</em></li>;
        }

        var elem = (
            <div className="inner">
                <object.TooltipInfoIconContainerAuto result={file} property={property || "related_files"} tips={tips} elementType="h5" fallbackTitle="Related Files" />
                <ul className="overview-list-elements-container">{ relatedFiles }</ul>
            </div>
        );

        if (wrapInColumn){
            return <div className={typeof wrapInColumn === 'string' ? wrapInColumn : "col-sm-12"} children={elem} />;
        } else {
            return elem;
        }


    }
}

