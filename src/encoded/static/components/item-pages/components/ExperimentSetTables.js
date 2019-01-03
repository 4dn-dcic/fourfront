'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ExperimentSetDetailPane, ItemPageTable, ItemPageTableLoader, ItemPageTableSearchLoaderPageController, defaultColumnDefinitionMap } from './../../browse/components';
import { ajax, console, layout, expFxn } from './../../util';


export class ExperimentSetTables extends React.Component {

    static propTypes = {
        'loading' : PropTypes.bool,
        'sortFxn' : PropTypes.func,
        'windowWidth' : PropTypes.number.isRequired
    }
    
    static defaultProps = {
        'sortFxn' : function(expSetA, expSetB){
            if (!Array.isArray(expSetA['@type']) || !Array.isArray(expSetB['@type'])) return 0;
            if (expSetA['@type'].indexOf('ExperimentSetReplicate') > -1) return -1;
            if (expSetB['@type'].indexOf('ExperimentSetReplicate') > -1) return 1;
            return 0;
        },
        'title' : <span>In Experiment Sets</span>
    }

    render(){
        var { loading, sortFxn, title, windowWidth } = this.props,
            experiment_sets = this.props.experiment_sets || this.props.results;

        if (loading || !Array.isArray(experiment_sets)){
            return (
                <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    <i className="icon icon-fw icon-spin icon-circle-o-notch"/>
                </div>
            );
        } else if (experiment_sets.length === 0){
            return (
                <div className="text-center text-300 mt-1" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    Not used in any Experiment Sets
                </div>
            );
        }

        if (typeof sortFxn === 'function'){
            experiment_sets = experiment_sets.sort(sortFxn);
        }
        
        return (
            <div className="file-part-of-experiment-sets-container" ref="experimentSetsContainer">
                <h3 className="tab-section-title">{ title }</h3>
                <ItemPageTable
                    results={experiment_sets}
                    renderDetailPane={(es, rowNum, width)=>
                        <ExperimentSetDetailPane result={es} containerWidth={width || null} windowWidth={windowWidth} paddingWidthMap={{
                            'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47
                        }} />
                    }
                    columns={{
                        "display_title" : { "title" : "Title" },
                        "number_of_experiments" : { "title" : "Exps" },
                        "experiments_in_set.experiment_type": { "title" : "Experiment Type" },
                        "experiments_in_set.biosample.biosource.individual.organism.name": { "title" : "Organism" },
                        "experiments_in_set.biosample.biosource_summary": { "title" : "Biosource Summary" },
                        "experiments_in_set.experiment_categorizer.combined" : defaultColumnDefinitionMap["experiments_in_set.experiment_categorizer.combined"]
                    }}
                    {..._.pick(this.props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth')}
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

    innerTable(){
        return (
            <ExperimentSetTables {..._.pick(this.props, 'sortFxn', 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth', 'title', 'onLoad')} />
        );
    }

    render(){
        return (
            <ItemPageTableLoader itemsObject={this.props.experimentSetObject}
                isItemCompleteEnough={ExperimentSetTablesLoaded.isExperimentSetCompleteEnough} children={this.innerTable()} />
        );
    }
}


export class ExperimentSetTablesLoadedFromSearch extends ExperimentSetTablesLoaded {
    render(){
        return (
            <ItemPageTableSearchLoaderPageController {..._.pick(this.props, 'requestHref', 'windowWidth', 'title', 'onLoad')} children={this.innerTable()} />
        );
    }
}
