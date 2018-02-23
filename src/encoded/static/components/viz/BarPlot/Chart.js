'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as d3 from 'd3';
import * as store from './../../../store';
import * as vizUtil from './../utilities';
import { barplot_color_cycler } from './../ColorCycler';
import { RotatedLabel } from './../components';
import { console, object, isServerSide, expFxn, Schemas, layout, navigate } from './../../util';
import { PopoverViewContainer } from './ViewContainer';


/** 
 * Return an object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally. 
 *
 * @param {Object[]} fields - Array of fields (i.e. from props.fields) which contain counts by term and total added through @see aggregationFxn.genChartData().
 * @param {Object} fields.terms - Object keyed by possible term for field, with value being count of term occurences in [props.]experiment_sets passed to genChartData.
 * @param {number} fields.total - Count of total experiments for which this field is applicable.
 * @param {number} [availWidth=400] - Available width, in pixels, for chart.
 * @param {number} [availHeight=400] - Available width, in pixels, for chart.
 * @param {Object} [styleOpts=Chart.getDefaultStyleOpts()] - Style settings for chart which may contain chart offsets (for axes).
 * @param {boolean} [useOnlyPopulatedFields=false] - Determine which fields to show via checking for which fields have multiple terms present.
 * @param {number} [fullHeightCount] - 100% Y-Axis count value. Overrides height of bars.
 * 
 * @return {Object} Object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally.
 */
export function genChartBarDims(
    rootField,
    availWidth              = 400,
    availHeight             = 400,
    styleOpts               = Chart.getDefaultStyleOpts(),
    aggregateType           = 'experiment_sets',
    useOnlyPopulatedFields  = false,
    fullHeightCount         = null
){

    
    var numberOfTerms = _.keys(rootField.terms).length;
    var largestExpCountForATerm = typeof fullHeightCount === 'number' ?
        fullHeightCount
        : _.reduce(rootField.terms, function(m,t){
            return Math.max(m, typeof t[aggregateType] === 'number' ? t[aggregateType] : t.total[aggregateType]);
        }, 0);

    var insetDims = {
        width  : Math.max(availWidth  - styleOpts.offset.left   - styleOpts.offset.right, 0),
        height : Math.max(availHeight - styleOpts.offset.bottom - styleOpts.offset.top,   0)
    };
    
    var availWidthPerBar = Math.min(Math.floor(insetDims.width / numberOfTerms), styleOpts.maxBarWidth + styleOpts.gap);
    var barXCoords = d3.range(0, insetDims.width, availWidthPerBar);
    var barWidth = Math.min(Math.abs(availWidthPerBar - styleOpts.gap), styleOpts.maxBarWidth);

    var sortByAggrCount = function(b){
        if (typeof b[aggregateType] === 'number'){
            return b[aggregateType];
        }
        return b.term;
    };

    function genBarData(fieldObj, outerDims = insetDims, parent = null){
        return _(fieldObj.terms).chain()
            .pairs()
            .map(function(term, i){
                var termKey = term[0];
                var termCount = term[1][aggregateType];
                var childBars = null;
                if (typeof term[1].field === 'string'){
                    termCount = term[1].total[aggregateType];
                }
                var maxYForBar = parent ? parent.count : largestExpCountForATerm;
                var barHeight = maxYForBar === 0 ? 0 : (termCount / maxYForBar) * outerDims.height;
                var barNode = {
                    'name' : Schemas.Term.toName(fieldObj.field, termKey),
                    'term' : termKey,
                    'count' : termCount,
                    'field' : fieldObj.field,
                    'attr' : {
                        'width' : barWidth,
                        'height' : barHeight
                    },
                    'experiment_sets' : term[1].experiment_sets,
                    'experiments' : term[1].experiments,
                    'files' : term[1].files
                };
                if (typeof term[1].field === 'string') {
                    barNode.bars = genBarData(term[1], { 'height' : barHeight }, barNode);
                }
                if (parent){
                    barNode.parent = parent;
                }
                return barNode;
            })
            .sortBy('term')
            .sortBy(function(d){ return -d.attr.height; })
            .forEach(function(d,i){
                if (Array.isArray(d.bars)){
                    d.bars = _.sortBy(_.sortBy(d.bars, 'term'), sortByAggrCount);
                }
                d.attr.x = barXCoords[i];
            })
            .value();
    }

    var barData = {
        'bars'            : genBarData(rootField, insetDims),
        'field'           : rootField,
        'fullHeightCount' : largestExpCountForATerm
    };


    // Assign colors based on sub-field total decr. counts
    var fauxOrderedSubFieldNodesForColorAssignment = _.sortBy(_.sortBy(_.values(_.reduce(barData.bars, function(m,bar){
        if (!Array.isArray(bar.bars)) return m;
        _.forEach(bar.bars, function(b){
            if (typeof m[b.term] === 'undefined'){
                m[b.term] = {
                    'count' : 0,
                    'term' : b.term,
                    'field' : b.field
                };
            }
            m[b.term].count += b[aggregateType] || 0;
        });
        return m;
    }, {})), 'term'), function(n){ return -n.count; });

    _.forEach(fauxOrderedSubFieldNodesForColorAssignment, function(n){
        barplot_color_cycler.colorForNode(n, false);
    });

    _.forEach(barData.bars, function(bar){
        if (!Array.isArray(bar.bars)) return;
        _.forEach(bar.bars, function(b){
            return _.extend(b, { 'color' : barplot_color_cycler.colorForNode(b) });
        });
    });


    return barData;
}


