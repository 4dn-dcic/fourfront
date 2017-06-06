'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as d3 from 'd3';
import * as store from './../../../store';
import * as vizUtil from './../utilities';
import { RotatedLabel } from './../components';
import { console, object, isServerSide, expFxn, Schemas, layout, navigate } from './../../util';
import { firstPopulatedFieldIndex, genChartData } from './aggregation-functions';
import { PopoverViewContainer } from './ViewContainer';


/** 
 * Return an object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally. 
 *
 * @param {Object[]} fields - Array of fields (i.e. from props.fields) which contain counts by term and total added through @see aggregationFxn.genChartData().
 * @param {Object} fields.terms - Object keyed by possible term for field, with value being count of term occurences in [props.]experiments passed to genChartData.
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
    fields,
    availWidth              = 400,
    availHeight             = 400,
    styleOpts               = Chart.getDefaultStyleOpts(),
    aggregateType           = 'experiment_sets',
    useOnlyPopulatedFields  = false,
    fullHeightCount         = null
){
    
    var topIndex = 0;

    if (useOnlyPopulatedFields) {
        topIndex = firstPopulatedFieldIndex(fields);
    }
    
    var numberOfTerms = _.keys(fields[topIndex].terms).length;
    var largestExpCountForATerm = typeof fullHeightCount === 'number' ?
        fullHeightCount
        : _.reduce(fields[topIndex].terms, function(m,t){
            return Math.max(m, typeof t[aggregateType] === 'number' ? t[aggregateType] : t.total[aggregateType]);
        }, 0);

    var insetDims = {
        width  : Math.max(availWidth  - styleOpts.offset.left   - styleOpts.offset.right, 0),
        height : Math.max(availHeight - styleOpts.offset.bottom - styleOpts.offset.top,   0)
    };
    
    var availWidthPerBar = Math.min(Math.floor(insetDims.width / numberOfTerms), styleOpts.maxBarWidth + styleOpts.gap);
    var barXCoords = d3.range(0, insetDims.width, availWidthPerBar);
    var barWidth = Math.min(Math.abs(availWidthPerBar - styleOpts.gap), styleOpts.maxBarWidth);

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
            .sortBy(function(d){ return -d.attr.height; })
            .forEach(function(d,i){
                d.attr.x = barXCoords[i];
            })
            .value();
    }

    var barData = {
        'fieldIndex'      : topIndex,
        'bars'            : genBarData(fields[topIndex], insetDims),
        'fields'          : fields,
        'fullHeightCount' : largestExpCountForATerm
    };

    barData.bars.forEach(function(bar){

        var hasSubSections = Array.isArray(bar.bars);

        if (!hasSubSections) return;

        var sortByAggrCount = function(b){
            if (typeof b[aggregateType] === 'number'){
                return -b[aggregateType];
            }
            return b.term;
        };

        bar.bars = vizUtil.sortObjectsByColorPalette(
            bar.bars.map(function(b){
                return _.extend(b, { 'color' : vizUtil.colorForNode(b) });
            })
        );

        bar.bars = _.sortBy(bar.bars, sortByAggrCount);

    });


    return barData;
}


/**
 * Visualization component for the BarPlot. 
 * Contains chart and labels only -- no controls.
 * To add controls, wrap the chart in BarPlotChart.UIControlsWrapper, which will feed its state as props to BarPlotChart and has UI components
 * for adjusting its state to select Charting options.
 * Use BarPlotChart (or UIControlsWrapper, if is wrapping BarPlotChart) as child of ChartDataController.provider, which will feed props.experiments and props.filteredExperiments.
 * 
 * @type {Component}
 * @see module:viz/chart-data-controller.Provider
 * @see module:viz/BarPlot.UIControlsWrapper
 * 
 * @prop {Object[]} experiments - List of all experiments, with at least fields needed to aggregate by embedded.
 * @prop {Object[]} filteredExperiments - List of selected experiments, with at least fields needed to aggregate by embedded.
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
            !_.isEqual(pastProps.experiments, nextProps.experiments) ||
            pastProps.height !== nextProps.height ||
            !_.isEqual(pastProps.filteredExperiments, nextProps.filteredExperiments)
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
        'experiments'   : PropTypes.array,
        'filteredExperiments' : PropTypes.array,
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
        this.renderAllExperimentsSilhouette = this.renderAllExperimentsSilhouette.bind(this);
        this.genChartData = this.genChartData.bind(this);
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

    /**
     * @deprecated
     * @instance
     * @ignore
     */
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

    /**
     * Used to help generate "highlighted" selected bars against the output of this: the "all experiments" bars silhoutte.
     * Used conditionally in BarPlotChart.render to render clones of the BarChart behind the primary bars,
     * using 'all experiments' data instead of the 'filtered' or 'selected' experiments.
     * 
     * @instance
     * @deprecated
     * @param {number} width - Width of available chart drawing area.
     * @param {number} height - Height of available chart drawing area.
     * @param {Object} [styleOpts] - Style options for the chart, including gap between bars, maximum bar width, etc.
     * @returns {Object} "All Experiments" bars silhouttes, wrapped in an object also containing barData for all experiments.
     * @see module:viz/BarPlot.Chart.render
     * @see module:viz/BarPlot.Chart.genChartData
     */
    renderAllExperimentsSilhouette(width, height, styleOpts = null){
        if (!this.props.filteredExperiments) return null;
        if (!styleOpts) styleOpts = this.styleOptions();

        var allExperimentsBarData = genChartBarDims( // Gen bar dimensions (width, height, x/y coords). Returns { fieldIndex, bars, fields (first arg supplied) }
            genChartData( // Get counts by term per field.
                this.props.experiments,
                this.props.fields,
                this.props.aggregateType,
                'experiments',
                this.props.useOnlyPopulatedFields
            ),
            width,
            height,
            styleOpts,
            this.props.aggregateType,
            this.props.useOnlyPopulatedFields
        );

        return {
            'component' : (
                <div className="silhouette" style={{ 'width' : width, 'height' : height }}>
                    {
                        allExperimentsBarData.bars
                        .map(function(b){
                            b.attr.width = b.attr.width / 2 - 2;

                            return b;
                        })
                        .sort(function(a,b){ return a.term < b.term ? -1 : 1; })
                        .map((d,i,a) => this.renderParts.bar.call(this, d, i, a, styleOpts, this.pastBars))
                    }
                </div>
            ),
            'data' : allExperimentsBarData
        };   
    }

    genChartData(){
        return genChartData( // Get counts by term per field.
            (
                this.props.showType === 'all' ?
                this.props.experiments : this.props.filteredExperiments || this.props.experiments
            ),
            this.props.fields,
            this.props.aggregateType,
            'experiments',
            this.props.useOnlyPopulatedFields
        );
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
                                //color : vizUtil.colorForNode(b, true, null, null, true)
                            }; 
                        })}
                        labelClassName="y-axis-label no-highlight-color"
                        y={5}
                        extraHeight={5}
                        placementWidth={currentBars[0].attr.width}
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
     * Parses props.experiments and/or props.filterExperiments, depending on props.showType, aggregates experiments into fields,
     * generates data for chart bars, and then draws and returns chart wrapped in a div React element.
     * 
     * @returns {React.Element} - Chart markup wrapped in a div.
     */
    render(){
        if (this.state.mounted === false) return <div ref="container"></div>;

        var availHeight = this.height(),
            availWidth = this.width(),
            styleOpts = this.styleOptions();

        /* For showing FILTERED vs ALL
        var allExpsBarDataContainer = null;
        if (
            this.props.filteredExperiments && this.props.showType === 'both'
        ){
            allExpsBarDataContainer = this.renderAllExperimentsSilhouette(availWidth, availHeight, styleOpts);
        }
        */

        var chartData = (
            (this.props.showType === 'all' ? this.props.aggregatedData : this.props.aggregatedFilteredData) || this.props.aggregatedData
        ) || this.genChartData();

        var barData = genChartBarDims( // Gen bar dimensions (width, height, x/y coords). Returns { fieldIndex, bars, fields (first arg supplied) }
            chartData,
            availWidth,
            availHeight,
            styleOpts,
            this.props.aggregateType,
            this.props.useOnlyPopulatedFields,
            //allExpsBarDataContainer && allExpsBarDataContainer.data && allExpsBarDataContainer.data.fullHeightCount
        );

        //console.log('BARDATA', this.props.showType, barData, this.props.aggregatedData, this.props.aggregatedFilteredData);

        /*
        /* For showing FILTERED vs ALL
        function overWriteFilteredBarDimsWithAllExpsBarDims(barSet, allExpsBarSet){
            barSet.forEach(function(b){
                var allExpsBar = _.find(allExpsBarSet, { 'term' : b.term });
                _.extend(
                    b.attr,
                    {
                        'width' : allExpsBar.attr.width,
                        'x' : allExpsBar.attr.x + (allExpsBar.attr.width + 2)
                    }
                );
                if (Array.isArray(b.bars)){
                    overWriteFilteredBarDimsWithAllExpsBarDims(
                        b.bars, allExpsBar.bars
                    );
                }
            });
        }

        if (allExpsBarDataContainer){
            overWriteFilteredBarDimsWithAllExpsBarDims(
                allBars, allExpsBarDataContainer.data.bars
            );
        }
        */

        return (
            <PopoverViewContainer
                leftAxis={this.renderParts.leftAxis.call(this, availWidth, availHeight, barData, styleOpts)}
                bottomAxis={this.renderParts.bottomXAxis.call(this, availWidth, availHeight, barData.bars, styleOpts)}
                topLevelField={this.props.fields[barData.fieldIndex].field}
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
