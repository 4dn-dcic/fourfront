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
 * @memberof module:viz/BarPlot
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
 * @memberof module:viz/BarPlot
 * @type {Component}
 * @prop {Object[]} experiments - "All" experiments, passed from ChartDataController[.Provider].
 * @prop {Object[]} filteredExperiments - "Selected" experiments, if expSetFilters are set in Redux store. Passed from ChartDataController[.Provider].
 * @prop {Object[]} fields - Passed from UIControlsWrapper.
 * @prop {string} aggregateType - Passed from UIControlsWrapper.
 * @prop {string} showType - Passed from UIControlsWrapper.
 * @prop {BarPlot.Chart} children - Must contain a BarPlotChart as the single child element.
 */
module.exports.Aggregator = require('./Aggregator');


module.exports.aggregationFxn = require('./aggregation-functions');

module.exports.Chart = require('./Chart');