/**
 * Visualization component for the BarPlot. 
 * Contains chart and labels only -- no controls.
 * To add controls, wrap the chart in BarPlotChart.UIControlsWrapper, which will feed its state as props to BarPlotChart and has UI components
 * for adjusting its state to select Charting options.
 * Use BarPlotChart (or UIControlsWrapper, if is wrapping BarPlotChart) as child of ChartDataController.provider, which will feed props.experiment_sets and props.filtered_experiment_sets.
 * 
 * @type {Component}
 * @see module:viz/chart-data-controller.Provider
 * @see module:viz/BarPlot.UIControlsWrapper
 * 
 * @prop {Object[]} experiment_sets - List of all expsets, with at least fields needed to aggregate by embedded.
 * @prop {Object[]} filtered_experiment_sets - List of selected expsets, with at least fields needed to aggregate by embedded.
 * @prop {Object[]} fields - List of at least one field objects, each containing at least 'field' property in object-dot-notation.
 * @prop {string} fields.field - Field, in <code>object.dot.notation</code>.
 * @prop {string} fields.name - Name of field.
 * @prop {number} width - Self explanatory.
 * @prop {number} height - Self explanatory.
 * @prop {string} aggregateType - Set by UIControlsWrapper. Controls whether Y-Axis has 'experiment_sets', 'experiments', or 'files'.
 * @prop {string} showType - Set by UIControlsWrapper. Controls whether showing "all" experiments or only the selected or "filtered"-in experiments.
 */
export class Chart extends React.Component {

    static shouldPerformManualTransitions(nextProps, pastProps){
        //return false;
        return !!(
            pastProps.showType !== nextProps.showType ||
            pastProps.height !== nextProps.height ||
            (pastProps.barplot_data_unfiltered && nextProps.barplot_data_unfiltered && pastProps.barplot_data_unfiltered.field !== nextProps.barplot_data_unfiltered.field) ||
            (pastProps.barplot_data_filtered && nextProps.barplot_data_filtered && pastProps.barplot_data_filtered.field !== nextProps.barplot_data_filtered.field)
        );
    }

    static getDefaultStyleOpts(){
        return {
            'gap' : 16,
            'maxBarWidth' : 60,
            'maxLabelWidth' : null,
            'labelRotation' : 30,
            'labelWidth' : 200,
            'yAxisMaxHeight' : 100, // This will override labelWidth to set it to something that will fit at angle.
            'offset' : {
                'top' : 18,
                'bottom' : 50,
                'left' : 50,
                'right' : 0
            }
        };
    }

    static propTypes = {
        'barplot_data_unfiltered'   : PropTypes.object,
        'barplot_data_filtered' : PropTypes.object,
        'fields'        : PropTypes.array,
        'styleOptions'  : PropTypes.shape({
            'gap'           : PropTypes.number,
            'maxBarWidth'   : PropTypes.number,
            'labelRotation' : PropTypes.oneOf([PropTypes.number, PropTypes.string]),
            'labelWidth'    : PropTypes.oneOf([PropTypes.number, PropTypes.string]),
            'offset'        : PropTypes.shape({
                'top'           : PropTypes.number,
                'bottom'        : PropTypes.number,
                'left'          : PropTypes.number,
                'right'         : PropTypes.number
            })
        }),
        'height'        : PropTypes.number,
        'width'         : PropTypes.number,
        'useOnlyPopulatedFields' : PropTypes.bool,
        'showType'      : PropTypes.oneOf(['all', 'filtered', 'both']),
        'aggregateType' : PropTypes.oneOf(['experiment_sets', 'experiments', 'files']),
    }

