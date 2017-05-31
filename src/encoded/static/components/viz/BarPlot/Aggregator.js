'use strict';

import React from 'react';
import _ from 'underscore';
import * as vizUtil from './../utilities';
import { console, object, expFxn } from './../../util';
import * as aggregationFxn from './aggregation-functions';

/**
 * This is an optional component which may be placed between BarPlot.Chart and UIControlsWrapper.
 * It will store the result of aggregation into state and then pass it as a prop down to BarPlot.Chart.
 * Primarily this is to redrawing performance. Utilizes shouldComponentUpdate and componentWillReceiveProps.
 * 
 * Accepts the same props as BarPlot.Chart, save for own 'aggregatedData' and 'aggregatedFilteredData'.
 * 
 * @class
 * @type {Component}
 * @prop {Object[]} experiments - "All" experiments, passed from ChartDataController[.Provider].
 * @prop {Object[]} filteredExperiments - "Selected" experiments, if expSetFilters are set in Redux store. Passed from ChartDataController[.Provider].
 * @prop {Object[]} fields - Passed from UIControlsWrapper.
 * @prop {string} aggregateType - Passed from UIControlsWrapper.
 * @prop {string} showType - Passed from UIControlsWrapper.
 * @prop {BarPlot.Chart} children - Must contain a BarPlotChart as the single child element.
 */
export class Aggregator extends React.Component {
    
    static defaultProps = {
        'debug' : false
    }

    static updatedStateFromProps(nextProps, pastProps){
        var state = {};

        if (nextProps.debug) console.log("Aggregator Next Props > ", nextProps);

        var doFieldsDiffer = aggregationFxn.doFieldsDiffer(nextProps.fields, pastProps.fields);
        if (nextProps.debug) console.log('Aggregator Do Next Props fields differ', doFieldsDiffer);
        if (
            (nextProps.showType !== pastProps.showType && nextProps.showType === 'all') ||
            (nextProps.filteredExperiments !== pastProps.filteredExperiments && !nextProps.filteredExperiments)
        ){
            state.aggregatedFilteredData = null;
        } else if (
            (
                nextProps.filteredExperiments !== pastProps.filteredExperiments ||
                !_.isEqual(nextProps.filteredExperiments, pastProps.filteredExperiments) ||
                doFieldsDiffer ||
                (nextProps.showType !== pastProps.showType && nextProps.showType !== 'all')
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
            nextProps.experiments !== pastProps.experiments ||
            !_.isEqual(nextProps.experiments, pastProps.experiments) ||
            doFieldsDiffer
        ){
            state.aggregatedData = aggregationFxn.genChartData(
                nextProps.experiments,
                nextProps.fields,
                nextProps.aggregateType,
                'experiments',
                nextProps.useOnlyPopulatedFields
            );
        }

        return state;
    }

    constructor(props){
        super(props);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.render = this.render.bind(this);

        this.state = Aggregator.updatedStateFromProps(props, {});
        
        if (this.state.aggregatedData && this.state.aggregatedData[1]){
            // Pre-cache colors.
            this.preCacheColors(this.state.aggregatedData[1]);
        }

    }

    shouldComponentUpdate(nextProps){
        if (
            nextProps.aggregateType !== this.props.aggregateType ||
            aggregationFxn.doFieldsDiffer(nextProps.fields, this.props.fields) ||
            !_.isEqual(nextProps.filteredExperiments, this.props.filteredExperiments) ||
            !_.isEqual(nextProps.experiments, this.props.experiments) ||
            nextProps.showType !== this.props.showType ||
            (nextProps.children && nextProps.children.props && 
            this.props.children && this.props.children.props &&
            (
                this.props.children.props.height !== nextProps.children.props.height ||
                this.props.children.props.width !== nextProps.children.props.width
            ))

        ) {
            if (this.props.debug) console.log("Aggregator > WILL UPDATE");
            return true;
        }
        if (this.props.debug) console.log("Aggregator > WILL NOT UPDATE");
        return false;
    }

    /**
     * Here we re-aggregate terms to fields and save result in own state.
     * We decide whether to re-aggregate depending on changed props.
     * If fields, showType, filteredExperiments, or experiments change, we re-aggregate.
     * Otherwise we re-use.
     * 
     * @param {Object} nextProps - The next props passed to this component.
     */
    componentWillReceiveProps(nextProps){

        var state = Aggregator.updatedStateFromProps(nextProps, this.props);

        if (_.keys(state).length > 0){
            if (this.props.debug) console.log('Aggregator > WILL UPDATE STATE (new, old:)', state, this.state);
            if (state.aggregatedData && state.aggregatedData[1]){
                this.preCacheColors(state.aggregatedData[1]);
            }
            this.setState(state);
        } else if (this.props.debug){
            console.log('Aggregator > WILL NOT UPDATE STATE', this.state);
        }

    }

    preCacheColors(fieldUsedForLegend){
        return _.sortBy(
            _.keys(fieldUsedForLegend.terms).map((termName)=>{
                return {
                    'field' : fieldUsedForLegend.field,
                    'term' : termName,
                    'count' : -fieldUsedForLegend.terms[termName][this.props.aggregateType || 'experiment_sets']
                };
            }),
            'count'
        ).map(function(fauxNode){
            fauxNode.color = vizUtil.colorForNode(fauxNode);
            return fauxNode;
        });
    }

    /**
     * Clones props.children -- which is expected to be a BarPlotChart -- and adds own state to its props.
     * 
     * @returns {BarPlotChart} - A BarPlotChart with aggregated field/term data props.
     */
    render(){
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

}
