'use strict';

/**
 * Components and functions for displaying a BarPlot chart.
 * 
 * @module viz/BarPlot
 * @example
 * <caption>Example usage to aggregate and visualize 'experiments' and 'filteredExperiments' passed as props from ChartDataController.Provider.</caption>
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

export { UIControlsWrapper } from './UIControlsWrapper';
export { Aggregator } from './Aggregator';
export { ViewContainer, PopoverViewContainer, boundActions, barPlotCursorActions } from './ViewContainer';
export { Chart, genChartBarDims } from './Chart';
import * as aggrFxn from './aggregation-functions';
export const aggregationFxn = aggrFxn;