    static defaultProps = {
        'experiments' : [],
        'fields' : [],
        'useOnlyPopulatedFields' : false,
        'showType' : 'both',
        'aggregateType' : 'experiments',
        'styleOptions' : null, // Can use to override default margins/style stuff.
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.styleOptions = this.styleOptions.bind(this);
        this.width = this.width.bind(this);
        this.height = this.height.bind(this);
        this.getLegendData = this.getLegendData.bind(this);
        this.getTopLevelField = this.getTopLevelField.bind(this);
        this.renderParts.bottomXAxis = this.renderParts.bottomXAxis.bind(this);
        this.renderParts.leftAxis = this.renderParts.leftAxis.bind(this);
        this.render = this.render.bind(this);
        this.state = { 'mounted' : false };
    }

    componentDidMount(){
        this.bars = {}; // Save currently-visible bar refs to this object to check if bar exists already or not on re-renders for better transitions.
        this.setState({ 'mounted' : true });
    }

    /**
     * @deprecated
     * @instance
     * @ignore
     */
    componentWillReceiveProps(nextProps){
        ///*
        if (Chart.shouldPerformManualTransitions(nextProps, this.props)){
            console.log('WILL DO SLOW TRANSITION');
            this.setState({ transitioning : true });
        }
        //*/
    }


    componentWillUpdate(){
        // Resets color cache of field-terms, allowing us to re-assign colors upon higher, data-changing, state changes.
        barplot_color_cycler.resetCache();
    }

    componentDidUpdate(pastProps){

        ///*
        if (Chart.shouldPerformManualTransitions(this.props, pastProps)){
            // Cancel out of transitioning state after delay. Delay is to allow new/removing elements to adjust opacity.
            setTimeout(()=>{
                this.setState({ transitioning : false });
            }, 750);
        }
        //*/

    }

    /** 
     * Gets style options for BarPlotChart instance. Internally, extends BarPlotChart.getDefaultStyleOpts() with props.styleOptions.
     * @returns {Object} Style options object.
     */
    styleOptions(){ return vizUtil.extendStyleOptions(this.props.styleOptions, Chart.getDefaultStyleOpts()); }
  
    /**
     * @returns props.width or width of refs.container, if mounted.
     */
    width(){
        if (this.props.width) return this.props.width;
        if (!this.refs.container) return null;
        var width = this.refs.container.parentElement.clientWidth;
        if (this.refs.container.parentElement.className.indexOf('col-') > -1){
            // Subtract 20 to account for grid padding (10px each side).
            return width - 20;
        }
        return width;
    }

    /**
     * @returns props.height or height of refs.container, if mounted.
     */
    height(){
        if (this.props.height) return this.props.height;
        if (!this.refs.container) return null;
        return this.refs.container.parentElement.clientHeight;
    }

    /**
     * Call this function, e.g. through refs, to grab fields and terms for a/the Legend component.
     * Internally, runs BarPlotChart.barDataToLegendData().
     * 
     * @deprecated
     * @returns {Array|null} List of fields containing terms. For use by legend component.
     */
    getLegendData(){
        if (!this.barData) return null;
        return Chart.barDataToLegendData(this.barData, this.props.schemas || null);
    }

    /**
     * Get the for-bar-filled field object used for the X axis.
     * @returns {Object} Top-level field containing terms.
     */
    getTopLevelField(){
        if (!this.barData) return null;
        return this.barData.fields[this.barData.fieldIndex].field;
    }

