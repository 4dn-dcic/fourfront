'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ExperimentSetDetailPane, ItemPageTable } from './../../browse/components';
import { ajax, console, layout, expFxn } from './../../util';


export class ExperimentSetTables extends React.Component {

    static propTypes = {
        'experiment_sets' : PropTypes.array.isRequired,
        'loading' : PropTypes.bool,
        'sortFxn' : PropTypes.func
    }
    
    static defaultProps = {
        'sortFxn' : function(expSetA, expSetB){
            if (!Array.isArray(expSetA['@type']) || !Array.isArray(expSetB['@type'])) return 0;
            if (expSetA['@type'].indexOf('ExperimentSetReplicate') > -1) return -1;
            if (expSetB['@type'].indexOf('ExperimentSetReplicate') > -1) return 1;
            return 0;
        }
    }

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

        if (typeof this.props.sortFxn === 'function'){
            experiment_sets = experiment_sets.sort(this.props.sortFxn);
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
                        'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47
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
                    width={this.props.width}
                    defaultOpenIndices={this.props.defaultOpenIndices}
                    defaultOpenIds={this.props.defaultOpenIds}
                />
            </div>
        );
    }
}

export class ExperimentSetTablesLoaded extends React.Component {

    static propTypes = {
        //'children' : PropTypes.element.isRequired,
        'experimentSetObject' : PropTypes.object.isRequired,
        'sortFxn' : PropTypes.func
    }

    static isExperimentSetCompleteEnough(expSet){
        // TODO
        return false;
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);

        // Get ExpSets from this file, check if are complete (have bio_rep_no, etc.), and use if so; otherwise, save 'this.experiment_set_uris' to be picked up by componentDidMount and fetched.
        var experiment_sets_obj = props.experimentSetObject;
        var experiment_sets = _.values(experiment_sets_obj);
        var experiment_sets_for_state = null;

        if (Array.isArray(experiment_sets) && experiment_sets.length > 0 && ExperimentSetTablesLoaded.isExperimentSetCompleteEnough(experiment_sets[0])){
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
        return (
            <layout.WindowResizeUpdateTrigger>
                <ExperimentSetTables
                    loading={this.state.loading}
                    experiment_sets={this.state.experiment_sets}
                    sortFxn={this.props.sortFxn}
                    width={this.props.width}
                    defaultOpenIndices={this.props.defaultOpenIndices}
                    defaultOpenIds={this.props.defaultOpenIds}
                />
            </layout.WindowResizeUpdateTrigger>
        );
    }
}
