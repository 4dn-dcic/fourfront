'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ExperimentSetDetailPane, ItemPageTable, ItemPageTableLoader, ItemPageTableBatchLoader } from './../../browse/components';
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
        var experiment_sets = this.props.experiment_sets || this.props.results;
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
        'experimentSetObject' : PropTypes.object.isRequired,
        'sortFxn' : PropTypes.func
    }

    static isExperimentSetCompleteEnough(expSet){
        // TODO
        return false;
    }

    render(){
        return (
            <ItemPageTableLoader itemsObject={this.props.experimentSetObject} isItemCompleteEnough={ExperimentSetTablesLoaded.isExperimentSetCompleteEnough}>
                <ExperimentSetTables
                    sortFxn={this.props.sortFxn}
                    width={this.props.width}
                    defaultOpenIndices={this.props.defaultOpenIndices}
                    defaultOpenIds={this.props.defaultOpenIds}
                />
            </ItemPageTableLoader>
        );
    }
}
