'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { ItemPageTable, ItemPageTableIndividualUrlLoader, ItemPageTableSearchLoader, } from './ItemPageTable';
import { defaultColumnExtensionMap } from './../../../browse/components/table-commons';
import { ExperimentSetDetailPane } from './../../../browse/components/ExperimentSetDetailPane';
import { console } from './../../../util';


export class ExperimentSetTables extends React.PureComponent {

    static propTypes = {
        'loading' : PropTypes.bool,
        'windowWidth' : PropTypes.number.isRequired,
        'title' : PropTypes.string,
        'href' : PropTypes.string,
        'results' : PropTypes.arrayOf(PropTypes.object),
        'experiment_sets' : PropTypes.arrayOf(PropTypes.object),
        'countTotalResults' : PropTypes.number,
        'hrefWithoutLimit' : PropTypes.string
    };

    static defaultProps = {
        'title' : <span>In Experiment Sets</span>
    };

    constructor(props){
        super(props);
        this.renderDetailPane = this.renderDetailPane.bind(this);
    }

    renderDetailPane(es, rowNum, width){
        const { windowWidth, href } = this.props;
        return (
            <ExperimentSetDetailPane result={es} href={href} containerWidth={width || null} windowWidth={windowWidth} paddingWidthMap={{
                'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47
            }} />
        );
    }

    render(){
        const { loading, title, experiment_sets, results, countTotalResults, hrefWithoutLimit } = this.props;
        const expSets = experiment_sets || results;

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

        let viewMoreAppend;
        if (typeof countTotalResults === 'number'){
            const visibleResultCount = expSets.length;
            if (countTotalResults > visibleResultCount){
                if (hrefWithoutLimit){
                    viewMoreAppend = (
                        <a type="button" className="mt-2 btn btn-lg btn-primary" href={hrefWithoutLimit}>
                            View all Experiment Sets ({ countTotalResults - visibleResultCount + ' more' })
                        </a>
                    );
                } else {
                    viewMoreAppend = (countTotalResults - visibleResultCount) + ' more Experiment Sets';
                }
            }
        }

        return (
            <div className="file-part-of-experiment-sets-container">
                { title && <h3 className="tab-section-title">{ title }</h3> }
                <ItemPageTable
                    results={expSets}
                    renderDetailPane={this.renderDetailPane}
                    columns={{
                        "display_title" : { "title" : "Title" },
                        "number_of_experiments" : { "title" : "Exps" },
                        "experiments_in_set.experiment_type.display_title": { "title" : "Experiment Type" },
                        "experiments_in_set.biosample.biosource.individual.organism.name": { "title" : "Organism" },
                        "experiments_in_set.biosample.biosource_summary": { "title" : "Biosource Summary" },
                        "experiments_in_set.experiment_categorizer.combined" : defaultColumnExtensionMap["experiments_in_set.experiment_categorizer.combined"]
                    }}
                    {..._.pick(this.props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth')}
                />
                { viewMoreAppend }
            </div>
        );
    }
}


export const ExperimentSetTablesLoaded = React.memo(function ExperimentSetTablesLoaded({ experimentSetUrls, id, ...props }){
    return (
        <ItemPageTableIndividualUrlLoader itemUrls={experimentSetUrls} key={id}>
            <ExperimentSetTables {..._.pick(props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth', 'title', 'onLoad', 'href')} />
        </ItemPageTableIndividualUrlLoader>
    );
});
ExperimentSetTablesLoaded.propTypes = {
    'experimentSetUrls' : PropTypes.arrayOf(PropTypes.string).isRequired,
    'id' : PropTypes.string
};

export const ExperimentSetTablesLoadedFromSearch = React.memo(function ExperimentSetTablesLoadedFromSearch(props){
    return (
        <ItemPageTableSearchLoader {..._.pick(props, 'requestHref', 'windowWidth', 'title', 'onLoad')}>
            <ExperimentSetTables {..._.pick(props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth', 'title', 'onLoad', 'href')} />
        </ItemPageTableSearchLoader>
    );
});

/** @todo Make into functional component */
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
            return "/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&sort=experiments_in_set.experiment_type.display_title&publications_of_set.display_title=" + props.context.display_title;
        },
        'title' : function(props, state){
            var title = 'Experiment Sets Published';
            if (state.totalCount){
                title = state.totalCount + ' Experiment Sets Published';
            }
            return title;
        }
    };

    render(){
        const { windowWidth, href : currentPageHref } = this.props;
        let { requestHref, title } = this.props;

        if (typeof requestHref === 'function')  requestHref = requestHref(this.props, this.state);
        if (typeof title === 'function')        title = title(this.props, this.state);

        return (
            <div>
                <ExperimentSetTablesLoadedFromSearch {...{ requestHref, windowWidth, title, 'href' : currentPageHref }} />
            </div>
        );
    }

}


