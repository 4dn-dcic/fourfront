'use strict';

import React from 'react';
import _ from 'underscore';
import url from 'url';
import { expFxn, Filters, ajax, console, layout, isServerSide, navigate } from './util';
import * as vizUtil from './viz/utilities';
import { ChartDataController } from './viz/chart-data-controller';
import * as BarPlot from './viz/BarPlot';


/**
 * @callback showFunc
 * @param {string} path - Path of current page or view, derived from 'href' prop on FacetCharts component.
 * @return {string|boolean} - The type of view to display ('full', 'small') or bool. 
 */

/**
 * Area for displaying Charts rel to browsing.
 * Originally designed as space for 2 charts, a bigger barplot and a smaller/square/circle pie-like chart, to take up 3/4 and 1/4 width of header respectively (where 1/4 of width ~== height).
 * Now the 1/4 area for smaller chart is used for legend & ui controls.
 */
export class FacetCharts extends React.Component {

    /**
     * @type {Object} defaultProps
     * @static
     * @public
     * @member
     * @constant
     * @property {string} [href='/'] Current page/view URL, used to filter charts and pass 'path' arg to props.show, if provided.
     * @property {boolean|string|showFunc} [show] - Type of view to show or whether to display or not; if function supplied, as well as props.href, path is passed as argument. 
     * @property {string[]} initialFields - Array with 2 items representing the x-axis field and the group by field.
     */
    static defaultProps = {
        'href' : '/',
        'show' : function(path, search, hash){
            if (typeof hash === 'string' && hash.indexOf('!impersonate-user') > -1) return false;
            if (path === '/' || path === '/home') return 'large';
            if (path.indexOf('/browse/') > -1) return true;
            return false;
        },
        'views' : ['small', 'large'],
        'colWidthPerScreenSize' : {
            'small' : [
                //{'xs' : 12, 'sm' : 6,  'md' : 4, 'lg' : 3}, // For old mosaic
                {'xs' : 12, 'sm' : 9,  'md' : 9, 'lg' : 9},
                {'xs' : 12, 'sm' : 3, 'md' : 3, 'lg' : 3}
            ],
            'large' : [
                //{'xs' : 12, 'sm' : 12, 'md' : 4, 'lg' : 3}, // For old mosaic
                {'xs' : 12, 'sm' : 9, 'md' : 9, 'lg' : 9},
                {'xs' : 12, 'sm' : 3, 'md' : 3, 'lg' : 3}
            ]
        },
        'initialFields' : [
            'experiments_in_set.experiment_type',
            'experiments_in_set.biosample.biosource.individual.organism.name'
        ]
    };

    /**
     * Binds functions and initiates a state object.
     *
     * @member
     * @ignore
     * @public
     * @constructor
     */
    constructor(props){
        super(props);
        this.show = this.show.bind(this);
        this.width = this.width.bind(this);
        this.render = this.render.bind(this);
        this.state = { 'mounted' : false };
    }

    /**
     * Adds event listener for window resize event.
     * Updates `state.mounted`.
     *
     * @private
     * @todo Remove and instead wrap this in a `layout.windowResizeTrigger`.
     * @todo Perhaps calculate window inner width and height in root, e.g. App.js / BodyElement, and pass it down to trigger 'window resize'.
     */
    componentDidMount(){
        var { debug, browseBaseState, initialFields } = this.props;

        if (!isServerSide() && typeof window !== 'undefined'){
            var _this = this;
            this.debouncedResizeHandler = _.debounce(function(){
                _this.forceUpdate();
            }, 300);
            window.addEventListener('resize', this.debouncedResizeHandler);
        }

        if (!ChartDataController.isInitialized()){
            ChartDataController.initialize(
                browseBaseState,
                initialFields,
                ()=>{
                    if (debug) console.log("Mounted FacetCharts after initializing ChartDataController:", ChartDataController.getState());
                    setTimeout(() => this.setState({ 'mounted' : true }), 100);
                }
            );
        } else {
            if (debug) console.log('Mounted FacetCharts');
            setTimeout(() => this.setState({ 'mounted' : true }), 100);
        }

    }

