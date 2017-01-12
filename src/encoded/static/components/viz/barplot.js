'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var expFuncs = require('../experiments-table').ExperimentsTable.funcs;
var { ChartBreadcrumbs, util } = require('./common');
var { console, isServerSide } = require('../objectutils');


var BarPlot = React.createClass({

    statics : {

        genChartData : function(
            experiments = [],
            availWidth = 400,
            availHeight = 400,
            fields = [{ 'name' : 'Biosample' , field : 'experiments_in_set.biosample.biosource_summary' }],
            experimentsOrSets='experiments',
            styleOpts = BarPlot.getDefaultStyleOpts()
        ){
        
            var fieldTermCounts = {};

            fields.forEach(function(field){ fieldTermCounts[field.field] = {}; });
            
            var fieldTotals = {
                'experiments_in_set.biosample.biosource_summary' : 0
            };

            function updateFieldCounts(exp){
                if (typeof fieldTermCounts['experiments_in_set.biosample.biosource_summary'][exp.biosample.biosource_summary] === 'number'){
                    fieldTermCounts['experiments_in_set.biosample.biosource_summary'][exp.biosample.biosource_summary]++;
                } else {
                    fieldTermCounts['experiments_in_set.biosample.biosource_summary'][exp.biosample.biosource_summary] = 0;
                }

                fieldTotals['experiments_in_set.biosample.biosource_summary']++;
            }
        
            // Handle experiment_sets as well, just in case.
            if (experimentsOrSets === 'experiments') experiments.forEach(updateFieldCounts);
            else {
                for (var expSetIndex = 0; expSetIndex < experiments.length; expSetIndex++){
                    experiments[expSetIndex].experiments_in_set.forEach(updateFieldCounts);
                }
            }

            // SVG coordinate/attribute Stuff
        
            var numberOfTerms = Object.keys(fieldTermCounts['experiments_in_set.biosample.biosource_summary']).length;
            var insetDims = {
                width  : Math.max(availWidth  - styleOpts.offset.left   - styleOpts.offset.right, 0),
                height : Math.max(availHeight - styleOpts.offset.bottom - styleOpts.offset.top,   0)
            };
            
            var availWidthPerBar = Math.min(Math.floor(insetDims.width / numberOfTerms), styleOpts.maxBarWidth + styleOpts.gap);
            var barXCoords = d3.range(0, insetDims.width, availWidthPerBar);
            var barWidth = Math.min(Math.abs(availWidthPerBar - styleOpts.gap), styleOpts.maxBarWidth);

            return _(fieldTermCounts['experiments_in_set.biosample.biosource_summary']).chain()
                .pairs()
                .map(function(term, i){
                    return {
                        'name' : term[0],
                        'term' : term[0],
                        'attr' : {
                            'width' : barWidth,
                            'height' : (term[1] / fieldTotals['experiments_in_set.biosample.biosource_summary']) * insetDims.height
                        }
                    };
                })
                .sortBy(function(d){ return -d.attr.height; })
                .forEach(function(d,i){
                    d.attr.x = barXCoords[i];
                })
                .value();

        },

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
        'colorForNode' : React.PropTypes.func
    },
  
    getDefaultProps : function(){
  	    return {
            experiments : [],
            fields : [
      	        { title : "Biosample", field : "experiments_in_set.biosample.biosource_summary" }
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
        }
    },

    componentDidUpdate : function(pastProps){
        if (this.shouldPerformManualTransitions(this.props, pastProps)){
            if (typeof this.pastBars !== 'undefined'){

                var styleOpts = this.styleOptions();
                var _this = this;

                var existingAndCurrentBars = _.intersection( // Grab all bars which are current & pre-update-existing.
                    _.values(this.pastBars), // Obj to array
                    _.values(this.bars)
                );

                // Since 'on end' callback is called many times (multiple bars transition), defer until called for each.
                var transitionCompleteCallback = _.after(existingAndCurrentBars.length, function(){
                    console.info("Finished D3 transition on BarPlot.")
                    _this.setState({ transitioning : false });
                });

                d3.selectAll(
                    _.map(
                        existingAndCurrentBars,
                        function(b){ return b.childNodes[0]; } // Get rects (first child of 'g' svg elems)
                    )
                )
                .transition().duration(750)
                .attr('height', function(d){
                    return d3.select(this.parentElement).datum().attr.height;
                    //return parseFloat(this.getAttribute('data-target-height'));
                })
                .attr('y', function(d){
                    return _this.height() - d3.select(this.parentElement).datum().attr.height - styleOpts.offset.bottom;
                    //return _this.height() - parseFloat(this.getAttribute('data-target-height')) - styleOpts.offset.bottom;
                })
                .on('end', transitionCompleteCallback);
            }
        }
    },

    renderParts : {

        bar : function(d, index, all, styleOpts = null, existingBars = this.pastBars){
            if (!styleOpts) styleOpts = this.styleOptions();

            var barExists = function(){ return typeof existingBars[d.term] !== 'undefined' && existingBars[d.term] !== null; }
            var prevBarData = null;
            if (barExists() && this.state.transitioning) prevBarData = d3.select(existingBars[d.term]).datum();


            function barStyle(){
                var style = {};

                // Position bar's x coord via translate3d CSS property for CSS3 transitioning.
                if (!barExists() && this.state.transitioning){
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
                if (barExists() && this.state.transitioning){
                    return prevBarData.attr.height;
                }
                return d.attr.height;
            }
            

            function rectY(){
                if (barExists() && this.state.transitioning){
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
                            this.bars[d.term] = r;
                        }
                    }}
                >
                    <rect
                        y={rectY.call(this)}
                        x={styleOpts.offset.left /* Use style.transform for X coord */}
                        height={rectHeight.call(this)}
                        data-target-height={d.attr.height}
                        width={d.attr.width}
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
                    className="y-axis-top"
                    x1={styleOpts.offset.left}
                    y1={styleOpts.offset.top}
                    x2={availWidth - styleOpts.offset.right}
                    y2={styleOpts.offset.top}
                />
            );
        }

    },

	render : function(){
        if (this.state.mounted === false) return <div ref="container"></div>;

        var availHeight = this.height(),
            availWidth = this.width(),
            styleOpts = this.styleOptions();

        // Reset this.bars, cache past ones.
        this.pastBars = _.clone(this.bars);
        this.bars = {};

        var currentBars = BarPlot.genChartData(
            this.props.experiments,
            availWidth,
            availHeight,
            this.props.fields,
            'experiments',
            this.styleOptions()
        ).map((d,i,a) => this.renderParts.bar.call(this, d, i, a, styleOpts, this.pastBars));

        //var renderBars = _.uniq(bars, this.pastBars);
        //var removingBars = _.difference(this.pastBars, bars);

        // Keep in mind that 0,0 coordinate is located at top left for SVGs.
        // Easier to reason in terms of 0,0 being bottom left, thus e.g. d.attr.y for bars is set to be positive,
        // so we need to flip it via like availHeight - y.
  	    return (
            <svg ref="container" className="bar-plot-chart" style={{
                'height' : availHeight,
                'width' : availWidth
            }}>
                { this.renderParts.topYAxis.call(this, availWidth, styleOpts) }
                { currentBars }
            </svg>
        );
    }
});

module.exports = BarPlot;

