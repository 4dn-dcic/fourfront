'use strict';

/**
 * Components and functions for displaying a BarPlot chart.
 * 
 * @module viz/BarPlot
 * @example
 * <caption>Example usage to aggregate and visualize 'experiment_sets' and 'filtered_experiment_sets' passed as props from ChartDataController.Provider.</caption>
 * <ChartDataController.Provider id="barplot1">
 *     <BarPlot.UIControlsWrapper legend chartHeight={height}>
 *         <BarPlot.Aggregator>
 *             <BarPlot.Chart
 *                 width={width}
 *                 height={height}
 *                 ...
 *             />
 *         </BarPlot.Aggregator>
 *     </BarPlot.UIControlsWrapper>
 * </ChartDataController.Provider>
 */

export { UIControlsWrapper, AggregatedLegend } from './UIControlsWrapper';
export { ViewContainer, PopoverViewContainer, boundActions, barPlotCursorActions } from './ViewContainer';
export { Chart, genChartBarDims } from './Chart';
