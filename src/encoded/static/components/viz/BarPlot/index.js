'use strict';


/**
 * Components and functions for displaying a BarPlot chart.
 * 
 * @module viz/BarPlot
 * @example
 * <caption>Example Usage</caption>
 * <ChartDataController.Provider id="barplot1">
 *     <BarPlot.UIControlsWrapper legend chartHeight={height}>
 *         <BarPlot.Aggregator>
 *             <BarPlot.Chart
 *                 width={this.width(1) - 20}
 *                 height={height}
 *                 onBarPartMouseEnter={(node, evt)=>{
 *                     ...
 *                 }}
 *                 onBarPartMouseLeave={...}
 *                 onBarPartClick={(node, evt)=>{
 *                     ...
 *                 }}
 *             />
 *         </BarPlot.Aggregator>
 *     </BarPlot.UIControlsWrapper>
 * </ChartDataController.Provider>
 */

/**
 * Component which wraps BarPlot.Chart and provides some UI buttons and stuff.
 * Passes props to BarPlot.Chart.
 * 
 * @namespace
 * @member
 * @type {Component}
 */
module.exports.UIControlsWrapper = require('./UIControlsWrapper');



/**
 * This is an optional component which may be placed between BarPlot.Chart and UIControlsWrapper.
 * It will store the result of aggregation into state and then pass it as a prop down to BarPlot.Chart.
 * Primarily this is to redrawing performance. Utilizes shouldComponentUpdate and componentWillReceiveProps.
 * 
 * Accepts the same props as BarPlot.Chart, save for own 'aggregatedData' and 'aggregatedFilteredData'.
 * 
 * @namespace
 * @member
 * @type {Component}
 * @prop {Object[]} experiments - "All" experiments, passed from ChartDataController[.Provider].
 * @prop {Object[]} filteredExperiments - "Selected" experiments, if expSetFilters are set in Redux store. Passed from ChartDataController[.Provider].
 * @prop {Object[]} fields - Passed from UIControlsWrapper.
 * @prop {string} aggregateType - Passed from UIControlsWrapper.
 * @prop {string} showType - Passed from UIControlsWrapper.
 * @prop {BarPlot.Chart} children - Must contain a BarPlotChart as the single child element.
 */
module.exports.Aggregator = require('./Aggregator');

/**
 * Various aggregation functions which are used by BarPlot.Chart and/or BarPlot.Aggregator to convert & aggregate list of experiments
 * into a chart-friendly structure.
 * 
 * @namespace
 * @member
 * @type {Object}
 */
module.exports.aggregationFxn = require('./aggregation-functions');


/**
 * Visualization component for the BarPlot. 
 * Contains chart and labels only -- no controls.
 * To add controls, wrap the chart in BarPlotChart.UIControlsWrapper, which will feed its state as props to BarPlotChart and has UI components
 * for adjusting its state to select Charting options.
 * Use BarPlotChart (or UIControlsWrapper, if is wrapping BarPlotChart) as child of ChartDataController.provider, which will feed props.experiments and props.filteredExperiments.
 * 
 * @namespace
 * @member
 * @type {Component}
 * @see module:viz/chart-data-controller.Provider
 * @see module:viz/BarPlotChart.UIControlsWrapper
 * 
 * @prop {Object[]} experiments - List of all experiments as stored in and provided by ChartDataController.
 * @prop {Object[]} filteredExperiments - List of experiments which match current filters. Stored in and provided by ChartDataController[.Provider].
 * @prop {function} onBarPartMouseEnter - A callback function for when someone's cursor enters a bar part. Takes the node/datum of the bar part (0) and MouseEvent (1) as arguments.
 * @prop {function} onBarPartMouseLeave - Counterpart for props.onBarPartMouseEnter.
 * @prop {Object[]} fields - List of field objects containing 'field'[, 'name'][, 'description'][, 'title']. If length === 1, only plots bars (no bar parts), if length === 2, plots 2nd field as subdivision. Provide more along with props.useOnlyPopulatedFields = true to have chart auto-select the fields to plot based on which has than 1 term.
 * @prop {boolean} useOnlyPopulatedFields - Defaults to false. If true, and list of fields is longer than 2, will visualize first field(s) found in list with more than 1 term.
 * @prop {number} width - Self explanatory.
 * @prop {number} height - Self explanatory.
 * @prop {string} aggregateType - Set by UIControlsWrapper. Controls whether Y-Axis has 'experiment_sets', 'experiments', or 'files'.
 * @prop {string} showType - Set by UIControlsWrapper. Controls whether showing "all" experiments or only the selected or "filtered"-in experiments.
 */
module.exports.Chart = require('./Chart');

