'use strict';

var React = require('react');
var globals = require('./globals');
var Panel = require('react-bootstrap').Panel;
var { ExperimentsTable } = require('./experiments-table');
var _ = require('underscore');
var { SubIPanel, DescriptorField, tipsFromSchema } = require('./item');
var FacetList = require('./facetlist');
var { ajaxLoad, DateUtility, console, getNestedProperty } = require('./objectutils');
var FormattedInfoBlock = require('./formatted-info-block');
var { FlexibleDescriptionBox } = require('./experiment-common');

/**
 * Entire ExperimentSet page view.
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
            this.tips = tipsFromSchema(this.props.schemas, this.props.context);
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
            var labDetails = this.getLinkedPropertyDetailsFromExperiments('lab', fallbackToAjax);
            if (labDetails !== null){
                newState.details_lab = labDetails;
            }
        }
        if (!this.state.details_award) {
            var awardDetails = this.getLinkedPropertyDetailsFromExperiments('award', fallbackToAjax);
            if (awardDetails !== null){
                newState.details_award = awardDetails;
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
    getLinkedPropertyDetailsFromExperiments : function(propertyName, allowAjaxFallback = false){

        if (!this.props.context[propertyName]) return null;

        // If we have property already embedded as object, lets use it.
        if (typeof this.props.context[propertyName] == 'object') return this.props.context[propertyName];


        // Else, grab from experiment(s) and make sure it is a match.
        var experiments = this.props.context.experiments_in_set,
            propertyID = null,
            propertyInfo = null;

        if (typeof this.props.context[propertyName] == 'string') { 
            propertyID = this.props.context[propertyName]; 
        }

        for (var i = 0; i < experiments.length; i++){

            // If we have property ID from ExperimentSet, just grab first property info with matching ID.
            if (propertyID && propertyID == experiments[i][propertyName]['@id']) {
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
                FormattedInfoBlock.ajaxPropertyDetails.call(this, propertyID, propertyName);
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

                <h1 className="page-title">Experiment Set <span className="subtitle prominent">{ title }</span></h1>

                <ExperimentSetHeader {...this.props} />

                <div className="row">
                
                    <div className="col-sm-5 col-md-4 col-lg-3">
                        <FacetList
                            urlPath={this.props.context['@id']}
                            experimentSetListJSON={this.props.context.experiments_in_set}
                            orientation="vertical"
                            expSetFilters={this.props.expSetFilters}
                            facets={ this.props.facets }
                            experimentsOrSets="experiments"
                            expIncompleteFacets={ this.props.expIncompleteFacets }
                            className="with-header-bg"
                        />
                    </div>

                    <div className="col-sm-7 col-md-8 col-lg-9">

                        <ExperimentSetInfoArea 
                            labInfo={ this.state.details_lab }
                            awardInfo={ this.state.details_award }
                            {...this.props} 
                        />

                        <div className="exp-table-section">
                            <h3>
                                <span>Experiments</span>
                                <span className="exp-number small right">
                                    <span className="hidden-xs">Showing </span>
                                    { this.state.passExperiments.length } of { this.props.context.experiments_in_set.length }
                                    <span className="hidden-xs"> Experiments</span>
                                </span>
                            </h3>
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

                    </div>

                </div>

                {/*
                <br/><br/><br /><br /><hr />
                <h6>Existing Print-out (temporary):</h6>
                
                <Panel className="data-display panel-body-with-header">
                    <dl className="key-value">
                        {Object.keys(this.props.context).sort().map((ikey, idx) =>
                            <div key={ikey} data-test="term-name">

                                <DescriptorField 
                                    field={ikey} 
                                    description={
                                        this.tips[ikey] && this.tips[ikey].description ? 
                                            this.tips[ikey].description : ''
                                    } 
                                />
                                
                                <dd>{ formValue(this.props.schemas, this.props.context[ikey], ikey, 0) }</dd>
                            </div>
                        )}
                    </dl>
                </Panel>
                */}

            </div>
        );
    }

});

globals.panel_views.register(ExperimentSetView, 'ExperimentSet');
globals.panel_views.register(ExperimentSetView, 'ExperimentSetReplicate');