    /**
     * Removes event listener for window resize event.
     */
    componentWillUnmount(){
        if (!isServerSide() && typeof window !== 'undefined'){
            window.removeEventListener('resize', this.debouncedResizeHandler);
            delete this.debouncedResizeHandler;
        }
    }

    /**
     * @ignore
     */
    componentDidUpdate(pastProps, pastState){
        if (this.props.debug) console.log('Updated FacetCharts', this.state);
    }

    /**
     * Given this.props, determines if element is currently meant to be invisible (false) or a certain layout ({string}).
     * 
     * @instance
     * @private
     * @param {Object} [props=this.props] - Representation of current or next props for this component.
     * @returns {string|boolean} What layout should currently be rendered.
     */
    show(props = this.props){
        if (props.show === false) return false;
        if (typeof props.show === 'string' && props.views.indexOf(props.show) > -1) return props.show;
        if (typeof props.show === 'function') {
            var show;
            if (typeof props.href === 'string') {
                var urlParts = url.parse(props.href);
                show = props.show(urlParts.pathname, urlParts.search, urlParts.hash);
            } else {
                show = props.show();
            }
            if (show === false) return false; // If true, continue to use default ('small')
            if (props.views.indexOf(show) > -1) return show;
        }
        return props.views[0]; // Default
    }

    /**
     * We want a square for circular charts, so we determine WIDTH available for first chart (which is circular), and return that as height.
     *
     * @deprecated
     * @todo Remove and refactor.
     * @param {number} chartNumber - Index+1 of chart we want to get width for.
     * @param {showFunc} show - Function to determine show state (large, small).
     * @returns {number} Width
     */
    width(chartNumber = 0, show = null){
        if (!show) show = this.show();
        if (!show) return null;
        if (!this.state.mounted || isServerSide()){
            return 1160 * (this.props.colWidthPerScreenSize[show][chartNumber - 1].lg / 12); // Full width container size (1160) 
        } else {
            return (layout.gridContainerWidth() + 20) * (this.props.colWidthPerScreenSize[show][chartNumber - 1][layout.responsiveGridState()] / 12);
        }
    }

    /**
     * @private
     * @returns {JSX.Element} Area with BarPlot chart, wrapped by `ChartDataController.Provider` instance.
     */
    render(){

        var show = this.show();
        if (!show) return null; // We don't show section at all.
        if (this.props.context && this.props.context.total === 0) return null;
        if (this.props.debug) console.log('WILL SHOW FACETCHARTS', show, this.props.href);

        var colWidthPerScreenSize = this.props.colWidthPerScreenSize;
        function genChartColClassName(chartNumber = 1){
            return _.keys(colWidthPerScreenSize[show][chartNumber - 1]).map(function(size){
                return 'col-' + size + '-' + colWidthPerScreenSize[show][chartNumber - 1][size];
            }).join(' ');
        }

        var height = show === 'small' ? 300 : 450;

        if (this.state.mounted && layout.responsiveGridState() === 'xs') height = Math.min(height, 240);

        //vizUtil.unhighlightTerms();

        if (!this.state.mounted){
            return ( // + 30 == breadcrumbs (26) + breadcrumbs-margin-bottom (10) + description (30)
                <div className={"facet-charts loading " + show} key="facet-charts" style={{ 'height' : height }}>
                    <i className="icon icon-spin icon-circle-o-notch" style={{ 'top' : (height / 2 - 30) + 'px' }} />
                </div>
            );
        }

        if (this.props.debug) console.log('FacetCharts SCHEMAS AT RENDER', this.props.schemas);

        return (
            <div className={"facet-charts show-" + show} key="facet-charts">
                <ChartDataController.Provider id="barplot1">
                    <BarPlot.UIControlsWrapper legend chartHeight={height} href={this.props.href} expSetFilters={Filters.currentExpSetFilters()} >
                        <BarPlot.Chart
                            width={this.width(1) - 20}
                            height={height}
                            schemas={this.props.schemas}
                            ref="barplotChart"
                        />
                    </BarPlot.UIControlsWrapper>
                </ChartDataController.Provider>
            </div>
        );
    }

}
