'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button } from 'react-bootstrap';
import { ItemPageTable, ItemPageTableLoader, ItemPageTableSearchLoaderPageController, } from './ItemPageTable';
import { ExperimentSetDetailPane, defaultColumnExtensionMap } from './../../../browse/components';
import { console } from './../../../util';


export class ExperimentSetTables extends React.PureComponent {

    static propTypes = {
        'loading' : PropTypes.bool,
        'windowWidth' : PropTypes.number.isRequired,
        'title' : PropTypes.string
    };

    static defaultProps = {
        'title' : <span>In Experiment Sets</span>
    };

    render(){
        var { loading, title, windowWidth } = this.props,
            expSets = this.props.experiment_sets || this.props.results;

        if (loading || !Array.isArray(expSets)){
            return (
                <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    <i className="icon icon-fw icon-spin icon-circle-o-notch"/>
                </div>
            );
        } else if (expSets.length === 0){
            return (
                <div className="text-center text-300 mt-1" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    Not used in any Experiment Sets
                </div>
            );
        }

        return (
            <div className="file-part-of-experiment-sets-container">
                <h3 className="tab-section-title">{ title }</h3>
                <ItemPageTable
                    results={expSets}
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
        var { experimentSetUrls, id } = this.props;
        return (
            <ItemPageTableLoader itemUrls={experimentSetUrls} key={id}>
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


export class ExperimentSetTableTabView extends React.PureComponent {

    /**
     * Get overview tab object for tabpane.
     *
     * @param {Object} props - Parent Component props, as passed down from app.js
     * @param {number} width - Width of tab container.
     */
    static getTabObject(props, width){
        return {
            'tab' : <span><i className="icon icon-file-text icon-fw"/> Experiment Sets</span>,
            'key' : 'expsets-table',
            //'disabled' : !Array.isArray(context.experiments),
            'content' : (
                <div className="overflow-hidden">
                    <ExperimentSetTableTabView {...props} width={width} />
                </div>
            )
        };
    }

    static defaultProps = {
        'requestHref' : function(props, state){
            return "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&sort=experiments_in_set.experiment_type&publications_of_set.uuid=" + props.context.uuid;
        },
        'title' : function(props, state){
            var title = 'Experiment Sets Published';
            if (state.totalCount){
                title = state.totalCount + ' Experiment Sets Published';
            }
            return title;
        }
    };

    constructor(props){
        super(props);
        this.getCountCallback = this.getCountCallback.bind(this);
        this.state = {
            'totalCount' : null
        };
    }

    getCountCallback(resp){
        if (resp && typeof resp.total === 'number'){
            this.setState({ 'totalCount' : resp.total });
        }
    }

    render(){
        var { windowWidth, requestHref, title } = this.props;
        var totalCount = this.state.totalCount;

        if (typeof requestHref === 'function')  requestHref = requestHref(this.props, this.state);
        if (typeof title === 'function')        title = title(this.props, this.state);

        return (
            <div>
                <ExperimentSetTablesLoadedFromSearch requestHref={requestHref} windowWidth={windowWidth} onLoad={this.getCountCallback} title={title} />
                { totalCount && totalCount > 25 ?
                    <Button className="mt-2" href={requestHref} bsStyle="primary" bsSize="lg">
                        View all Experiment Sets ({ totalCount - 25 + ' more' })
                    </Button>
                : null }
            </div>
        );
    }

}


