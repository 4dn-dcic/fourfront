'use strict';

/** @ignore */
var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var vizUtil = require('./../utilities');
var { RotatedLabel } = require('./../components');
var ChartDetailCursor = require('./../ChartDetailCursor');
var { console, object, isServerSide, expFxn, Filters, layout } = require('./../../util');
var { unhighlightTerms, highlightTerm } = require('./../../facetlist');
var aggregationFxn = require('./aggregation-functions');


var Chart = module.exports = React.createClass({

    statics : {

        /**
         * Outputs a section of a bar.
         * 
         * @memberof module:viz/BarPlot.Chart
         * @namespace
         * @type {Component}
         */
        BarSection : React.createClass({

            statics : {

                /**
                 * Check if 'node' is currently selected.
                 * 
                 * @memberof module:viz/BarPlot.Chart.BarSection
                 * @public
                 * @static
                 * @param {Object} node - A 'node' containing at least 'field', 'term', and 'parent' if applicable.
                 * @param {string} selectedBarSectionTerm - Currently selected subdivision field term.
                 * @param {string} selectedBarSectionParentTerm - Currently selected X-Axis field term.
                 * @returns {boolean} True if node (and node.parent, if applicable) matches selectedBarSectionTerm & selectedBarSectionParentTerm.
                 */
                isSelected : function(node, selectedBarSectionTerm, selectedBarSectionParentTerm){
                    if (
                        node.term === selectedBarSectionTerm && (
                            ((node.parent && node.parent.term) || null) === (selectedBarSectionParentTerm || null)
                        )
                    ) return true;
                    return false;
                },

            },

            /**
             * Check if component (aka props.node) is selected.
             * Calls Chart.BarSection.isSelected(..) internally.
             * 
             * @instance
             * @memberof module:viz/BarPlot.Chart.BarSection
             * @returns {boolean} - True if selected.
             */
            isSelected : function(){
                return Chart.BarSection.isSelected(this.props.node, this.props.selectedBarSectionTerm, this.props.selectedBarSectionParentTerm);
            },

            isHoveredOver : function(){
                return Chart.BarSection.isSelected(this.props.node, this.props.hoverBarSectionTerm, this.props.hoverBarSectionParentTerm);
            },

            getInitialState : function(){
                return {
                    'hover' : false
                };
            },

            /**
             * @instance
             * @memberof module:viz/BarPlot.Chart.BarSection
             * @returns {Element} - A div element representing a bar section.
             */
            render : function(){
                var d               = this.props.node;
                var color           = vizUtil.colorForNode(d);
                var isSelected      = this.isSelected(),
                    isHoveredOver   = this.isHoveredOver();
                
                return (
                    <div
                        className={
                            "bar-part no-highlight" + (d.parent ? ' multiple-parts' : '')
                            + (isSelected ? ' selected' : '') + (isHoveredOver ? ' hover' : '')
                        }
                        style={{
                            //top : rectY.call(this),
                            height : d.attr.height,
                            width: (d.parent || d).attr.width,
                            backgroundColor : color,
                            outlineColor : (this.isHoveredOver() || isSelected) ? d3.color(color).darker(1) : null
                        }}
                        data-color={color}
                        data-target-height={d.attr.height}
                        key={'bar-part-' + (d.parent ? d.parent.term + '~' + d.term : d.term)}
                        data-term={d.parent ? d.term : null}
                        onMouseEnter={(e)=>{
                            //this.setState({'hover' : true});
                            if (typeof this.props.onMouseEnter === 'function') this.props.onMouseEnter(d, e);
                        }}
                        onMouseLeave={(e)=>{
                            //this.setState({'hover' : false});
                            if (typeof this.props.onMouseLeave === 'function') this.props.onMouseLeave(d, e);
                        }}
                        onClick={(e)=>{
                            if (typeof this.props.onClick === 'function') this.props.onClick(d, e);
                        }}
                    />
                );
            },

        }),

        /**
         * Outputs a vertical bar containing bar sections.
         * 
         * @memberof module:viz/BarPlot.Chart
         * @namespace
         * @type {Component}
         */
        Bar : React.createClass({

            barStyle : function(){
                var style = {};
                var d = this.props.node;
                var styleOpts = this.props.styleOptions;

                // Position bar's x coord via translate3d CSS property for CSS3 transitioning.
                if ((d.removing || !d.existing) && this.props.transitioning){
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

                //if (
                //    ( this.props.hoverBarSectionParentTerm    || this.props.hoverBarSectionTerm    ) === d.term ||
                //    ( this.props.selectedBarSectionParentTerm || this.props.selectedBarSectionTerm ) === d.term
                //){
                    // Set style.outlineColor here or something.
                //}
                return style;
            },

            renderBarSection : function(d,i){
                return (
                    <Chart.BarSection
                        key={d.term || i}
                        node={d}
                        onClick={this.props.onBarPartClick}
                        onMouseEnter={this.props.onBarPartMouseEnter}
                        onMouseLeave={this.props.onBarPartMouseLeave}
                        aggregateType={this.props.aggregateType}
                        selectedBarSectionParentTerm={this.props.selectedBarSectionParentTerm}
                        selectedBarSectionTerm={this.props.selectedBarSectionTerm}
                        hoverBarSectionParentTerm={this.props.hoverBarSectionParentTerm}
                        hoverBarSectionTerm={this.props.hoverBarSectionTerm}
                    />
                );
            },

            render : function(){
                var d = this.props.node;

                var transitioning = this.props.transitioning; // Cache state.transitioning to avoid risk of race condition in ref function.
                var styleOpts = this.props.styleOptions;

                var prevBarData = null;
                if (d.existing && transitioning) prevBarData = this.props.existingBars[d.term].__data__;

                return (
                    <div
                        className="chart-bar no-highlight"
                        onMouseLeave={()=>{
                            if (Array.isArray(d.bars) && d.bars.length > 0) unhighlightTerms(d.bars[0].field);
                        }}
                        data-term={d.term}
                        data-field={Array.isArray(d.bars) && d.bars.length > 0 ? d.bars[0].field : null}
                        key={"bar-" + d.term}
                        style={this.barStyle()}
                        ref={(r) => {
                            if (typeof this.bars !== 'undefined' && r !== null){
                                // Save bar element; set its data w/ D3 but don't save D3 wrapped-version
                                d3.select(r).datum(d);
                                if (!(d.removing && !transitioning)) this.bars[d.term] = r;
                            }
                        }}
                    >
                        { !this.props.isFilteredExperiments ?
                        <span className="bar-top-label" key="text-label">
                            { d.count }
                        </span>
                        : null }
                        {
                            Array.isArray(d.bars) ? 
                                _.sortBy(d.bars, 'term').map(this.renderBarSection)
                                :
                                this.renderBarSection(_.extend({}, d, { color : 'rgb(139, 114, 142)' }))
                        }
                    </div>
                );
            }

        }),

        /**
         * Encapsulates the chart output and provides state for currently- selected and currently- hovered-over node.
         * 
         * @memberof module:viz/BarPlot.Chart
         * @namespace
         * @type {Component}
         */
        ViewContainer : React.createClass({

            getInitialState : function(){
                return {
                    'selectedBarSectionParentTerm' : null,
                    'selectedBarSectionTerm' : null,
                    'hoverBarSectionTerm' : null,
                    'hoverBarSectionParentTerm' : null
                };
            },

            handleClickAnywhere : function(evt){
                console.log(evt.target);
                if (ChartDetailCursor.isTargetDetailCursor(evt.target)){
                    console.log("DETAIL CURSOR WOOO");
                    return false;
                }

                this.setState({
                    'selectedBarSectionParentTerm' : null,
                    'selectedBarSectionTerm' : null
                });
            },

            /**
             * Important lifecycle method.
             * Checks if a selected bar section (via state.selectedBarSectionTerm) has been set or unset.
             * Then passes that to the ChartDetailCursor's 'sticky' state.
             * 
             * Also enables or disables a 'click' event listener to cancel out stickiness/selected section.
             * 
             * @private
             * @instance
             * @param {Object} pastProps - Previous props of this component.
             * @param {Object} pastState - Previous state of this component.
             */
            componentDidUpdate : function(pastProps, pastState){
                if (pastState.selectedBarSectionTerm !== this.state.selectedBarSectionTerm){
                    
                    // If we now have a selected bar section, enable click listener.
                    // Otherwise, disable it.
                    // And set ChartDetailCursor to be 'stickied'. This is the only place where the ChartDetailCursor state should be updated.
                    if (typeof this.state.selectedBarSectionTerm === 'string'){
                        ChartDetailCursor.update({ 'sticky' : true });
                        setTimeout(window.addEventListener, 100, 'click', this.handleClickAnywhere);
                        //window.addEventListener('click', this.handleClickAnywhere);
                    } else {
                        window.removeEventListener('click', this.handleClickAnywhere);
                        if (!this.state.hoverBarSectionTerm){
                            ChartDetailCursor.reset();
                        } else {
                            ChartDetailCursor.update({ 'sticky' : false });
                        }
                    }

                }
            },

            adjustedChildren : function(){
                return React.Children.map(this.props.children, (child)=>{
                    var oldOnClickFxn = child && child.props && child.props.onBarPartClick;
                    var oldOnMouseEnterFxn = child && child.props && child.props.onBarPartMouseEnter;
                    var oldOnMouseLeaveFxn = child && child.props && child.props.onBarPartMouseLeave;
                    return React.cloneElement(child, {
                        'styleOptions' : this.props.styleOptions,

                        // State
                        'selectedBarSectionParentTerm' : this.state.selectedBarSectionParentTerm,
                        'selectedBarSectionTerm' : this.state.selectedBarSectionTerm,
                        'hoverBarSectionParentTerm' : this.state.hoverBarSectionParentTerm,
                        'hoverBarSectionTerm' : this.state.hoverBarSectionTerm,

                        // Add to bar section onMouseEnter/onMouseLeave/onClick functions
                        'onBarPartMouseEnter' : (node, evt)=>{

                            // Cancel if same node as selected.
                            if (Chart.BarSection.isSelected(node, this.state.selectedBarSectionTerm, this.state.selectedBarSectionParentTerm)){
                                return false;
                            }


                            var newCursorDetailState = {
                                'path' : [],
                                'includeTitleDescendentPrefix' : false,
                            };
                            
                            if (node.parent) newCursorDetailState.path.push(node.parent);
                            if (typeof this.props.aggregateType === 'string') {
                                newCursorDetailState.primaryCount = this.props.aggregateType;
                            }
                            newCursorDetailState.path.push(node);
                            ChartDetailCursor.update(newCursorDetailState);


                            var newOwnState = {};

                            // Unset selected nodes.
                            if (this.state.selectedBarSectionTerm !== null){
                                _.extend(newOwnState, {
                                    'selectedBarSectionTerm' : null,
                                    'selectedBarSectionParentTerm' : null
                                });
                            }

                            // Update hover state
                            _.extend(newOwnState, {
                                'hoverBarSectionTerm' : node.term || null,
                                'hoverBarSectionParentTerm' : (node.parent && node.parent.term) || null
                            });

                            if (_.keys(newOwnState).length > 0){
                                this.setState(newOwnState);
                            }

                            highlightTerm(node.field, node.term, node.color || vizUtil.colorForNode(node));

                            if (typeof oldOnMouseEnterFxn === 'function') return oldOnMouseEnterFxn(node, evt);
                        },
                        'onBarPartMouseLeave' : (node, evt)=>{

                            // Update hover state
                            this.setState({
                                'hoverBarSectionTerm' : null,
                                'hoverBarSectionParentTerm' : null
                            });

                            if (!ChartDetailCursor.isTargetDetailCursor(evt.relatedTarget)){
                                ChartDetailCursor.reset(false);
                            }

                            if (typeof oldOnMouseLeaveFxn === 'function') return oldOnMouseLeaveFxn(node, evt);
                        },
                        'onBarPartClick' : (node, evt)=>{
                            if (Chart.BarSection.isSelected(node, this.state.selectedBarSectionTerm, this.state.selectedBarSectionParentTerm)){
                                this.setState({
                                    'selectedBarSectionTerm' : null,
                                    'selectedBarSectionParentTerm' : null
                                });
                            } else {
                                this.setState({
                                    'selectedBarSectionTerm' : node.term || null,
                                    'selectedBarSectionParentTerm' : (node.parent && node.parent.term) || null
                                });
                            }
                            if (typeof oldOnClickFxn === 'function') return oldOnClickFxn(node, evt);
                            return false;
                        } 
                    });
                });
            },

            render: function(){
                return (
                    <div
                        className="bar-plot-chart chart-container no-highlight"
                        data-field={this.props.topLevelField}
                        style={{ height : this.props.height, width: this.props.width }}
                    >
                        { this.props.leftAxis }
                        {/* allExpsBarDataContainer && allExpsBarDataContainer.component */}
                        { this.adjustedChildren() }
                        { this.props.bottomAxis }
                    </div>
                );

            }
            
        }),

        /** 
         * Return an object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally. 
         *
         * @memberof module:viz/BarPlotChart
         * @static
         * @public
         * @param {Object[]} fields - Array of fields (i.e. from props.fields) which contain counts by term and total added through @see aggregationFxn.genChartData().
         * @param {Object} fields.terms - Object keyed by possible term for field, with value being count of term occurences in [props.]experiments passed to genChartData.
         * @param {number} fields.total - Count of total experiments for which this field is applicable.
         * @param {number} [availWidth=400] - Available width, in pixels, for chart.
         * @param {number} [availHeight=400] - Available width, in pixels, for chart.
         * @param {Object} [styleOpts=Chart.getDefaultStyleOpts()] - Style settings for chart which may contain chart offsets (for axes).
         * @param {boolean} [useOnlyPopulatedFields=false] - Determine which fields to show via checking for which fields have multiple terms present.
         * @param {number} [maxValue] - Maximum y-axis value. Overrides height of bars.
         * 
         * @return {Object} Object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally.
         */
        genChartBarDims : function(
            fields,
            availWidth = 400,
            availHeight = 400,
            styleOpts = Chart.getDefaultStyleOpts(),
            aggregateType = 'experiment_sets',
            useOnlyPopulatedFields = false,
            maxValue = null
        ){

            var topIndex = 0;

            if (useOnlyPopulatedFields) {
                topIndex = aggregationFxn.firstPopulatedFieldIndex(fields);
            }
            
            var numberOfTerms = _.keys(fields[topIndex].terms).length;
            var largestExpCountForATerm = typeof maxValue === 'number' ?
                maxValue
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
                            'name' : termKey,
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
                'fieldIndex' : topIndex,
                'bars'       : genBarData(fields[topIndex], insetDims),
                'fields'     : fields,
                'maxY'       : largestExpCountForATerm
            };

            return barData;
        },

        /**
         * Deprecated. Convert barData to array of field objects to be consumed by Legend React component.
         * 
         * @static
         * @deprecated
         * @param {Object} barData - Data representing bars and their subdivisions.
         * @param {Object} [schemas=null] - Schemas to get field names from.
         * @returns {Array} - Fields with terms and colors for those terms.
         */
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
                fields[b.field].terms[b.term] = { 'term' : b.term, 'name' : b.name || Filters.Term.toName(b.field, b.term), 'color' : vizUtil.colorForNode(b, true) };
            });
            fields = _.values(fields);
            fields.forEach(function(f){ f.terms = _.values(f.terms); });
            return fields;
        },

        /**
         * @returns {Object} Default style options for chart. Should suffice most of the time.
         */
        getDefaultStyleOpts : function(){
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
    },

    /** @ignore */
    getInitialState : function(){
        return { 'mounted' : false };
    },
  
    /** @ignore */
    componentDidMount : function(){
        this.bars = {}; // Save currently-visible bar refs to this object to check if bar exists already or not on re-renders for better transitions.
        this.setState({ 'mounted' : true });
    },

    /** 
     * @prop {Object[]} experiments - List of all experiments, with at least fields needed to aggregate by embedded.
     * @prop {Object[]} filteredExperiments - List of selected experiments, with at least fields needed to aggregate by embedded.
     * @prop {Object[]} fields - List of at least one field objects, each containing at least 'field' property in object-dot-notation.
     * @prop {string} fields.field - Field, in <code>object.dot.notation</code>.
     * @prop {string} fields.name - Name of field.
     */
    propTypes : {
        'experiments'   : React.PropTypes.array,
        'filteredExperiments' : React.PropTypes.array,
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
        'height'        : React.PropTypes.number,
        'width'         : React.PropTypes.number
    },
  
    /** @ignore */
    getDefaultProps : function(){
        return {
            'experiments' : [],
            'fields' : [],
            'useOnlyPopulatedFields' : false,
            'showType' : 'both',
            'aggregateType' : 'experiments',
            'styleOptions' : null, // Can use to override default margins/style stuff.
        };
    },

    /** 
     * Gets style options for BarPlotChart instance. Internally, extends BarPlotChart.getDefaultStyleOpts() with props.styleOptions.
     * @instance
     * @returns {Object} Style options object.
     */
    styleOptions : function(){ return vizUtil.extendStyleOptions(this.props.styleOptions, Chart.getDefaultStyleOpts()); },
  
    /**
     * @instance
     * @returns props.width or width of refs.container, if mounted.
     */
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

    /**
     * @instance
     * @returns props.height or height of refs.container, if mounted.
     */
    height : function(){
        if (this.props.height) return this.props.height;
        if (!this.refs.container) return null;
        return this.refs.container.parentElement.clientHeight;
    },

    /** @ignore */
    shouldPerformManualTransitions : function(nextProps, pastProps){
        return !!(
            !_.isEqual(pastProps.experiments, nextProps.experiments) ||
            pastProps.height !== nextProps.height ||
            !_.isEqual(pastProps.filteredExperiments, nextProps.filteredExperiments)
        );
    },

    /**
     * @deprecated
     * @instance
     * @ignore
     */
    componentWillReceiveProps : function(nextProps){
        /*
        if (this.shouldPerformManualTransitions(nextProps, this.props)){
            console.log('WILL DO SLOW TRANSITION');
            this.setState({ transitioning : true });
        }
        */
    },

    /**
     * @deprecated
     * @instance
     * @ignore
     */
    componentDidUpdate : function(pastProps){

        /*
        if (this.shouldPerformManualTransitions(this.props, pastProps)){
            // Cancel out of transitioning state after delay. Delay is to allow new/removing elements to adjust opacity.
            setTimeout(()=>{
                this.setState({ transitioning : false });
            },750);
        }
        */

        return;

        // THE BELOW IF BLOCK IS NO LONGER NECESSARY AS CONVERTED TO HTML ELEMS, KEEPING FOR IF NEEDED IN FUTURE.
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

    /**
     * Call this function, e.g. through refs, to grab fields and terms for a/the Legend component.
     * Internally, runs BarPlotChart.barDataToLegendData().
     * 
     * @deprecated
     * @instance
     * @see module:viz/BarPlotChart.barDataToLegendData
     * @returns {Array|null} List of fields containing terms. For use by legend component.
     */
    getLegendData : function(){
        if (!this.barData) return null;
        return Chart.barDataToLegendData(this.barData, this.props.schemas || null);
    },

    /**
     * Get the for-bar-filled field object used for the X axis.
     * 
     * @instance
     * @returns {Object} Top-level field containing terms.
     */
    getTopLevelField : function(){
        if (!this.barData) return null;
        return this.barData.fields[this.barData.fieldIndex].field;
    },

    /** @ignore */
    renderParts : {

        /** @ignore */
        svg: {

            bar : function(d, index, all, styleOpts = null, existingBars = this.pastBars){
                var transitioning = this.state.transitioning; // Cache state.transitioning to avoid risk of race condition in ref function.
                if (!styleOpts) styleOpts = this.styleOptions();

                var prevBarExists = function(){ return typeof existingBars[d.term] !== 'undefined' && existingBars[d.term] !== null; };
                var prevBarData = null;
                if (prevBarExists() && transitioning) prevBarData = existingBars[d.term].__data__;

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
                                fill : vizUtil.colorForNode(d)
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

            bottomXAxis : function(availWidth, availHeight, currentBars, styleOpts){
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
                                opacity : _this.state.transitioning && (b.removing || !b.existing) ? 0 : '',
                                color : vizUtil.colorForNode(b, true, null, null, true)
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
            var ticks = d3.ticks(0, barData.maxY * ((chartHeight - 10)/chartHeight), Math.min(8, barData.maxY)).concat([barData.maxY]);
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

    /**
     * Used to help generate "highlighted" selected bars against the output of this: the "all experiments" bars silhoutte.
     * Used conditionally in BarPlotChart.render to render clones of the BarChart behind the primary bars,
     * using 'all experiments' data instead of the 'filtered' or 'selected' experiments.
     * 
     * @instance
     * @param {number} width - Width of available chart drawing area.
     * @param {number} height - Height of available chart drawing area.
     * @param {Object} [styleOpts] - Style options for the chart, including gap between bars, maximum bar width, etc.
     * @returns {Object} "All Experiments" bars silhouttes, wrapped in an object also containing barData for all experiments.
     * @see module:viz/BarPlotChart.render
     * @see module:viz/BarPlotChart.genChartData
     */
    renderAllExperimentsSilhouette : function(width, height, styleOpts = null){
        if (!this.props.filteredExperiments) return null;
        if (!styleOpts) styleOpts = this.styleOptions();

        var allExperimentsBarData = Chart.genChartBarDims( // Gen bar dimensions (width, height, x/y coords). Returns { fieldIndex, bars, fields (first arg supplied) }
            aggregationFxn.genChartData( // Get counts by term per field.
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
        
        
    },

    /** 
     * Parses props.experiments and/or props.filterExperiments, depending on props.showType, aggregates experiments into fields,
     * generates data for chart bars, and then draws and returns chart wrapped in a div React element.
     * 
     * @instance
     * @returns {React.Element} - Chart markup wrapped in a div.
     */
    render : function(){
        if (this.state.mounted === false) return <div ref="container"></div>;

        var availHeight = this.height(),
            availWidth = this.width(),
            styleOpts = this.styleOptions();

        // Reset this.bars, cache past ones.
        this.pastBars = _.clone(this.bars); // Difference between current and pastBars used to determine which bars to do D3 transitions on (if any).
        this.bars = {}; // ref to 'g' element is stored here.
        var allExpsBarDataContainer = null;
        /*
        if (
            this.props.filteredExperiments && this.props.showType === 'both'
        ){
            allExpsBarDataContainer = this.renderAllExperimentsSilhouette(availWidth, availHeight, styleOpts);
        }
        */

        var chartData = this.props.aggregatedData || aggregationFxn.genChartData( // Get counts by term per field.
            (
                this.props.showType === 'all' ?
                this.props.experiments : this.props.filteredExperiments || this.props.experiments
            ),
            this.props.fields,
            this.props.aggregateType,
            'experiments',
            this.props.useOnlyPopulatedFields
        );

        this.barData = Chart.genChartBarDims( // Gen bar dimensions (width, height, x/y coords). Returns { fieldIndex, bars, fields (first arg supplied) }
            chartData,
            availWidth,
            availHeight,
            styleOpts,
            this.props.aggregateType,
            this.props.useOnlyPopulatedFields,
            allExpsBarDataContainer && allExpsBarDataContainer.data && allExpsBarDataContainer.data.maxY
        );

        console.log('BARDATA', this.props.showType, this.barData);

        // Bars from current dataset/filters only.
        var currentBars = this.barData.bars.map((d)=>{
            // Determine whether bar existed before, for this.renderParts.bar render func.
            return _.extend(d, { 
                'existing' : typeof this.pastBars[d.term] !== 'undefined' && this.pastBars[d.term] !== null
            });
        });

        var allBars = currentBars; // All bars -- current (from barData) and those which now need to be removed if transitioning (see block below).

        // If transitioning, get D3 datums of existing bars which need to transition out and add removing=true property to inform this.renderParts.bar.
        if (this.state.transitioning){
            var barsToRemove = _.difference(  _.keys(this.pastBars),  _.pluck(this.barData.bars, 'term')).map((barTerm) => {
                return _.extend(this.pastBars[barTerm].__data__, { 'removing' : true });
            });
            allBars = barsToRemove.concat(currentBars);
        }

        // The sort below only helps maintain order in which is processed thru renderParts.bar(), not order of bars shown.
        // This is to help React's keying algo adjust existing bars rather than un/remount them.
        allBars = allBars.sort(function(a,b){ return a.term < b.term ? -1 : 1; });

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

        return (
            <Chart.ViewContainer
                leftAxis={this.renderParts.leftAxis.call(this, availWidth, availHeight, this.barData, styleOpts)}
                bottomAxis={this.renderParts.bottomXAxis.call(this, availWidth, availHeight, allBars, styleOpts)}
                topLevelField={this.props.fields[this.barData.fieldIndex].field}
                width={availWidth} height={availHeight}
                styleOptions={styleOpts}
            >{ allBars.map((d,i,a) => 
                <Chart.Bar
                    key={d.term || i}
                    node={d}
                    isFilteredExperiments={!!allExpsBarDataContainer}
                    existingBars={this.pastBars}
                    transitioning={this.state.transitioning}
                />
            )}</Chart.ViewContainer>
        );

    }
});