    /* TODO: Own components */
    renderParts = {

        bottomXAxis : function(availWidth, availHeight, currentBars, styleOpts){
            var _this = this;

            var labelWidth = styleOpts.labelWidth;
            if (typeof styleOpts.labelRotation === 'number'){

                var maxWidthGivenBottomOffset = (
                    1 / Math.abs(Math.sin((styleOpts.labelRotation / 180) * Math.PI)
                )) * styleOpts.offset.bottom;

                labelWidth = Math.min(
                    maxWidthGivenBottomOffset,
                    (styleOpts.labelWidth || 100000)
                );

            }

            
            return (
                <div className="y-axis-bottom" style={{ 
                    left : styleOpts.offset.left, 
                    right : styleOpts.offset.right,
                    height : Math.max(styleOpts.offset.bottom - 5, 0),
                    bottom : Math.min(styleOpts.offset.bottom - 5, 0)
                }}>
                    <RotatedLabel.Axis
                        labels={currentBars.map(function(b){ 
                            return {
                                name : b.name || b.term,
                                term : b.term,
                                x: b.attr.x,
                                opacity : 1, //_this.state.transitioning && (b.removing || !b.existing) ? 0 : '',
                            }; 
                        })}
                        labelClassName="y-axis-label no-highlight-color"
                        y={5}
                        extraHeight={5}
                        placementWidth={(currentBars[0] && currentBars[0].attr.width) || styleOpts.maxBarWidth || Chart.getDefaultStyleOpts().maxBarWidth}
                        placementHeight={styleOpts.offset.bottom}
                        angle={styleOpts.labelRotation}
                        maxLabelWidth={styleOpts.maxLabelWidth || 1000}
                        isMounted={_this.state.mounted}
                    />
                </div>
            );
        },

        leftAxis : function(availWidth, availHeight, barData, styleOpts){
            var chartHeight = availHeight - styleOpts.offset.top - styleOpts.offset.bottom;
            var chartWidth = availWidth - styleOpts.offset.left - styleOpts.offset.right;
            var ticks = d3.ticks(0, barData.fullHeightCount * ((chartHeight - 10)/chartHeight), Math.min(8, barData.fullHeightCount)).concat([barData.fullHeightCount]);
            var steps = ticks.map(function(v,i){
                var w = i === 0 ? chartWidth : (
                    Math.min(
                        (barData.bars.filter(function(b){
                            return b.count >= v - ((ticks[1] - ticks[0]) * 2);
                        }).length) * Math.min(styleOpts.maxBarWidth + styleOpts.gap, chartWidth / barData.bars.length) + (styleOpts.maxBarWidth * .66),
                        chartWidth
                    )
                );
                return (
                    <div className={"axis-step" + (i >= ticks.length - 1 ? ' last' : '')} data-tick-index={i} style={{
                        position : 'absolute',
                        left: 0,
                        right: 0,
                        bottom : (v / barData.fullHeightCount) * chartHeight - 1,
                    }} key={v}>
                        <span className="axis-label">
                            { v }
                        </span>
                        <div className="axis-bg-line" style={{ width : w + 3, right : -w - 5 }}/>
                    </div>
                );
            });
            return (
                <div className="bar-plot-left-axis" style={{
                    height : chartHeight,
                    width: Math.max(styleOpts.offset.left - 5, 0),
                    top:  styleOpts.offset.top + 'px'
                }}>
                    { steps }
                </div>
            );
        }

    }

    /** 
     * Parses props.experiment_sets and/or props.filtered_experiment_sets, depending on props.showType, aggregates experiments into fields,
     * generates data for chart bars, and then draws and returns chart wrapped in a div React element.
     * 
     * @returns {JSX.Element} - Chart markup wrapped in a div.
     */
    render(){
        if (this.state.mounted === false) return <div ref="container"></div>;

        var availHeight = this.height(),
            availWidth = this.width(),
            styleOpts = this.styleOptions();

        var topLevelField = (this.props.showType === 'all' ? this.props.barplot_data_unfiltered : this.props.barplot_data_filtered) || this.props.barplot_data_unfiltered;

        var barData = genChartBarDims( // Gen bar dimensions (width, height, x/y coords). Returns { fieldIndex, bars, fields (first arg supplied) }
            topLevelField,
            availWidth,
            availHeight,
            styleOpts,
            this.props.aggregateType,
            this.props.useOnlyPopulatedFields
        );

        return (
            <PopoverViewContainer
                leftAxis={this.renderParts.leftAxis.call(this, availWidth, availHeight, barData, styleOpts)}
                bottomAxis={this.renderParts.bottomXAxis.call(this, availWidth, availHeight, barData.bars, styleOpts)}
                topLevelField={barData.field}
                width={availWidth}
                height={availHeight}
                styleOptions={styleOpts}
                showType={this.props.showType}
                aggregateType={this.props.aggregateType}
                bars={barData.bars}
                transitioning={this.state.transitioning}
            />
        );

    }

}
