'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ExperimentSetDetailPane, ItemPageTable, ItemPageTableLoader, ItemPageTableSearchLoaderPageController, defaultColumnExtensionMap } from './../../browse/components';
import { ajax, console, layout, expFxn } from './../../util';


export class ExperimentSetTables extends React.Component {

    static propTypes = {
        'loading' : PropTypes.bool,
        'windowWidth' : PropTypes.number.isRequired
    }
    
    static defaultProps = {
        'title' : <span>In Experiment Sets</span>
    }

    render(){
        var { loading, title, windowWidth } = this.props,
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
                        "experiments_in_set.experiment_categorizer.combined" : defaultColumnExtensionMap["experiments_in_set.experiment_categorizer.combined"]
                    }}
                    {..._.pick(this.props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth')}
                />
            </div>
        );
    }
}

export class ExperimentSetTablesLoaded extends React.PureComponent {

    static propTypes = {
        'experimentSetUrls' : PropTypes.arrayOf(PropTypes.string).isRequired
    };

    render(){
        return (
            <ItemPageTableLoader itemUrls={this.props.experimentSetUrls}>
                <ExperimentSetTables {..._.pick(this.props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth', 'title', 'onLoad')} />
            </ItemPageTableLoader>
        );
    }
}


export class ExperimentSetTablesLoadedFromSearch extends React.PureComponent {
    render(){
        return (
            <ItemPageTableSearchLoaderPageController {..._.pick(this.props, 'requestHref', 'windowWidth', 'title', 'onLoad')}>
                <ExperimentSetTables {..._.pick(this.props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth', 'title', 'onLoad')} />
            </ItemPageTableSearchLoaderPageController>
        );
    }
}
