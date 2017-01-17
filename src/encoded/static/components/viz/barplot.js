'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var expFuncs = require('../experiments-table').ExperimentsTable.funcs;
var { ChartBreadcrumbs, util } = require('./common');
var { console, isServerSide, getNestedProperty } = require('../objectutils');


var BarPlot = React.createClass({

    statics : {

        genChartData : function(
            experiments = [],
            fields = [{ 'name' : 'Biosample' , field : 'experiments_in_set.biosample.biosource_summary' }],
            experimentsOrSets='experiments'
        ){

            // Add terms and total for each field.
            fields = fields.map(function(f){ return _.extend({}, f, {
                'terms' : {},
                'total' : 0
            }); });

            function updateFieldCounts(exp){

                function count(f){
                    var term = getNestedProperty(exp, f.field.replace('experiments_in_set.',''));
                    if (typeof f.terms[term] === 'number'){
                        f.terms[term]++;
                    } else {
                        f.terms[term] = 1;
                    }
                    f.total++;
                }

                fields.forEach(count);
            }
        
            // Handle experiment_sets as well, just in case.
            if (experimentsOrSets === 'experiments') experiments.forEach(updateFieldCounts);
            else expFuncs.listAllExperimentsFromExperimentSets(experiments).forEach(updateFieldCounts);     

            return fields;
        },

        /** 
         * Return an object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally. 
         * 
         * @param {Object[]} fields - Array of fields (i.e. from props.fields) which contain counts by term and total added through @see BarPlot.genChartData().
         * @param {Object} fields.terms - Object keyed by possible term for field, with value being count of term occurences in [props.]experiments passed to genChartData.
         * @param {number} fields.total - Count of total experiments for which this field is applicable.
         * @param {number} [availWidth=400] - Available width, in pixels, for chart.
         * @param {number} [availHeight=400] - Available width, in pixels, for chart.
         * @param {Object} [styleOpts=BarPlot.getDefaultStyleOpts()] - Style settings for chart which may contain chart offsets (for axes).
         * @return {Object} Object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally.
         */
        genChartBarDims : function(
            fields,
            availWidth = 400,
            availHeight = 400,
            styleOpts = BarPlot.getDefaultStyleOpts()
        ){
            var topIndex = 0;
            var numberOfTerms;

            // Go down list of fields until select field to display which has more than 1 term, or until last field.
            while (topIndex + 1 < fields.length){
                numberOfTerms = _.keys(fields[topIndex].terms).length;
                if (numberOfTerms > 1) break;
                topIndex++;
            }

            var insetDims = {
                width  : Math.max(availWidth  - styleOpts.offset.left   - styleOpts.offset.right, 0),
                height : Math.max(availHeight - styleOpts.offset.bottom - styleOpts.offset.top,   0)
            };
            
            var availWidthPerBar = Math.min(Math.floor(insetDims.width / numberOfTerms), styleOpts.maxBarWidth + styleOpts.gap);
            var barXCoords = d3.range(0, insetDims.width, availWidthPerBar);
            var barWidth = Math.min(Math.abs(availWidthPerBar - styleOpts.gap), styleOpts.maxBarWidth);

            console.log('field', fields[topIndex], topIndex);

            return {
                'fieldIndex' : topIndex,
                'bars' : _(fields[topIndex].terms).chain()
                    .pairs()
                    .map(function(term, i){
                        return {
                            'name' : term[0],
                            'term' : term[0],
                            'count' : term[1],
                            'attr' : {
                                'width' : barWidth,
                                'height' : (term[1] / fields[topIndex].total) * insetDims.height
                            }
                        };
                    })
                    .sortBy(function(d){ return -d.attr.height; })
                    .forEach(function(d,i){
                        d.attr.x = barXCoords[i];
                    })
                    .value(),
                'fields' : fields
            };
        },

        /** Get default style options for chart. Should suffice most of the time. */
        getDefaultStyleOpts : function(){
            return {
                'gap' : 5,
                'maxBarWidth' : 60,
                'offset' : {
                    'top' : 0,
                    'bottom' : 50,
                    'left' : 80,
                    'right' : 0
                }
            };
        }
    },

    getInitialState : function(){
        return { 'mounted' : false };
    },
  
    componentDidMount : function(){
        this.bars = {}; // Save currently-visible bar refs to this object to check if bar exists already or not on re-renders for better transitions.
        this.setState({ 'mounted' : true });
    },

    propTypes : {
        'experiments'   : React.PropTypes.array,
        'fields'        : React.PropTypes.array,
        'styleOptions'  : React.PropTypes.shape({
            'gap'           : React.PropTypes.number,
            'offset'        : React.PropTypes.shape({
                'top'           : React.PropTypes.number,
                'bottom'        : React.PropTypes.number,
                'left'          : React.PropTypes.number,
                'right'         : React.PropTypes.number
            })
        }),
        'colorForNode' : React.PropTypes.func,
        'getCancelPreventClicksCallback' : React.PropTypes.func.isRequired
    },
  
    getDefaultProps : function(){
  	    return {
            experiments : [],
            fields : [
      	        { title : "Biosample", field : "experiments_in_set.biosample.biosource_summary" },
                { title : "Experiment Summary", field : "experiments_in_set.experiment_summary" }
            ],
            styleOptions : null, // Can use to override default margins/style stuff.
            colorForNode : function(node){ return util.stringToColor((node.data || node).name); } // Default color determinator
        };
    },

    styleOptions : function(){
        if (!this.props.styleOptions) return BarPlot.getDefaultStyleOpts();
        else {
            var styleOpts = BarPlot.getDefaultStyleOpts();
            Object.keys(styleOpts).forEach((styleProp) => {
                if (typeof this.props.styleOptions[styleProp] === 'undefined') return;
                if (typeof this.props.styleOptions[styleProp] === 'object' && this.props.styleOptions[styleProp]){
                    _.extend(styleOpts[styleProp], this.props.styleOptions[styleProp]);
                } else {
                    styleOpts[styleProp] = this.props.styleOptions[styleProp];
                }
            });
            return styleOpts;
        }
    },
  
    width : function(){
        if (this.props.width) return this.props.width;
        if (!this.refs.container) return null;
        var width = this.refs.container.parentElement.clientWidth;
        if (this.refs.container.parentElement.className.indexOf('col-') > -1){
            // Subtract 20 to account for grid padding (10px each side).
            return width - 20;
        }
        return width;
    },
  
    height : function(){
        if (this.props.height) return this.props.height;
        if (!this.refs.container) return null;
        return this.refs.container.parentElement.clientHeight;
    },

    shouldPerformManualTransitions : function(nextProps, pastProps){
        return !!(!_.isEqual(pastProps.experiments, nextProps.experiments) || pastProps.height !== nextProps.height);
    },

    componentWillReceiveProps : function(nextProps){
        if (this.shouldPerformManualTransitions(nextProps, this.props)){
            this.setState({ transitioning : true });
        } else {
            util.mixin.cancelPreventClicks.call(this); // Disable click prevention, if enabled (occurs on new filter selected from chart)
        }
    },

    componentDidUpdate : function(pastProps){
        console.log(this.shouldPerformManualTransitions(this.props, pastProps), this.pastBars);
        if (this.shouldPerformManualTransitions(this.props, pastProps)){
            if (typeof this.pastBars !== 'undefined'){

                var styleOpts = this.styleOptions();
                var _this = this;

                var existingAndCurrentElements = _.flatten(
                    _.map(
                        _.intersection( // Grab all bars which are current & pre-update-existing.
                            _.values(this.pastBars), // Obj to array
                            _.values(this.bars)
                        ),
                        function(b){ return [b.childNodes[0], b.childNodes[1]]; } // Get children
                    ),
                    true
                );

                console.log('EXISTING', existingAndCurrentElements);

                if (existingAndCurrentElements.length === 0){
                    console.info("No existing bars to do D3 transitions on, unsetting state.transitioning immediately.");
                    _this.setState({ transitioning : false }, util.mixin.cancelPreventClicks.bind(_this));
                    return;
                }
                
                // Since 'on end' callback is called many times (multiple bars transition), defer until called for each.
                var transitionCompleteCallback = _.after(existingAndCurrentElements.length, function(){
                    console.info("Finished D3 transitions on BarPlot.");
                    _this.setState({ transitioning : false }, util.mixin.cancelPreventClicks.bind(_this));
                });

                d3.selectAll(
                    existingAndCurrentElements
                )
                .transition().duration(750)
                .attr('height', function(d){
                    return this.parentElement.__data__.attr.height;
                })
                .attr('y', function(d){
                    return _this.height() - this.parentElement.__data__.attr.height - styleOpts.offset.bottom;
                    //return _this.height() - parseFloat(this.getAttribute('data-target-height')) - styleOpts.offset.bottom;
                })
                .on('end', transitionCompleteCallback);
            }
        }
    },

    renderParts : {

        bar : function(d, index, all, styleOpts = null, existingBars = this.pastBars){
            var transitioning = this.state.transitioning; // Cache state.transitioning to avoid risk of race condition in ref function.

            if (!styleOpts) styleOpts = this.styleOptions();

            var prevBarExists = function(){ return typeof existingBars[d.term] !== 'undefined' && existingBars[d.term] !== null; }
            var prevBarData = null;
            if (prevBarExists() && transitioning) prevBarData = existingBars[d.term].__data__;


            function barStyle(){
                var style = {};

                // Position bar's x coord via translate3d CSS property for CSS3 transitioning.
                if ((d.removing || !prevBarExists()) && transitioning){
                    // Defer to slide in new bar via CSS on state.transitioning = false.
                    style.transform = util.style.translate3d(d.attr.x, d.attr.height + 2, 0);
                    style.opacity = 0;
                } else {
                    // 'Default' (no transitioning) style
                    style.transform = util.style.translate3d(d.attr.x, 0, 0);
                    style.opacity = 1;
                }
                return style;
            }


            function rectHeight(){
                // Defer updating rect height so we can use D3 to transition it in componentDidUpdate.
                if (prevBarExists() && transitioning){
                    return prevBarData.attr.height;
                }
                return d.attr.height;
            }
            

            function rectY(){
                if (prevBarExists() && transitioning){
                    return this.height() - prevBarData.attr.height - styleOpts.offset.bottom;
                }
                return this.height() - d.attr.height - styleOpts.offset.bottom;
            }

            return (
                <g
                    className="chart-bar"
                    data-term={d.term}
                    key={"bar-" + d.term}
                    style={barStyle.call(this)}
                    ref={(r) => {
                        if (typeof this.bars !== 'undefined' && r !== null){
                            // Save bar element; set its data w/ D3 but don't save D3 wrapped-version
                            d3.select(r).datum(d);
                            if (!(d.removing && !transitioning)) this.bars[d.term] = r;
                        }
                    }}
                >
                    <text
                        className="bar-top-label"
                        x={styleOpts.offset.left}
                        y={rectY.call(this)}
                        key="text-label"
                    >
                        { d.name }
                    </text>
                    <rect
                        y={rectY.call(this)}
                        x={styleOpts.offset.left /* Use style.transform for X coord */}
                        height={rectHeight.call(this)}
                        data-target-height={d.attr.height}
                        width={d.attr.width}
                        key="rect1"
                        rx={5}
                        ry={5}
                        style={{
                            fill : this.props.colorForNode(d)
                        }}
                    />
                </g>
            );
        },

        topYAxis : function(availWidth, styleOpts){
            return (
                <line
                    key="y-axis-top"
                    className="y-axis-top"
                    x1={styleOpts.offset.left}
                    y1={styleOpts.offset.top}
                    x2={availWidth - styleOpts.offset.right}
                    y2={styleOpts.offset.top}
                />
            );
        },

        bottomYAxis : function(availWidth, availHeight, currentBars, styleOpts){
            var lineYCoord = availHeight - (styleOpts.offset.bottom * 0.75);
            return (
                <g key="y-axis-bottom">
                    <line
                        key="y-axis-bottom-line"
                        className="y-axis-bottom"
                        x1={styleOpts.offset.left}
                        y1={lineYCoord}
                        x2={availWidth - styleOpts.offset.right}
                        y2={lineYCoord}
                    />
                    { currentBars.map(function(bar){
                        return (
                            <text
                                key={'count-for-' + bar.term}
                                data-term={bar.term}
                                className="y-axis-label-count"
                                x={bar.attr.x + styleOpts.offset.left + (bar.attr.width / 2)}
                                y={lineYCoord + 20}
                            >{ bar.count }</text>
                        );
                    }) }
                </g>
            );
        }

    },

	render : function(){
        if (this.state.mounted === false) return <div ref="container"></div>;

        var availHeight = this.height(),
            availWidth = this.width(),
            styleOpts = this.styleOptions();

        // Reset this.bars, cache past ones.
        this.pastBars = _.clone(this.bars); // Difference between current and pastBars used to determine which bars to do D3 transitions on (if any).
        this.bars = {}; // ref to 'g' element is stored here.

        var barData = BarPlot.genChartBarDims( // Gen bar dimensions (width, height, x/y coords).
            BarPlot.genChartData( // Get counts by term per field.
                this.props.experiments,
                this.props.fields,
                'experiments'
            ),
            availWidth,
            availHeight,
            this.styleOptions()
        ); // Returns { fieldIndex, bars, fields (first arg supplied) }

        // Bars from current dataset/filters only.
        var currentBars = barData.bars;

        var allBars = currentBars; // All bars -- current (from barData) and those which now need to be removed if transitioning (see block below).

        // If transitioning, get D3 datums of existing bars which need to transition out and add removing=true property to inform this.renderParts.bar.
        if (this.state.transitioning){
            var barsToRemove = _.difference(  _.keys(this.pastBars),  _.pluck(barData.bars, 'term')).map((barTerm) => {
                return _.extend(this.pastBars[barTerm].__data__, { 'removing' : true });
            });
            allBars = barsToRemove.concat(currentBars);
        }

        // The sort below only helps maintain order in which is processed thru renderParts.bar(), not order of bars shown.
        // This is to help React's keying algo adjust existing bars rather than un/remount them.
        var barComponents = allBars.sort(function(a,b){ return a.term < b.term ? -1 : 1; }).map((d,i,a) => this.renderParts.bar.call(this, d, i, a, styleOpts, this.pastBars));

        // Keep in mind that 0,0 coordinate is located at top left for SVGs.
        // Easier to reason in terms of 0,0 being bottom left, thus e.g. d.attr.y for bars is set to be positive,
        // so we need to flip it via like availHeight - y in render function(s).
  	    return (
            <svg ref="container" key="svg-container" className="bar-plot-chart" data-field={this.props.fields[barData.fieldIndex].field} style={{
                'height' : availHeight,
                'width' : availWidth
            }}>
                { this.renderParts.topYAxis.call(this, availWidth, styleOpts) }
                { barComponents }
                { this.renderParts.bottomYAxis.call(this, availWidth, availHeight, currentBars, styleOpts) }
            </svg>
        );
    }
});

module.exports = BarPlot;

