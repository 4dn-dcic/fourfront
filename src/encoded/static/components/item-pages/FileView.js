'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as globals from './../globals';
import { object, expFxn, ajax, Schemas, layout } from './../util';
import { ItemHeader, ItemPageTitle, PartialList, ExternalReferenceLink, FormattedInfoBlock, ItemFooterRow, TabbedView, Publications } from './components';
import { ItemBaseView } from './DefaultItemView';
import ExperimentsTable from './../experiments-table';
import { ExperimentSetDetailPane } from './../browse/components';



export default class FileView extends ItemBaseView {

    getTabViewContents(){

        var initTabs = [];

        if (Array.isArray(this.props.context.experiments)){
            initTabs.push(FileViewOverview.getTabObject(this.props.context));
        }

        return initTabs.concat(this.getCommonTabs());
    }

}

globals.panel_views.register(FileView, 'File');


class FileViewOverview extends React.Component {

    static getTabObject(context){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Overview</span>,
            'key' : 'experiments-info',
            'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>Overview</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <FileViewOverview context={context} />
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

        console.log(this.state, this.experiment_set_uris);

        var expSetsTable;
        if (this.state.loading || this.state.experiment_sets){
            expSetsTable = (
                <FileViewExperimentSetTables
                    loading={this.state.loading}
                    experiment_sets={this.state.experiment_sets}
                />
            );
        }


        return (
            <div>
                -- OTHER STUFF GOES HERE, LIKE DOWNLOAD BUTTON AND FILE SIZE --
                <br/>
                <br/>
                { expSetsTable }
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
            <div className="file-part-of-experiment-sets-container">
                <h3 className="tab-section-title">
                    <span>In Experiment Sets</span>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <div className="clearfix">
                    
                    { experiment_sets.map(function(es){return <ExperimentSetTableRow experiment_set={es} />; }) }
                </div>
            </div>
        );
    }
}

class ExperimentSetTableRow extends React.Component {

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = { 'open' : false };
    }

    toggleOpen(){
        this.setState({ open : !this.state.open });
    }

    render(){
        var experiment_set = this.props.experiment_set;
        return (
            <div className="exp-table-row-container">
                <h5 className="text-400">
                    <i className={"icon icon-fw icon-" + ( this.state.open ? 'minus' : 'plus' )} onClick={this.toggleOpen} />
                    {' '}
                    { Schemas.getItemTypeTitle(experiment_set) }
                    {' '}
                    <a href={object.atIdFromObject(experiment_set)} className="mono-text text-400">{ experiment_set.accession }</a>
                </h5>
                { this.state.open ?
                <layout.WindowResizeUpdateTrigger>
                <ExperimentSetDetailPane
                                result={experiment_set}
                            />
                </layout.WindowResizeUpdateTrigger>
                : null }
            </div>
        );
    }

}