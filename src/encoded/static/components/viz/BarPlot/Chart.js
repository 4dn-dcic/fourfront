'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as d3 from 'd3';
import memoize from 'memoize-one';
import * as vizUtil from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';
import { console, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { Schemas } from './../../util';
import { barplot_color_cycler } from './../ColorCycler';
import { RotatedLabel } from './../components';
import { PopoverViewContainer } from './ViewContainer';


/**
 * Return an object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally.
 *
 * @param {Object} rootField - Top-level field, the aggregations for which represent the X axis.
 * @param {Object} rootField.terms - Object keyed by possible term for field, with value being count of term occurences in [props.]experiment_sets passed to genChartData.
 * @param {number} rootField.total - Count of total experiments for which this field is applicable.
 * @param {number} [availWidth=400] - Available width, in pixels, for chart.
 * @param {number} [availHeight=400] - Available width, in pixels, for chart.
 * @param {Object} [styleOpts=Chart.getDefaultStyleOpts()] - Style settings for chart which may contain chart offsets (for axes).
 * @param {string} [aggregateType="experiment_sets"] - Type of value to count up. Should be one of ["experiment_sets", "files", "experiments"].
 * @param {boolean} [useOnlyPopulatedFields=false] - Determine which fields to show via checking for which fields have multiple terms present.
 * @param {?number} [fullHeightCount=null] - 100% Y-Axis count value. Overrides height of bars.
 * @return {Object} Object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally.
 */
export function genChartBarDims(
    rootField,
    availWidth              = 400,
    availHeight             = 400,
    styleOpts               = Chart.defaultStyleOpts,
    aggregateType           = 'experiment_sets',
    useOnlyPopulatedFields  = false,
    fullHeightCount         = null
){

    // Resets color cache of field-terms, allowing us to re-assign colors upon higher, data-changing, state changes.
    // Probably shouldn't be done this way since kinda a globally-imported object... eh.. todo for later
    // barplot_color_cycler is also imported & re-used by Legend.js to grab colors.
    barplot_color_cycler.resetCache();

    const numberOfTerms = _.keys(rootField.terms).length;
    const largestExpCountForATerm = typeof fullHeightCount === 'number' ? fullHeightCount : _.reduce(rootField.terms, function(m,t){
        return Math.max(m, typeof t[aggregateType] === 'number' ? t[aggregateType] : t.total[aggregateType]);
    }, 0);
    const insetDims = {
        width  : Math.max(availWidth  - styleOpts.offset.left   - styleOpts.offset.right, 0),
        height : Math.max(availHeight - styleOpts.offset.bottom - styleOpts.offset.top,   0)
    };
    const availWidthPerBar = Math.min(Math.floor(insetDims.width / numberOfTerms), styleOpts.maxBarWidth + styleOpts.gap);
    const barXCoords = d3.range(0, insetDims.width, availWidthPerBar);
    const barWidth = Math.min(Math.abs(availWidthPerBar - styleOpts.gap), styleOpts.maxBarWidth);
    const sortByAggrCount = function(b){
        if (typeof b[aggregateType] === 'number'){
            return b[aggregateType];
        }
        return b.term;
    };

    function genBarData(fieldObj, outerDims = insetDims, parent = null){
        return _(fieldObj.terms).chain()
            .pairs()
            .map(function([termKey, termObj], i){
                let termCount = termObj[aggregateType];
                if (typeof termObj.field === 'string'){
                    termCount = termObj.total[aggregateType];
                }
                const maxYForBar = parent ? parent.count : largestExpCountForATerm;
                const barHeight = maxYForBar === 0 ? 0 : (termCount / maxYForBar) * outerDims.height;
                const barNode = {
                    'name'      : Schemas.Term.toName(fieldObj.field, termKey),
                    'term'      : termKey,
                    'count'     : termCount,
                    'field'     : fieldObj.field,
                    'attr'      : {
                        'width'     : barWidth,
                        'height'    : barHeight
                    },
                    'experiment_sets' : termObj.experiment_sets,
                    'experiments'       : termObj.experiments,
                    'files'             : termObj.files,
                    'files_raw'         : termObj.files_raw,
                    'files_processed'   : termObj.files_processed,
                    'files_opf'         : termObj.files_opf,
                };
                if (typeof termObj.field === 'string') {
                    barNode.bars = genBarData(termObj, { 'height' : barHeight }, barNode);
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

    const barData = {
        'bars' : genBarData(rootField, insetDims),
        'field' : rootField,
        'fullHeightCount' : largestExpCountForATerm
    };

    // Assign colors based on sub-field total decr. counts
    const fauxOrderedSubFieldNodesForColorAssignment = _.sortBy(_.sortBy(_.values(_.reduce(barData.bars, function(m,bar){
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
export class Chart extends React.PureComponent {

    static shouldPerformManualTransitions(nextProps, pastProps){
        //return false;
        return !!(
            pastProps.showType !== nextProps.showType ||
            pastProps.height !== nextProps.height ||
            (pastProps.barplot_data_unfiltered && nextProps.barplot_data_unfiltered && pastProps.barplot_data_unfiltered.field !== nextProps.barplot_data_unfiltered.field) ||
            (pastProps.barplot_data_filtered && nextProps.barplot_data_filtered && pastProps.barplot_data_filtered.field !== nextProps.barplot_data_filtered.field)
        );
    }

    static defaultStyleOpts = {
        'gap' : 48,
        'maxBarWidth' : null,
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

    /**
     * @todo
     * Should prly have ~ `Chart.defaultStyleOpts` as prop maybe? Idk. W.e.
     * Not super clean but 0 plans to re-use this atm so low cleanup prioritization.
     * And rename this func.
     *
     * @static
     * @param {{ terms: Object<string, { term, field, total, terms? }>, field }} topLevelField
     * @param {number} width
     * @param {number} [height=null]
     * @returns {{ gap: number, maxBarWidth: number, ... }} Final options for dimensionsing bars.
     */
    static getDefaultStyleOpts(topLevelField, width, height = null){
        const opts = { ...Chart.defaultStyleOpts };
        const { terms = {} } = topLevelField || {};
        const termsLen = _.keys(terms).length;

        // Decrease `gap` to 1/4 width of ((# of bars) / width) if necessary
        if (typeof width === "number" && !isNaN(width)){
            const barAndGapWidth = (width / termsLen);
            opts.gap = Math.min(
                Math.floor(barAndGapWidth / 4),
                (opts.gap || 120) // Arbitrary default/fallback
            );
        }

        if (!opts.maxBarWidth) {
            if (typeof height === "number" && !isNaN(height)) {
                opts.maxBarWidth = height - ((opts.offset || {}).top || 0) - ((opts.offset || {}).bottom || 0);
            } else if (typeof width === "number" && !isNaN(width)){
                opts.maxBarWidth = Math.floor(width / 2);
            } else {   // Arbitrary default/fallback. Final 'bar width' is less than this, depending on width.
                opts.maxBarWidth = 320;
            }
        }

        return opts;
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
        'windowWidth'   : PropTypes.number,
        'href'          : PropTypes.string,
        'cursorDetailActions' : PopoverViewContainer.propTypes.cursorDetailActions
    };

    static defaultProps = {
        'experiments' : [],
        'fields' : [],
        'useOnlyPopulatedFields' : false,
        'showType' : 'both',
        'aggregateType' : 'experiments',
        'styleOptions' : null, // Can use to override default margins/style stuff.
    };

    constructor(props){
        super(props);
        this.styleOptions = this.styleOptions.bind(this);
        this.renderParts.bottomXAxis = this.renderParts.bottomXAxis.bind(this);
        this.renderParts.leftAxis = this.renderParts.leftAxis.bind(this);
        this.state = { 'mounted' : false };
        this.memoized = {
            getDefaultStyleOpts: memoize(Chart.getDefaultStyleOpts),
            extendStyleOptions: memoize(vizUtil.extendStyleOptions),
            genChartBarDims: memoize(genChartBarDims)
        };
    }

    componentDidMount(){
        this.bars = {}; // Save currently-visible bar refs to this object to check if bar exists already or not on re-renders for better transitions.
        this.setState({ 'mounted' : true });
    }

    componentWillUnmount(){
        this.setState({ 'mounted' : false });
    }

    /**
     * Gets style options for BarPlotChart instance. Internally, extends BarPlotChart.getDefaultStyleOpts() with props.styleOptions.
     * @returns {Object} Style options object.
     */
    styleOptions(topLevelField){
        const { styleOptions, width, height } = this.props;
        return this.memoized.extendStyleOptions(
            styleOptions,
            this.memoized.getDefaultStyleOpts(topLevelField, width, height)
        );
    }

    /* TODO: Own components */
    renderParts = {

        bottomXAxis : function(availWidth, availHeight, currentBars, styleOpts){
            const { windowWidth } = this.props, { mounted } = this.state;
            const { offset, labelRotation, maxLabelWidth, maxBarWidth } = styleOpts;
            const barLabelsSortedByTerm = _.map(currentBars, function(b){
                return {
                    'name' : b.name || b.term,
                    'term' : b.term,
                    'x' : b.attr.x,
                    'opacity' : 1
                };
            }).sort(function(a,b){
                return a.term < b.term ? -1 : 1;
            });

            const placementWidth = (currentBars[0] && currentBars[0].attr.width) || maxBarWidth || Chart.getDefaultStyleOpts().maxBarWidth;

            return (
                <div className="y-axis-bottom" style={{
                    left : offset.left,
                    right : offset.right,
                    height : Math.max(offset.bottom - 5, 0),
                    bottom : Math.min(offset.bottom - 5, 0)
                }}>
                    <RotatedLabel.Axis
                        labels={barLabelsSortedByTerm}
                        labelClassName="y-axis-label no-highlight-color"
                        y={5}
                        extraHeight={5}
                        placementWidth={placementWidth}
                        placementHeight={offset.bottom}
                        angle={labelRotation}
                        maxLabelWidth={maxLabelWidth || 1000}
                        isMounted={mounted}
                        windowWidth={windowWidth}
                    />
                </div>
            );
        },

        leftAxis : function(availWidth, availHeight, barData, styleOpts){
            const { offset, gap, maxBarWidth } = styleOpts;
            const chartHeight = availHeight - offset.top - offset.bottom;
            const chartWidth = availWidth - offset.left - offset.right;
            const ticks = d3.ticks(0, barData.fullHeightCount * ((chartHeight - 10)/chartHeight), Math.min(8, barData.fullHeightCount)).concat([barData.fullHeightCount]);
            const steps = ticks.map(function(v,i){
                var w = i === 0 ? chartWidth : (
                    Math.min(
                        (barData.bars.filter(function(b){
                            return b.count >= v - ((ticks[1] - ticks[0]) * 2);
                        }).length) * Math.min(maxBarWidth + gap, chartWidth / barData.bars.length) + (maxBarWidth * .66),
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
                    width: Math.max(offset.left - 5, 0),
                    top: offset.top + 'px'
                }}>
                    { steps }
                </div>
            );
        }

    };

    /**
     * Parses props.experiment_sets and/or props.filtered_experiment_sets, depending on props.showType, aggregates experiments into fields,
     * generates data for chart bars, and then draws and returns chart wrapped in a div React element.
     *
     * @returns {JSX.Element} - Chart markup wrapped in a div.
     */
    render(){
        const { mounted } = this.state;
        if (!mounted) return <div/>;

        const {
            width, height, showType, barplot_data_unfiltered, barplot_data_filtered, context,
            aggregateType, useOnlyPopulatedFields, cursorDetailActions, href, schemas
        } = this.props;

        const topLevelField = (showType === 'all' ? barplot_data_unfiltered : barplot_data_filtered) || barplot_data_unfiltered;
        const styleOptions = this.styleOptions(topLevelField);

        // Gen bar dimensions (width, height, x/y coords). Returns { fieldIndex, bars, fields (first arg supplied) }
        const barData = this.memoized.genChartBarDims(
            topLevelField,
            width,
            height,
            styleOptions,
            aggregateType,
            useOnlyPopulatedFields
        );

        return (
            <PopoverViewContainer {...{ width, height, styleOptions, showType, aggregateType, href, schemas, context }}
                actions={cursorDetailActions}
                leftAxis={this.renderParts.leftAxis(width, height, barData, styleOptions)}
                bottomAxis={this.renderParts.bottomXAxis(width, height, barData.bars, styleOptions)}
                topLevelField={barData.field} bars={barData.bars} />
        );

    }

}
