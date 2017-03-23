'use strict';

/** @ignore */
var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { console, object, expFxn } = require('./../../util');
var { unhighlightTerms } = require('./../../facetlist');
var aggregationFxn = require('./aggregation-functions');


var Aggregator = module.exports = React.createClass({

    getInitialState : function(){
        return {
            aggregatedData : null,
            aggregatedFilteredData : null
        };
    },

    shouldComponentUpdate : function(nextProps){
        if (
            nextProps.aggregateType !== this.props.aggregateType ||
            aggregationFxn.doFieldsDiffer(nextProps.fields, this.props.fields) ||
            !_.isEqual(nextProps.filteredExperiments, this.props.filteredExperiments) ||
            !_.isEqual(nextProps.experiments, this.props.experiments) ||
            nextProps.showType !== this.props.showType ||
            (nextProps.children && nextProps.children.props && 
            this.props.children && this.props.children.props && 
            this.props.children.props.height !== nextProps.children.props.height)

        ) {
            if (this.props.debug) console.log("Aggregator > WILL UPDATE");
            return true;
        }
        if (this.props.debug) console.log("Aggregator > WILL NOT UPDATE");
        return false;
    },
    
    /**
     * Here we re-aggregate terms to fields and save result in own state.
     * We decide whether to re-aggregate depending on changed props.
     * If fields, showType, filteredExperiments, or experiments change, we re-aggregate.
     * Otherwise we re-use.
     * 
     * @private
     * @instance
     * @param {Object} nextProps - The next props passed to this component.
     */
    componentWillReceiveProps : function(nextProps){

        var state = {};

        if (this.props.debug) console.log("Aggregator Next Props > ", nextProps);

        var doFieldsDiffer = aggregationFxn.doFieldsDiffer(nextProps.fields, this.props.fields);
        console.log('do fields differ', doFieldsDiffer);
        if (
            (nextProps.showType !== this.props.showType && nextProps.showType === 'all') ||
            (nextProps.filteredExperiments !== this.props.filteredExperiments && !nextProps.filteredExperiments)
        ){
            state.aggregatedFilteredData = null;
        } else if (
            (
                nextProps.filteredExperiments !== this.props.filteredExperiments ||
                !_.isEqual(nextProps.filteredExperiments, this.props.filteredExperiments) ||
                doFieldsDiffer ||
                (nextProps.showType !== this.props.showType && nextProps.showType !== 'all')
            ) && Array.isArray(nextProps.filteredExperiments)
        ){
            state.aggregatedFilteredData = aggregationFxn.genChartData(
                nextProps.filteredExperiments,
                nextProps.fields,
                nextProps.aggregateType,
                'experiments',
                nextProps.useOnlyPopulatedFields
            );
        }

        if (
            nextProps.experiments != this.props.experiments ||
            !_.isEqual(nextProps.experiments, this.props.experiments) ||
            doFieldsDiffer
        ){
            state.aggregatedData = aggregationFxn.genChartData(
                nextProps.experiments,
                nextProps.fields,
                nextProps.aggregateType,
                'experiments',
                nextProps.useOnlyPopulatedFields
            )
        }

        if (_.keys(state).length > 0){
            if (this.props.debug) console.log('Aggregator > WILL UPDATE STATE (new, old:)', state, this.state);
            this.setState(state);
        } else if (this.props.debug){
            console.log('Aggregator > WILL NOT UPDATE STATE');
        }

    },

    /**
     * Clones props.children -- which is expected to be a BarPlotChart -- and adds own state to its props.
     * 
     * @instance
     * @private
     * @returns {BarPlotChart} - A BarPlotChart with aggregated field/term data props.
     */
    render : function(){
        return (
            React.cloneElement(
                this.props.children,
                _.extend(
                    {},
                    _.omit(this.props, 'children', 'debug'),
                    {
                        "aggregatedData" : this.state.aggregatedData,
                        "aggregatedFilteredData" : this.state.aggregatedFilteredData
                    }
                )
            )
        );
    }

});