'use strict';

var React = require('react');
var globals = require('./../globals');
var Panel = require('react-bootstrap').Panel;
var { ExperimentsTable } = require('./../experiments-table');
var _ = require('underscore');
var { DescriptorField, Detail } = require('./item-view');
var { ItemPageTitle, ItemHeader, FormattedInfoBlock, ItemFooterRow, PublicationsBlock } = require('./components');
var FacetList = require('./../facetlist');
var { ajax, console, DateUtility, object } = require('./../util');

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
var ExperimentSetView = module.exports.ExperimentSetView = React.createClass({

    propTypes : {
        schemas : React.PropTypes.object,
        context : React.PropTypes.object,
        expSetFilters : React.PropTypes.object,     // Set via app.js <ContentView...>
        expIncompleteFacets : React.PropTypes.array,
        facets : React.PropTypes.array
    },

    contextTypes: {
        location_href: React.PropTypes.string
    },

    getDefaultProps : function(){
        return {
            facets : null
        };
    },

    getInitialState : function(){
        return {
            'selectedFiles': new Set(),
            'checked' : true,
            'details_award' : null,
            'details_lab' : null,
            'passExperiments' : ExperimentsTable.getPassedExperiments(this.props.context.experiments_in_set, this.props.expSetFilters, 'single-term')
        };
    },

    tips : null, // Value assumed immutable so not in state.

    componentWillMount : function(){
        if (!this.tips) {
            this.tips = object.tipsFromSchema(this.props.schemas, this.props.context);
        }

        this.setLinkedDetails(false);
    },

    componentDidMount : function(){
        this.setLinkedDetails(true);
    },

    componentWillReceiveProps: function(nextProps) {

        // Make sure state is updated upon filtering
        if(this.props.expSetFilters !== nextProps.expSetFilters || this.props.context.experiments_in_set !== nextProps.context.experiments_in_set){
            this.setState({
                selectedFiles: new Set(),
                passExperiments : ExperimentsTable.getPassedExperiments(nextProps.context.experiments_in_set, nextProps.expSetFilters, 'single-term')
            });
        }
    },

    /**
     * Get data for nested properties - Award and Lab. Save to state or use state object in callback.
     *
     * @param {boolean} [fallbackToAjax] - Whether to revert to AJAX to fetch info if not in provided ExpSet object.
     * @param {function} [callback] - A function ran after execution, before any AJAX fetching, which takes ones parameter - an object representing resulting state change. Used in place of setState if have more state to apply.
     * @param {Object} [newState] - State object to use. Defaults to empty object.
     */
    setLinkedDetails : function(fallbackToAjax = false, callback = null, newState = {}){
        if (!this.state.details_lab) {
            if (
                this.props.context.lab && typeof this.props.context.lab === 'object' &&
                this.props.context.lab.address1 && this.props.context.lab.title
            ){
                newState.details_lab = this.props.context.lab;
            } else {
                var labDetails = this.getEmbeddedPropertyDetailsFromExperiments('lab', fallbackToAjax);
                if (labDetails !== null){
                    newState.details_lab = labDetails;
                }
            }
        }
        if (!this.state.details_award) {
            if (
                this.props.context.award && typeof this.props.context.award === 'object' &&
                this.props.context.award.project && this.props.context.award.title
            ){
                newState.details_award = this.props.context.award;
            } else {
                var awardDetails = this.getEmbeddedPropertyDetailsFromExperiments('award', fallbackToAjax);
                if (awardDetails !== null){
                    newState.details_award = awardDetails;
                }
            }
        }
        if (typeof callback == 'function') {
            callback(newState);
        } else if (Object.keys(newState).length > 0) {
            this.setState(newState);
        }
    },

    /**
     * Using similar approach(es) as browse.js to grab property details from experiments_in_set.
     * Grabs property detail object from sub-experiment(s) rather than embedding in own JSON output
     * to keep size of ExperimentSets down as can't remove (for example) experiments_in_set.lab
     * from encoded/types/experiment.py > ExperimentSet as it'd affect Browse page
     * experiment filtering & view.
     *
     * @param {string} propertyName - Name of property/key in schema for which to get details.
     * @param {boolean} allowAjaxFallback - Whether to start an AJAX request to fetch details if they are not in experiment(s).
     * @return {Object} Details for the property/key supplied, or null if not available or not matched.
     */
    getEmbeddedPropertyDetailsFromExperiments : function(propertyName, allowAjaxFallback = false){
        if (!this.props.context[propertyName]) return null;

        // If we have property already embedded as object, lets use it.

        if (typeof this.props.context[propertyName] == 'object') return this.props.context[propertyName];


        // Else, grab from experiment(s) and make sure it is a match.
        var experiments = this.props.context.experiments_in_set,
            propertyID = null,
            propertyInfo = null;

        if (typeof this.props.context[propertyName] == 'string') {
            propertyID = this.props.context[propertyName];
        } else if (this.props.context[propertyName] && this.props.context[propertyName].link_id){
            propertyID = this.props.context[propertyName].link_id.replace(/~/g, "/");
        }

        for (var i = 0; i < experiments.length; i++){

            // If we have property ID from ExperimentSet, just grab first property info with matching ID.
            if (
                propertyID && experiments[i][propertyName] &&
                propertyID == (experiments[i][propertyName]['@id'])
            ) {
                propertyInfo = experiments[i][propertyName];
                break;
            } else if (!propertyID){
                // Fallback : set property from first experiment if no ID in expset.
                // Then confirm all other experiments match first experiment's ID.
                if (i == 0) {
                    propertyInfo = experiments[i][propertyName];
                    continue;
                } else if (experiments[i][propertyName]['@id'] == propertyInfo['@id']) {
                    continue; // Good.
                } else {
                    //throw new Error(propertyName + " IDs in experiments of ExperimentSet " + this.props.context.accession + " do not all match.");
                    return null;
                }
            }

        }

        // Uh-oh! ExperimentSet award exists but doesn't match that of any experiments'.
        // Perhaps fallback to using AJAX.
        if (!propertyInfo && propertyID){
            console.warn("ExperimentSetView > details_" + propertyName + " could not be gotten from available data.");
            if (typeof window != 'undefined' && allowAjaxFallback) {
                console.warn("ExperimentSetView > Reverting to AJAX.");
                FormattedInfoBlock.onMountMaybeFetch.call(this, propertyName, this.props.context[propertyName])
                //FormattedInfoBlock.ajaxPropertyDetails.call(this, propertyID, propertyName);
            }
        }

        return propertyInfo;
    },

    render: function() {

        var title = globals.listing_titles.lookup(this.props.context)({context: this.props.context});
        var itemClass = globals.itemClass(this.props.context, 'view-detail item-page-container experiment-set-page');

        console.log('render ExperimentSet view');

        /* In addition to built-in headers for experimentSetType defined by ExperimentsTable */
        var expTableColumnHeaders = [
            { className: 'file-detail', title : 'File Info'}
        ];

        if (this.props.context.experimentset_type === 'replicate') {
            expTableColumnHeaders.unshift({ className: 'file-detail', title : 'File Type'});
        }

        return (
            <div className={itemClass}>

                <ItemPageTitle context={this.props.context} />
                <ExperimentSetHeader {...this.props} />

                <div className="row">

                    <div className="col-sm-5 col-md-4 col-lg-3">
                        { this.props.context.experiments_in_set && this.props.context.experiments_in_set.length ?
                        <FacetList
                            urlPath={this.props.context['@id']}
                            experimentSetListJSON={this.props.context.experiments_in_set}
                            orientation="vertical"
                            expSetFilters={this.props.expSetFilters}
                            itemTypes={this.props.context['@type'] || ['ExperimentSetReplicate']}
                            facets={null}
                            experimentsOrSets="experiments"
                            expIncompleteFacets={ this.props.expIncompleteFacets }
                            className="with-header-bg"
                            useAjax={false}
                            schemas={this.props.schemas}
                        />
                        : <div>&nbsp;</div> }
                    </div>

                    <div className="col-sm-7 col-md-8 col-lg-9">

                        <PublicationsBlock publications={this.props.context.publications_of_set} />

                        <div className="exp-table-section">
                            { this.props.context.experiments_in_set && this.props.context.experiments_in_set.length ? 
                            <h3>
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
                                    parentController={this}
                                    experimentSetType={this.props.context.experimentset_type}
                                    expSetFilters={this.props.expSetFilters}
                                    facets={ this.props.facets }
                                    experimentArray={this.props.context.experiments_in_set}
                                    replicateExpsArray={this.props.context.replicate_exps}
                                    keepCounts={false}
                                    columnHeaders={expTableColumnHeaders}
                                />
                            </div>
                        </div>

                        <ExperimentSetLabAwardInfo
                            labInfo={ this.state.details_lab }
                            awardInfo={ this.state.details_award }
                            {...this.props}
                        />

                    </div>

                </div>

                <ItemFooterRow context={this.props.context} schemas={this.props.schemas} />

            </div>
        );
    }

});

globals.panel_views.register(ExperimentSetView, 'ExperimentSet');
globals.panel_views.register(ExperimentSetView, 'ExperimentSetReplicate');


/**
 * Renders ItemHeader parts wrapped in ItemHeader.Wrapper, with appropriate values.
 * 
 * @memberof module:item-pages/experiment-set-view
 * @private
 * @prop {Object} context - Same context prop as available on parent component.
 * @prop {string} href - Current page href, passed down from app or Redux store.
 */
var ExperimentSetHeader = React.createClass({

    render: function() {
        console.log('render ExperimentSetHeader');
        return (
            <ItemHeader.Wrapper className="exp-set-header-area" context={this.props.context} href={this.props.href}>
                <ItemHeader.TopRow>
                    <span data-tip="Experiment Type" className="inline-block">
                        { this.props.context.experimentset_type }
                    </span>
                </ItemHeader.TopRow>
                <ItemHeader.MiddleRow />
                <ItemHeader.BottomRow />
            </ItemHeader.Wrapper>
        );
    }
});


var ExperimentSetLabAwardInfo = React.createClass({

    render : function(){
        return (
            <div className="row info-area">
                <div className="col-sm-12">
                    <div className="row">

                        <div className="col-sm-12 col-md-6 col-sm-float-right">
                            { FormattedInfoBlock.Lab(this.props.labInfo) }
                        </div>
                        <div className="col-sm-12 col-md-6 col-sm-float-right">
                            { FormattedInfoBlock.Award(this.props.awardInfo) }
                        </div>

                    </div>

                </div>
            </div>
        );
    }

});

