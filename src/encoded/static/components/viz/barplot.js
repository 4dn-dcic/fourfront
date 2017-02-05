'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var vizUtil = require('./utilities');
var Legend = require('./components/Legend');
var { console, object, isServerSide, expFxn, Filters } = require('../util');
var { highlightTerm, unhighlightTerms } = require('./../facetlist');


var BarPlot = React.createClass({

    statics : {

        genChartData : function(
            experiments = [],
            fields = [{ 'name' : 'Biosample' , field : 'experiments_in_set.biosample.biosource_summary' }],
            experimentsOrSets='experiments'
        ){

            // Add terms and total for each field.
            fields = fields.map(function(f){ 
                return _.extend({}, f, {
                    'terms' : {},
                    'total' : 0
                });
            });
        
            // Handle experiment_sets as well, just in case.
            if (experimentsOrSets === 'experiments') experiments.forEach(BarPlot.countFieldsTermsForExperiment.bind(this, fields));
            else expFxn.listAllExperimentsFromExperimentSets(experiments).forEach(BarPlot.countFieldsTermsForExperiment.bind(this, fields));

            //return fields;
            return BarPlot.partitionFields(fields, experiments);
        },

        /**
         * @param {Object} fieldObj - A field object with present but incomplete 'terms' & 'total'.
         * @param {string|string[]} term - A string or array of strings denoting terms. If multiple terms are passed, then field must have fields as terms (with incomplete 'terms' & 'total') object.
         */
        countFieldTermForExperiment : function(fieldObj, term, updateTotal = true){
            var termsCont = fieldObj.terms;
            if (Array.isArray(term)){
                if (term.length === 1) term = term[0];
                else {
                    var i = 0;
                    while (i < term.length - 1){
                        termsCont = termsCont[term[i]].terms;
                        if (typeof termsCont === 'undefined') return;
                        i++;
                    }
                    term = term[i];
                }
            }
            if (typeof termsCont[term] === 'number'){
                termsCont[term]++;
            } else {
                termsCont[term] = 1;
            }
            if (updateTotal) fieldObj.total++;
        },

        countFieldsTermsForExperiment : function(fields, exp){
            _.forEach(fields, function(f){ 
                var term = object.getNestedProperty(exp, f.field.replace('experiments_in_set.',''));
                BarPlot.countFieldTermForExperiment(f, term);
            });
        },

        combinedFieldTermsForExperiments : function(fields, experiments){
            var field;
            var fieldIndex;
            if (Array.isArray(fields)){ // Fields can be array or single field.
                fieldIndex = _.findIndex(fields, function(f){ return typeof f.childField !== 'undefined'; });
                field = fields[fieldIndex];
            } else {
                field = fields;
            }

            var fieldNames = _.pluck([field, field.childField], 'field');
            field.terms = _(field.terms).chain()
                .clone()
                .pairs()
                .map(function(term){
                    return [ 
                        term[0],
                        { 
                            'field' : field.childField.field, 
                            'cachedTotal' : term[1],
                            'total' : 0,
                            'term' : term[0],
                            'terms' : {} 
                        } 
                    ];
                })
                .object()
                .value();

            experiments.forEach(function(exp){
                var topLevelFieldTerm = object.getNestedProperty(exp, field.field.replace('experiments_in_set.',''));
                var nextLevelFieldTerm = object.getNestedProperty(exp, field.childField.field.replace('experiments_in_set.',''));
                BarPlot.countFieldTermForExperiment(field.terms[topLevelFieldTerm], nextLevelFieldTerm);
            });

            if (Array.isArray(fields)){
                fields[fieldIndex] = field; // Probably not needed as field already simply references fields[fieldIndex];
            }

            return fields;

        },

        partitionFields : function(fields, experiments){
            var topIndex = BarPlot.firstPopulatedFieldIndex(fields);
            if ((topIndex + 1) >= fields.length) return fields; // Cancel
            
            var nextIndex = BarPlot.firstPopulatedFieldIndex(fields, topIndex + 1);
            fields[topIndex].childField = fields[nextIndex];
            return BarPlot.combinedFieldTermsForExperiments(fields, experiments);
        },

        firstPopulatedFieldIndex : function(fields, start = 0){
            var topIndex = start;
            var numberOfTerms;

            // Go down list of fields until select field to display which has more than 1 term, or until last field.
            while (topIndex + 1 < fields.length){
                numberOfTerms = _.keys(fields[topIndex].terms).length;
                if (numberOfTerms > 1) break;
                topIndex++;
            }
            return topIndex;
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
            var topIndex = BarPlot.firstPopulatedFieldIndex(fields);
            var numberOfTerms = _.keys(fields[topIndex].terms).length;
            var largestExpCountForATerm = _.reduce(fields[topIndex].terms, function(m,t){
                return Math.max(m, typeof t === 'number' ? t : t.total);
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
                        var termCount = term[1];
                        var childBars = null;
                        if (typeof term[1] === 'object') termCount = term[1].total;
                        var barHeight = (
                            termCount / (
                                parent ? fieldObj.total : largestExpCountForATerm
                            )
                        ) * outerDims.height;
                        var barNode = {
                            'name' : termKey,
                            'term' : termKey,
                            'count' : termCount,
                            'field' : fieldObj.field,
                            'attr' : {
                                'width' : barWidth,
                                'height' : barHeight
                            }
                        };
                        if (typeof term[1] === 'object') {
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
                'fieldIndex' : topIndex,
                'bars'       : genBarData(fields[topIndex], insetDims),
                'fields'     : fields,
                'maxY'       : largestExpCountForATerm
            };

            return barData;
        },

        barDataToLegendData : function(barData, schemas = null){
            var fields = {};
            _.reduce(barData.bars, function(m,b){
                if (Array.isArray(b.bars)) return m.concat(b.bars);
                else {
                    m.push(b);
                    return m;
                }
            }, []).forEach(function(b){
                if (typeof fields[b.field] === 'undefined') fields[b.field] = { 'field' : b.field, 'terms' : {}, 'name' : Filters.Field.toName(b.field, schemas) };
                fields[b.field].terms[b.term] = { 'term' : b.term, 'name' : b.name || Filters.Term.toName(b.field, b.term), 'color' : vizUtil.colorForNode(b) };
            });
            fields = _.values(fields);
            fields.forEach(function(f){ f.terms = _.values(f.terms); });
            return fields;
        },

        /** Get default style options for chart. Should suffice most of the time. */
        getDefaultStyleOpts : function(){
            return {
                'gap' : 5,
                'maxBarWidth' : 60,
                'labelRotation' : 'auto',
                'labelWidth' : 200,
                'yAxisMaxHeight' : 100, // This will override labelWidth to set it to something that will fit at angle.
                'offset' : {
                    'top' : 30,
                    'bottom' : 0,
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
            'maxBarWidth'   : React.PropTypes.number,
            'labelRotation' : React.PropTypes.oneOf([React.PropTypes.number, React.PropTypes.string]),
            'labelWidth'    : React.PropTypes.oneOf([React.PropTypes.number, React.PropTypes.string]),
            'offset'        : React.PropTypes.shape({
                'top'           : React.PropTypes.number,
                'bottom'        : React.PropTypes.number,
                'left'          : React.PropTypes.number,
                'right'         : React.PropTypes.number
            })
        }),
        'colorForNode'  : React.PropTypes.func,
        'height'        : React.PropTypes.number,
        'width'         : React.PropTypes.number
    },
  
    getDefaultProps : function(){
        return {
            experiments : [],
            fields : [],
            styleOptions : null, // Can use to override default margins/style stuff.
            colorForNode : function(node){ return vizUtil.stringToColor((node.data || node).name); } // Default color determinator
        };
    },

    styleOptions : function(){ return vizUtil.extendStyleOptions(this.props.styleOptions, BarPlot.getDefaultStyleOpts()); },
  
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
            // Cancel out of transitioning state after delay. Delay is to allow new/removing elements to adjust opacity.
            setTimeout(()=>{
                this.setState({ transitioning : false });
            },750);
        }

        return;

        // THE BELOW IF BLOCK IS NO LONGER NECESSARY AS CONVERTED TO HTML ELEMS, KEEPING FOR IF NEEDED IN FUTURE.
        // shouldPerformManualTransitions WILL ALWAYS RETURN FALSE CURRENTLY.
        /*
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
                    _this.setState({ transitioning : false });
                    return;
                }
                
                // Since 'on end' callback is called many times (multiple bars transition), defer until called for each.
                var transitionCompleteCallback = _.after(existingAndCurrentElements.length, function(){
                    console.info("Finished D3 transitions on BarPlot.");
                    _this.setState({ transitioning : false });
                });

                d3.selectAll(existingAndCurrentElements)
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
        */
    },

    renderParts : {

        svg: {

            bar : function(d, index, all, styleOpts = null, existingBars = this.pastBars){
                var transitioning = this.state.transitioning; // Cache state.transitioning to avoid risk of race condition in ref function.

                if (!styleOpts) styleOpts = this.styleOptions();

                var prevBarExists = function(){ return typeof existingBars[d.term] !== 'undefined' && existingBars[d.term] !== null; };
                var prevBarData = null;
                if (prevBarExists() && transitioning) prevBarData = existingBars[d.term].__data__;

                /** Get transform (CSS style, or SVG attribute) for bar group. Positions bar's x coord via translate3d. */
                function transformStyle(){
                    var xyCoords;
                    if ((d.removing || !prevBarExists()) && transitioning){
                        // Defer to slide in new bar via CSS on state.transitioning = false.
                        xyCoords = [d.attr.x, d.attr.height];
                    } else {
                        // 'Default' (no transitioning) style
                        xyCoords = [d.attr.x, 0];
                    }
                    return vizUtil.style.translate3d.apply(this, xyCoords);
                }

                function barStyle(){
                    var style = {};

                    // Position bar's x coord via translate3d CSS property for CSS3 transitioning.
                    if ((d.removing || !prevBarExists()) && transitioning){
                        // Defer to slide in new bar via CSS on state.transitioning = false.
                        style.opacity = 0;
                    } else {
                        // 'Default' (no transitioning) style
                        style.opacity = 1;
                    }
                    style.transform = transformStyle.call(this);
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

        bar : function(d, index, all, styleOpts = null, existingBars = this.pastBars){

            var transitioning = this.state.transitioning; // Cache state.transitioning to avoid risk of race condition in ref function.
            if (!styleOpts) styleOpts = this.styleOptions();

            var prevBarData = null;
            if (d.existing && transitioning) prevBarData = existingBars[d.term].__data__;

            function barStyle(){
                var style = {};

                // Position bar's x coord via translate3d CSS property for CSS3 transitioning.
                if ((d.removing || !d.existing) && transitioning){
                    style.opacity = 0;
                    style.transform = vizUtil.style.translate3d(d.attr.x, Math.max(d.attr.height / 5, 10) + 10, 0);
                } else {
                    // 'Default' (no transitioning) style
                    style.opacity = 1;
                    style.transform = vizUtil.style.translate3d(d.attr.x,0,0);
                }
                style.left = styleOpts.offset.left;
                style.bottom = styleOpts.offset.bottom;
                style.width = d.attr.width;
                return style;
            }

            var barParts = Array.isArray(d.bars) ? d.bars.map(this.renderParts.barPart.bind(this)) : this.renderParts.barPart.call(this, d);

            return (
                <div
                    className={
                        "chart-bar no-highlight-color" + 
                        (
                            //d.attr.height > Math.max((this.height() - styleOpts.offset.bottom - styleOpts.offset.top) / 2, 30) ?
                            //' larger-height' : ''
                            ''
                        )
                    }
                    onMouseLeave={
                        Array.isArray(d.bars) && d.bars.length > 0 ?
                        function(e){
                            unhighlightTerms(d.bars[0].field);
                        } : null
                    }
                    data-term={d.term}
                    data-field={Array.isArray(d.bars) && d.bars.length > 0 ? d.bars[0].field : null}
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
                    <span className="bar-top-label" key="text-label">
                        { d.count }
                    </span>
                    { barParts }
                </div>
            );
        },

        barPart : function(d){
            
            var color = this.props.colorForNode(d);

            return (
                <div
                    className={"bar-part no-highlight-color" + (d.parent ? ' multiple-parts' : '')}
                    style={{
                        //top : rectY.call(this),
                        height : d.attr.height,
                        width: d.attr.width,
                        backgroundColor : color
                    }}
                    data-color={color}
                    data-target-height={d.attr.height}
                    key={'bar-part-' + (d.parent ? d.parent.term + '~' + d.term : d.term)}
                    data-term={d.parent ? d.term : null}
                    onMouseEnter={highlightTerm.bind(this, d.field, d.term, color)}
                >

                </div>
            );
        },

        bottomYAxis : function(availWidth, availHeight, currentBars, styleOpts){
            var _this = this;
            
            // We need to know label height to make use of this (to subtract from to get max labelWidth), which would be too much work (in browser calculation) given character size variance for most fonts to be performant.
            // var maxHypotenuse = styleOpts.yAxisMaxHeight * (1/Math.cos((Math.PI * 2) / (360 / styleOpts.labelRotation)));
            return (
                <div className="y-axis-bottom" style={{ 
                    left : styleOpts.offset.left, 
                    right : styleOpts.offset.right,
                    height : Math.max(styleOpts.offset.bottom - 5, 0),
                    bottom : Math.min(styleOpts.offset.bottom - 5, 0)
                }}>
                    { currentBars.map(function(bar){
                        return (
                            <div
                                key={'count-for-' + bar.term}
                                data-term={bar.term}
                                className="y-axis-label no-highlight-color"
                                style={{
                                    transform : vizUtil.style.translate3d(bar.attr.x, 5, 0),
                                    width : bar.attr.width,
                                    opacity : _this.state.transitioning && (bar.removing || !bar.existing) ? 0 : ''
                                }}
                            >
                            
                                <span className={"label-text" + (styleOpts.labelRotation === 'auto' ? ' auto-rotation' : '')} style={{
                                    width: typeof styleOpts.labelWidth === 'number' ? styleOpts.labelWidth : null,
                                    left:  0 - (
                                        (
                                            typeof styleOpts.labelWidth === 'number' ? styleOpts.labelWidth : bar.attr.width
                                        )
                                        - ((bar.attr.width / (90 / bar.attr.width) ))
                                    ),
                                    transform : vizUtil.style.rotate3d(
                                        typeof styleOpts.labelRotation === 'number' ? 
                                            styleOpts.labelRotation : 
                                                -(90 / (bar.attr.width * .1)), // If not set, rotate so 1 line will fit.
                                        'z'
                                    ), 
                                }}>
                                    { bar.name }
                                </span>
                            
                            </div>
                        );
                    }) }
                </div>
            );
        },

        leftAxis : function(availWidth, availHeight, barData, styleOpts){
            //console.log(barData);
            var chartHeight = availHeight - styleOpts.offset.top - styleOpts.offset.bottom;
            var chartWidth = availWidth - styleOpts.offset.left - styleOpts.offset.right;
            var ticks = d3.ticks(0, barData.maxY * ((chartHeight - 10)/chartHeight), Math.min(8, barData.maxY)).concat([barData.maxY]);
            //console.log(ticks);
            var steps = ticks.map(function(v,i){
                var w = (
                    Math.min(
                        (barData.bars.filter(function(b){
                            return b.count >= v - ((ticks[1] - ticks[0]) * 2);
                        }).length) * Math.min(styleOpts.maxBarWidth + styleOpts.gap, chartWidth / barData.bars.length) + (styleOpts.maxBarWidth * .66),
                        chartWidth
                    )
                );
                return (
                    <div className={"axis-step" + (i >= ticks.length - 1 ? ' last' : '')} style={{
                        position : 'absolute',
                        left: 0,
                        right: 0,
                        bottom : (v / barData.maxY) * chartHeight - 1,
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

    },

    render : function(){
        if (this.state.mounted === false) return <div ref="container"></div>;

        var availHeight = this.height(),
            availWidth = this.width(),
            styleOpts = this.styleOptions();

        // Reset this.bars, cache past ones.
        this.pastBars = _.clone(this.bars); // Difference between current and pastBars used to determine which bars to do D3 transitions on (if any).
        this.bars = {}; // ref to 'g' element is stored here.

        var barData = BarPlot.genChartBarDims( // Gen bar dimensions (width, height, x/y coords). Returns { fieldIndex, bars, fields (first arg supplied) }
            BarPlot.genChartData( // Get counts by term per field.
                this.props.experiments,
                this.props.fields,
                'experiments'
            ),
            availWidth,
            availHeight,
            this.styleOptions()
        );

        console.log('BARDATA', barData);

        // Bars from current dataset/filters only.
        var currentBars = barData.bars.map((d)=>{
            // Determine whether bar existed before, for this.renderParts.bar render func.
            return _.extend(d, { 
                'existing' : typeof this.pastBars[d.term] !== 'undefined' && this.pastBars[d.term] !== null
            });
        });

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
        var barComponents = allBars
            .sort(function(a,b){ return a.term < b.term ? -1 : 1; })
            .map((d,i,a) => this.renderParts.bar.call(this, d, i, a, styleOpts, this.pastBars));

        return (
            <div
                className="bar-plot-chart chart-container"
                key="container"
                ref="container"
                data-field={this.props.fields[barData.fieldIndex].field}
                style={{ height : availHeight, width: availWidth }}
            >
                { this.renderParts.leftAxis.call(this, availWidth, availHeight, barData, styleOpts) }
                { barComponents }
                { this.renderParts.bottomYAxis.call(this, availWidth, availHeight, allBars, styleOpts) }
                <Legend fields={BarPlot.barDataToLegendData(barData, this.props.schemas || null)} title={
                    <div>
                        <h5 className="text-400 legend-title">
                            { Filters.Field.toName(barData.fields[barData.fieldIndex].field, this.props.schemas) } <small>x</small>
                        </h5>
                    </div>
                } />
            </div>
        );
        /*
        // Keep in mind that 0,0 coordinate is located at top left for SVGs.
        // Easier to reason in terms of 0,0 being bottom left, thus e.g. d.attr.y for bars is set to be positive,
        // so we need to flip it via like availHeight - y in render function(s).
  	    return (
            <svg ref="container" key="svg-container" className="bar-plot-chart" data-field={this.props.fields[barData.fieldIndex].field} style={{
                'height' : availHeight,
                'width' : availWidth
            }}>
                { this.renderParts.svg.topYAxis.call(this, availWidth, styleOpts) }
                { barComponents }
                { this.renderParts.svg.bottomYAxis.call(this, availWidth, availHeight, currentBars, styleOpts) }
            </svg>
        );
        */
    }
});

module.exports = BarPlot;

