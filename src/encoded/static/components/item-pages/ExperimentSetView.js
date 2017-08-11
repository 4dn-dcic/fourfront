'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Panel } from 'react-bootstrap';
import { ajax, console, DateUtility, object, isServerSide, Filters } from './../util';
import * as globals from './../globals';
import ExperimentsTable from './../experiments-table';
import { ItemPageTitle, ItemHeader, FormattedInfoBlock, ItemDetailList, ItemFooterRow, Publications, TabbedView, AuditTabView, AttributionTabView } from './components';
import { FacetList, ReduxExpSetFiltersInterface } from './../browse/components';

/**
 * Contains the ExperimentSetView component, which renders out the ExperimentSet view/page.
 *
 * @module item-pages/experiment-set-view
 */


/**
 * ExperimentSet Item view/page.
 * 
 * @memberof module:item-pages/experiment-set-view
 * @namespace
 * @type {Component}
 * @prop {Object} schemas - state.schemas passed down from app Component.
 * @prop {Object} context - JSON representation of current ExperimentSet item.
 * @prop {Object} expSetFilters - Currently-set expSetFilters from Redux store. Used for FacetList.
 * @prop {Object[]} expIncompleteFacets - Facets to aggregate counts for and display in the form of objects containing at least a title and field property.
 */
export default class ExperimentSetView extends React.Component {

    static propTypes = {
        schemas : PropTypes.object,
        context : PropTypes.object,
        expSetFilters : PropTypes.object.isRequired,     // Set via app.js <ContentView...>
        expIncompleteFacets : PropTypes.array,
        facets : PropTypes.array
    }

    static contextTypes = {
        location_href: PropTypes.string
    }

    static defaultProps = {
        facets : null
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.getTabViewContents = this.getTabViewContents.bind(this);
        this.state = {
            'selectedFiles': new Set(),
            'checked' : true,
            'passExperiments' : ExperimentsTable.getPassedExperiments(this.props.context.experiments_in_set, this.props.expSetFilters, 'single-term'),
            'mounted' : false
        };
    }

    componentWillReceiveProps(nextProps) {

        // Make sure state is updated upon filtering
        if(this.props.expSetFilters !== nextProps.expSetFilters || this.props.context.experiments_in_set !== nextProps.context.experiments_in_set){
            this.setState({
                selectedFiles: new Set(),
                passExperiments : ExperimentsTable.getPassedExperiments(nextProps.context.experiments_in_set, nextProps.expSetFilters, 'single-term')
            });
        }
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    getTabViewContents(){
        /* In addition to built-in headers for experimentSetType defined by ExperimentsTable */
        var expTableColumnHeaders = [
            { columnClass: 'file-detail', title : 'File Info'}
        ];

        if (this.props.context.experimentset_type === 'replicate') {
            expTableColumnHeaders.unshift({ columnClass: 'file-detail', title : 'File Type'});
        }

        return [
            {
                tab : <span><i className="icon icon-th icon-fw"/> Experiments</span>,
                key : 'experiments',
                content : (
                    <div className="exp-table-section">
                        { this.props.context.experiments_in_set && this.props.context.experiments_in_set.length ? 
                        <h3 className="tab-section-title">
                            <span>Experiments</span>
                            { Array.isArray(this.state.passExperiments) ? 
                            <span className="exp-number small right">
                                <span className="hidden-xs">Showing </span>
                                { this.state.passExperiments.length } of { this.props.context.experiments_in_set.length }
                                <span className="hidden-xs"> Experiments</span>
                            </span>
                            : null }
                        </h3>
                        : null }
                        <div className="exp-table-container">
                            <ExperimentsTable
                                ref="experimentsTable"
                                experimentSetType={this.props.context.experimentset_type}
                                expSetFilters={this.props.expSetFilters}
                                facets={ this.props.facets }
                                experimentSetAccession={this.props.context.accession || null}
                                experimentArray={this.props.context.experiments_in_set}
                                replicateExpsArray={this.props.context.replicate_exps}
                                keepCounts={false}
                                columnHeaders={expTableColumnHeaders}
                            />
                        </div>
                    </div>
                )
            },
            AttributionTabView.getTabObject(this.props.context),
            ItemDetailList.getTabObject(this.props.context, this.props.schemas),
            AuditTabView.getTabObject(this.props.context)
        ].map((tabObj)=>{ // Common properties
            return _.extend(tabObj, {
                'style' : { minHeight : Math.max(this.state.mounted && !isServerSide() && (window.innerHeight - 180), 100) || 650 }
            });
        });
    }

    render() {

        var title = globals.listing_titles.lookup(this.props.context)({context: this.props.context});
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container experiment-set-page');

        if (this.props.debug) console.log('render ExperimentSet view');

        return (
            <div className={itemClass}>

                <ExperimentSetHeader {...this.props} />

                <Publications.ProducedInPublicationBelowHeaderRow produced_in_pub={this.props.context.produced_in_pub} />

                <div className="row">

                    <div className="col-sm-5 col-md-4 col-lg-3">
                        { this.props.context.experiments_in_set && this.props.context.experiments_in_set.length ?
                        <ReduxExpSetFiltersInterface
                            experimentSets={this.props.context.experiments_in_set}
                            expSetFilters={this.props.expSetFilters}
                            experimentsOrSets="experiments"
                            filterOnClientSide
                            facets={null}
                            href={this.props.href}
                            schemas={this.props.schemas}
                            session={this.props.session}
                        >
                            <FacetList
                                orientation="vertical"
                                itemTypes={this.props.context['@type'] || ['ExperimentSetReplicate']}
                                className="with-header-bg"
                                filterFacetsFxn={FacetList.filterFacetsForExpSetView}
                                isTermSelected={(term, field, expsOrSets)=>
                                    Filters.isTermSelectedAccordingToExpSetFilters(term, field, this.props.expSetFilters)
                                }
                            />
                        </ReduxExpSetFiltersInterface>
                        : <div>&nbsp;</div> }
                    </div>

                    <div className="col-sm-7 col-md-8 col-lg-9">
                        <TabbedView contents={this.getTabViewContents()} />
                    </div>

                </div>

                <ItemFooterRow context={this.props.context} schemas={this.props.schemas} />

            </div>
        );
    }

}


/**
 * Renders ItemHeader parts wrapped in ItemHeader.Wrapper, with appropriate values.
 * 
 * @memberof module:item-pages/experiment-set-view
 * @private
 * @prop {Object} context - Same context prop as available on parent component.
 * @prop {string} href - Current page href, passed down from app or Redux store.
 */
class ExperimentSetHeader extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        if (this.props.debug) console.log('render ExperimentSetHeader');
        return (
            <ItemHeader.Wrapper className="exp-set-header-area" context={this.props.context} href={this.props.href} schemas={this.props.schemas}>
                <ItemHeader.TopRow />
                <ItemHeader.MiddleRow />
                <ItemHeader.BottomRow />
            </ItemHeader.Wrapper>
        );
    }
}


// Register ExperimentSetView to be the view for these @types.
globals.panel_views.register(ExperimentSetView, 'ExperimentSet');
globals.panel_views.register(ExperimentSetView, 'ExperimentSetReplicate');

