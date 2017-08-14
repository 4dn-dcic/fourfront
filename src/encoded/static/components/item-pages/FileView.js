'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as globals from './../globals';
import { object, expFxn, ajax, Schemas, layout } from './../util';
import { FormattedInfoBlock, TabbedView, FileDownloadButton, FileDownloadButtonAuto } from './components';
import { ItemBaseView } from './DefaultItemView';
import ExperimentsTable from './../experiments-table';
import { ExperimentSetDetailPane, ResultRowColumnBlockValue, ItemPageTable } from './../browse/components';
import { browseTableConstantColumnDefinitions } from './../browse/BrowseView';



export default class FileView extends ItemBaseView {

    getTabViewContents(){

        var initTabs = [];

        //if (Array.isArray(this.props.context.experiments)){
        initTabs.push(FileViewOverview.getTabObject(this.props.context, this.props.schemas));
        //}

        return initTabs.concat(this.getCommonTabs());
    }

}

globals.panel_views.register(FileView, 'File');


class FileViewOverview extends React.Component {

    static getTabObject(context, schemas){
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
                    <FileViewOverview context={context} schemas={schemas} />
                </div>
            )
        };
    }

    static isExperimentSetCompleteEnough(expSet){
        // TODO
        return false;
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

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);

        // Get ExpSets from this file, check if are complete (have bio_rep_no, etc.), and use if so; otherwise, save 'this.experiment_set_uris' to be picked up by componentDidMount and fetched.
        var experiment_sets_obj = expFxn.experimentSetsFromFile(props.context);
        var experiment_sets = _.values(expFxn.experimentSetsFromFile(props.context));
        var experiment_sets_for_state = null;

        if (Array.isArray(experiment_sets) && experiment_sets.length > 0 && FileViewOverview.isExperimentSetCompleteEnough(experiment_sets[0])){
            experiment_sets_for_state = experiment_sets;
        } else {
            this.experiment_set_uris = _.keys(experiment_sets_obj);
        }

        this.state = {
            'experiment_sets' : experiment_sets_for_state,
            'current_es_index' : false
        };
    }

    componentDidMount(){
        var newState = {};

        var onFinishLoad = null;

        if (Array.isArray(this.experiment_set_uris) && this.experiment_set_uris.length > 0){

            onFinishLoad = _.after(this.experiment_set_uris.length, function(){
                this.setState({ 'loading' : false });
            }.bind(this));

            newState.loading = true;
            _.forEach(this.experiment_set_uris, (uri)=>{
                ajax.load(uri, (r)=>{
                    var currentExpSets = (this.state.experiment_sets || []).slice(0);
                    currentExpSets.push(r);
                    this.setState({ experiment_sets : currentExpSets });
                    onFinishLoad();
                }, 'GET', onFinishLoad);
            });
        }
        
        if (_.keys(newState).length > 0){
            this.setState(newState);
        }
    }

    componentWillUnmount(){
        delete this.experiment_set_uris;
    }

    render(){
        var { context } = this.props;

        var expSetsTable;
        if (this.state.loading || this.state.experiment_sets){
            expSetsTable = (
                <layout.WindowResizeUpdateTrigger>
                    <FileViewExperimentSetTables
                        loading={this.state.loading}
                        experiment_sets={this.state.experiment_sets}
                    />
                </layout.WindowResizeUpdateTrigger>
            );
        }


        return (
            <div>
                <OverViewBody result={context} schemas={this.props.schemas} />
                { expSetsTable }
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
                    { rf.relationship_type } { object.linkFromItem(rf.file) }
                </li>
            );
        });

    }

    render(){
        var file = this.props.result;
        var tips = object.tipsFromSchema(this.props.schemas || Schemas.get(), file);
        console.log(tips);
        return (
            <div className="row">
                <div className="col-md-9 col-xs-12">
                    <div className="row overview-blocks">

                        <div className="col-sm-4 col-lg-3">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'file_format'} tips={tips} elementType="h5" fallbackTitle="File Format" />
                                <div>
                                    { Schemas.Term.toName('file_format', file.file_format) || 'Unknown/Other' }
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-4 col-lg-3">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'file_type'} tips={tips} elementType="h5" fallbackTitle="File Type" />
                                <div>
                                    { Schemas.Term.toName('file_type', file.file_type) || 'Unknown/Other'}
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-4 col-lg-3">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'file_classification'} tips={tips} elementType="h5" fallbackTitle="General Classification" />
                                <div>
                                    { Schemas.Term.toName('file_classification', file.file_classification) }
                                </div>
                            </div>
                        </div>

                        <div className="col-sm-12 col-lg-3">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'notes'} tips={tips} elementType="h5" fallbackTitle="Notes" />
                                <div>
                                    { file.notes }
                                </div>
                            </div>
                        </div>

                        <div className="col-sm-12">
                            <div className="inner">
                                <object.TooltipInfoIconContainerAuto result={file} property={'related_files'} tips={tips} elementType="h5" fallbackTitle="Related Files" />
                                <ul>
                                    { this.relatedFiles() }
                                </ul>
                            </div>
                        </div>



                    </div>

                </div>
                <div className="col-md-3 col-xs-12">
                    <div className="file-download-container">
                        <FileDownloadButtonAuto result={file} />
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




class FileViewExperimentSetTables extends React.Component {

    render(){
        var experiment_sets = this.props.experiment_sets;
        var loading = this.props.loading;

        if (this.props.loading || !Array.isArray(experiment_sets)){
            return (
                <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    <i className="icon icon-fw icon-spin icon-circle-o-notch"/>
                </div>
            );
        }

        

        
        return (
            <div className="file-part-of-experiment-sets-container" ref="experimentSetsContainer">
                <h3 className="tab-section-title">
                    <span>In Experiment Sets</span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <ItemPageTable
                    results={experiment_sets}
                    renderDetailPane={(es, rowNum, width)=> <ExperimentSetDetailPane result={es} containerWidth={width || null} paddingWidthMap={{
                        'xs' : 0, 'sm' : 10, 'md' : 30, 'lg' : 47
                    }} />}
                    columns={{
                        "number_of_experiments" : "Exps",
                        "experiments_in_set.experiment_type": "Experiment Type",
                        "experiments_in_set.biosample.biosource.individual.organism.name": "Organism",
                        "experiments_in_set.biosample.biosource_summary": "Biosource Summary",
                        "experiments_in_set.digestion_enzyme.name": "Enzyme",
                        "experiments_in_set.biosample.modifications_summary": "Modifications",
                        "experiments_in_set.biosample.treatments_summary": "Treatments"
                    }}
                />
            </div>
        );
    }
}
