'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import url from 'url';
import queryString from 'query-string';
import { Button } from 'react-bootstrap';
import { ItemPageTable, ItemPageTableLoader, ItemPageTableSearchLoader, } from './ItemPageTable';
import { ExperimentSetDetailPane, defaultColumnExtensionMap } from './../../../browse/components';
import { console } from './../../../util';


export class ExperimentSetTables extends React.PureComponent {

    static propTypes = {
        'loading' : PropTypes.bool,
        'windowWidth' : PropTypes.number.isRequired,
        'title' : PropTypes.string,
        'href' : PropTypes.string,
        'results' : PropTypes.arrayOf(PropTypes.object),
        'experiment_sets' : PropTypes.arrayOf(PropTypes.object)
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
        const { loading, title, experiment_sets, results } = this.props;
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

        return (
            <div className="file-part-of-experiment-sets-container">
                <h3 className="tab-section-title">{ title }</h3>
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
            </div>
        );
    }
}


export const ExperimentSetTablesLoaded = React.memo(function ExperimentSetTablesLoaded({ experimentSetUrls, id, ...props }){
    return (
        <ItemPageTableLoader itemUrls={experimentSetUrls} key={id}>
            <ExperimentSetTables {..._.pick(props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth', 'title', 'onLoad', 'href')} />
        </ItemPageTableLoader>
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

    /** We set the default number of results to get here to be 7, unless is overriden in href */
    static getLimit = memoize(function(href){
        // Fun with destructuring - https://medium.com/@MentallyFriendly/es6-constructive-destructuring-793ac098d138
        const { query : { limit = 0 } = { limit : 0 } } = url.parse(href, true);
        return (limit && parseInt(limit)) || 7;
    });

    static hrefWithoutLimit = memoize(function(href){
        // Fun with destructuring - https://medium.com/@MentallyFriendly/es6-constructive-destructuring-793ac098d138
        const hrefParts = url.parse(href, true);
        const { query = {} } = hrefParts;
        delete query.limit;
        hrefParts.search = '?' + queryString.stringify(query);
        return url.format(hrefParts);
    });

    static hrefWithLimit = memoize(function(href, limit=null){
        // TODO: get rid of ItemPageTableSearchLoaderPageController since we no longer plan to paginate results at all ever in future
        // instead direvtly use ItemPageTableSearchLoader
        // ALSO: Refactor ItemPageTableSearchLoader to latest standards & for performance (React.PureComponent instd of React.COmponent)
        // ALSO: maybe migrate logic for "View More results" to it from here or into re-usable-for-any-type-of-item component ... lower priority
        // more relevant for CGAP but will have infinite-scroll-within-pane table to replace view more button at some point in future anyway so moot.

        const hrefParts = url.parse(href, true);
        const { query = {} } = hrefParts;
        query.limit = query.limit || limit || ExperimentSetTableTabView.getLimit(href);
        hrefParts.search = '?' + queryString.stringify(query);
        return url.format(hrefParts);
    });

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

    constructor(props){
        super(props);
        this.getCountCallback = this.getCountCallback.bind(this);
        this.state = { 'totalCount' : null };
    }

    getCountCallback(resp){
        if (resp && typeof resp.total === 'number'){
            this.setState({ 'totalCount' : resp.total });
        }
    }

    render(){
        var { windowWidth, href : currentPageHref } = this.props;
        let { requestHref, title } = this.props;
        const { totalCount } = this.state;

        if (typeof requestHref === 'function')  requestHref = requestHref(this.props, this.state);
        if (typeof title === 'function')        title = title(this.props, this.state);

        const limit = ExperimentSetTableTabView.getLimit(requestHref);
        const hrefWithLimit = ExperimentSetTableTabView.hrefWithLimit(requestHref, limit);
        const hrefWithoutLimit = ExperimentSetTableTabView.hrefWithoutLimit(requestHref, limit);

        return (
            <div>
                <ExperimentSetTablesLoadedFromSearch {...{ 'requestHref' : hrefWithLimit, windowWidth, title, 'href' : currentPageHref }} onLoad={this.getCountCallback} />
                { totalCount && totalCount > limit ?
                    <Button className="mt-2" href={hrefWithoutLimit} bsStyle="primary" bsSize="lg">
                        View all Experiment Sets ({ totalCount - limit + ' more' })
                    </Button>
                    : null }
            </div>
        );
    }

}