var ExperimentSetHeader = React.createClass({

    parsedCreationDate(){
        if (!('date_created' in this.props.context)) return <span><i></i></span>;
        return (
            <span>
                <i className="icon sbt-calendar"></i>&nbsp; Added{' '}
                <DateUtility.LocalizedTime timestamp={this.props.context.date_created} formatType='date-time-md' dateTimeSeparator=" at " />
            </span>
        );
    },

    parsedStatus(){
        if (!('status' in this.props.context)) return <div></div>;
        /*  Removed icon in lieu of color indicator for status
        var iconClass = null;
        switch (this.props.context.status){

            case 'in review by lab':
            case 'in review by project':
                iconClass = 'icon ss-stopwatch';
                break;

        }
        */

        // Status colors are set via CSS (layout.scss) dependent on data-status attribute
        return (
            <div
                className="expset-indicator expset-status right"
                data-status={ this.props.context.status.toLowerCase() }
                title="Review Status"
            >
                { this.props.context.status }
            </div>
        );
    },

    parsedExperimentSetType(){
        if (!('experimentset_type' in this.props.context)) return <div></div>;
        return (
            <div
                className="expset-indicator expset-type right"
                data-set-type={ this.props.context.experimentset_type }
                title="Experiment Set Type"
            >
                { this.props.context.experimentset_type }
            </div>
        );
    },

    render: function() {
        console.log('render ExperimentSetHeader')
        return (
            <div className="exp-set-header-area">

                <div className="row clearfix top-row">
                    <h3 className="col-sm-6 item-label-title">
                        { /* PLACEHOLDER / TEMP-EMPTY */ }
                    </h3>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra text-capitalize indicators clearfix">
                        { this.parsedExperimentSetType() }
                        { this.parsedStatus() }
                    </h5>
                </div>

                <FlexibleDescriptionBox 
                    description={ this.props.context.description } 
                    className="item-page-heading experiment-heading"
                    textClassName="text-large"
                    fitTo="grid"
                    dimensions={{
                        paddingWidth : 32,
                        paddingHeight : 22,
                        buttonWidth : 30,
                        initialHeight : 45
                    }} 
                />

                <div className="row clearfix bottom-row">
                    <div className="col-sm-6 item-label-extra set-type-indicators">{ /* PLACEHOLDER / TEMP-EMPTY */ }</div>
                    <h5 className="col-sm-6 text-right text-left-xs item-label-extra" title="Date Added - UTC/GMT">{ this.parsedCreationDate() }</h5>
                </div>

            </div>
        );
    }
});


var ExperimentSetInfoArea = React.createClass({

    render : function(){
        return (
            <div className="row info-area">
                <div className="col-sm-12">
                    <div className="row">
                        
                        <div className="col-sm-6 col-sm-float-right">
                            { FormattedInfoBlock.Lab(this.props.labInfo) }
                        </div>
                        <div className="col-sm-6 col-sm-float-right">
                            { FormattedInfoBlock.Award(this.props.awardInfo) }
                        </div>

                    </div>

                </div>
            </div>
        );
    }

});


/**
 * Recursively render keys/values included in a provided item.
 * Wraps URLs/paths in link elements. Sub-panels for objects.
 * 
 * @param {Object} schemas - Object containing schemas for server's JSONized object output.
 * @param {*|*[]} item - Item(s) to render recursively.
 */

var formValue = function (schemas, item, keyPrefix = '', depth = 0) {
    var toReturn = [];
    if(Array.isArray(item)) {
        for (var i=0; i < item.length; i++){
            toReturn.push(formValue(schemas, item[i], keyPrefix, depth + 1));
        }
    }else if (typeof item === 'object') {
        toReturn.push(
            <SubIPanel
                schemas={schemas}
                content={item}
                key={item['@id'] || item.name || (keyPrefix.length > 0 ? keyPrefix + '-' : '') + depth + '-' + toReturn.length } 
            />
        );
    }else{
        if (typeof item === 'string' && item.charAt(0) === '/') {
            toReturn.push(<a key={item} href={item}>{item}</a>);
        }else{
            toReturn.push(item);
        }
    }
    return(
        <div>{toReturn}</div>
    );
};
