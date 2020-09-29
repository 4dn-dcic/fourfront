'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemPageTable, ItemPageTableIndividualUrlLoader, ViewMoreResultsBtn, EmbeddedItemSearchTable } from './ItemPageTable';
import { ExperimentSetDetailPane } from './../../../browse/components/ExperimentSetDetailPane';
import { columnExtensionMap as columnExtensionMap4DN } from './../../../browse/columnExtensionMap';



export class EmbeddedExperimentSetSearchTable extends React.PureComponent {

    static defaultProps = {
        ...EmbeddedItemSearchTable.defaultProps,
        columns: undefined, //get columns from columnExtensionMap that having values of columnExtensionMap4DN,
        maxHeight: 600
        // columns : {
        //     "display_title" : { "title" : "Title", "widthMap": { 'lg' : 180, 'md' : 160, 'sm' : 160 }, },
        //     "number_of_experiments" : { "title" : "Exps" },
        //     "experiments_in_set.experiment_type.display_title": { "title" : "Experiment Type" },
        //     "experiments_in_set.biosample.biosource.individual.organism.name": { "title" : "Organism" },
        //     "experiments_in_set.biosample.biosource_summary": { "title" : "Biosource Summary" },
        //     "experiments_in_set.experiment_categorizer.combined" : columnExtensionMap4DN["experiments_in_set.experiment_categorizer.combined"]
        // }
    }

    constructor(props){
        super(props);
        this.renderDetailPane = this.renderDetailPane.bind(this);
        this.updateDetailPaneFileSectionStateCache = this.updateDetailPaneFileSectionStateCache.bind(this);
        this.detailPaneFileSectionStateCache = {};
    }

    /** Copied from BrowseView */
    updateDetailPaneFileSectionStateCache(resultID, resultPaneState){
        // Purposely avoid changing reference to avoid re-renders/updates (except when new components initialize)
        if (resultPaneState === null){
            delete this.detailPaneFileSectionStateCache[resultID];
        } else {
            this.detailPaneFileSectionStateCache[resultID] = resultPaneState;
        }
    }

    renderDetailPane(result, rowNum, width){
        const { windowWidth, href } = this.props;
        return (
            <ExperimentSetDetailPane {...{ result, href, windowWidth }} containerWidth={width || null} paddingWidthMap={{
                'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47, 'xl' : 47
            }} updateFileSectionStateCache={this.updateDetailPaneFileSectionStateCache} />
        );
    }

    render(){
        return <EmbeddedItemSearchTable {...this.props} renderDetailPane={this.renderDetailPane} />;
    }
}

export function ExperimentSetsTableTabView(props){
    const {
        title,
        externalSearchLinkVisible,
        searchHref,
        session, schemas,
        facets, columns,
        defaultOpenIndices, maxHeight,
        filterFacetFxn, hideFacets,
        filterColumnFxn, hideColumns,
        children,
        // ...passProps
        // `passProps` would contain remaining props that might be passed down like 'context', 'href', etc. which
        // are irrelevant to EmbeddedExperimentSetSearchTable. Might be repurposed later if add more UI stuff
        // to `ExperimentSetsTableTabView`.
    } = props;
    const tableProps = {
        searchHref, facets, columns, defaultOpenIndices, schemas, session,
        maxHeight, filterFacetFxn, filterColumnFxn, hideFacets, hideColumns,
        title: typeof title === "undefined" ? <ExperimentSetsTableTabViewTitle {...{ externalSearchLinkVisible }} /> : title
    };
    return <EmbeddedExperimentSetSearchTable {...tableProps}>{ children }</EmbeddedExperimentSetSearchTable>;
}
ExperimentSetsTableTabView.getTabObject = function(props){
    return {
        'tab' : <span><i className="icon icon-file-alt far icon-fw"/> Experiment Sets</span>,
        'key' : 'expsets-table',
        //'disabled' : !Array.isArray(context.experiments),
        'content' : <ExperimentSetsTableTabView {...props} />
    };
};

/**
 * @todo Eventually maybe add UI controls for selecting columns and other things into here.
 */
export function ExperimentSetsTableTabViewTitle(props) {
    const {
        totalCount,
        href: currentSearchHref,
        externalSearchLinkVisible = true
    } = props;
    const linkText = currentSearchHref && typeof currentSearchHref === 'string' && currentSearchHref.indexOf('/browse/') > -1 ?
        'Open In Browse View' : 'Open In Search View';
    return (
        <h3 className="tab-section-title">
            <span>
                {typeof totalCount === "number" ? <span className="text-500">{totalCount + " "}</span> : null}
                {"Experiment Set" + (typeof totalCount === "number" && totalCount !== 1 ? "s" : "")}
            </span>
            { externalSearchLinkVisible && currentSearchHref ?
                <a href={currentSearchHref} className="btn btn-primary pull-right" style={{ marginTop: '-10px' }} data-tip="Run embedded search query in Browse/Search View">
                    <i className="icon icon-fw fas icon-external-link-alt mr-07 align-baseline"></i>
                    { linkText }
                </a>
                : null }
        </h3>
    );
}



/** @deprecated - Waiting until can use EmbeddedExperimentSetSearchTable everywhere */
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
        this.updateDetailPaneFileSectionStateCache = this.updateDetailPaneFileSectionStateCache.bind(this);
        this.renderDetailPane = this.renderDetailPane.bind(this);
        this.detailPaneFileSectionStateCache = {};
    }

    /** Copied from BrowseView */
    updateDetailPaneFileSectionStateCache(resultID, resultPaneState){
        // Purposely avoid changing reference to avoid re-renders/updates (except when new components initialize)
        if (resultPaneState === null){
            delete this.detailPaneFileSectionStateCache[resultID];
        } else {
            this.detailPaneFileSectionStateCache[resultID] = resultPaneState;
        }
    }

    renderDetailPane(es, rowNum, width){
        const { windowWidth, href } = this.props;
        return (
            <ExperimentSetDetailPane result={es} href={href} containerWidth={width || null} windowWidth={windowWidth} paddingWidthMap={{
                'xs' : 0, 'sm' : 10, 'md' : 47, 'lg' : 47, 'xl' : 47
            }} updateFileSectionStateCache={this.updateDetailPaneFileSectionStateCache} />
        );
    }

    render(){
        const { loading, title, experiment_sets, results } = this.props;
        const expSets = experiment_sets || results;

        if (loading || !Array.isArray(expSets)){
            return (
                <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    <i className="icon icon-fw fas icon-spin icon-circle-notch"/>
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
                { title && <h3 className="tab-section-title">{ title }</h3> }
                <ItemPageTable
                    results={expSets}
                    renderDetailPane={this.renderDetailPane}
                    columns={EmbeddedExperimentSetSearchTable.defaultProps.columns}
                    {..._.pick(this.props, 'width', 'defaultOpenIndices', 'defaultOpenIds', 'windowWidth')}
                />
                <ViewMoreResultsBtn {..._.pick(this.props, 'countTotalResults', 'hrefWithoutLimit')} results={expSets} itemTypeTitle="Experiment Set" />
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
