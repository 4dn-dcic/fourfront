'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var store = require('./../../../store');
var vizUtil = require('./../utilities');
var ChartDetailCursor = require('./../ChartDetailCursor');
var { console, object, isServerSide, expFxn, Filters, layout, navigate } = require('./../../util');
var { unhighlightTerms, highlightTerm } = require('./../../facetlist');

var ViewContainer = module.exports = React.createClass({

        statics : {

        /**
         * Outputs a section of a bar.
         * 
         * @memberof module:viz/BarPlot.ViewContainer
         * @namespace
         * @type {Component}
         */
        BarSection : React.createClass({

            statics : {

                /**
                 * Check if 'node' is currently selected.
                 * 
                 * @memberof module:viz/BarPlot.ViewContainer.BarSection
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
             * Calls ViewContainer.BarSection.isSelected(..) internally.
             * 
             * @instance
             * @memberof module:viz/BarPlot.ViewContainer.BarSection
             * @returns {boolean} - True if selected.
             */
            isSelected : function(){
                return ViewContainer.BarSection.isSelected(this.props.node, this.props.selectedBarSectionTerm, this.props.selectedBarSectionParentTerm);
            },

            isHoveredOver : function(){
                return ViewContainer.BarSection.isSelected(this.props.node, this.props.hoverBarSectionTerm, this.props.hoverBarSectionParentTerm);
            },

            getInitialState : function(){
                return {
                    'hover' : false
                };
            },

            /**
             * @instance
             * @memberof module:viz/BarPlot.ViewContainer.BarSection
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
         * @memberof module:viz/BarPlot.ViewContainer
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
                    <ViewContainer.BarSection
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
                            else unhighlightTerms(d.field);
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

    },

    getInitialState : function(){
        return {
            'selectedBarSectionParentTerm' : null,
            'selectedBarSectionTerm' : null,
            'hoverBarSectionTerm' : null,
            'hoverBarSectionParentTerm' : null
        };
    },

    cursorDetailActions : function(){
        return [
            {
                'title' : function(cursorProps){
                    if (navigate.isBrowseHref(cursorProps.href)){
                        //return "Browse " + _.pluck(cursorProps.path, 'term').join(' & ') + " Experiment Sets";
                        return "Explore these Experiment Sets";
                    }
                    return "Browse these Experiment Sets";
                },
                'function' : (cursorProps, mouseEvt) => {
                    console.log('I got clciked.');
                    console.log(navigate, cursorProps, this.props);

                    //var node = cursorProps.path.slice(0).pop();
                    //console.log(node);

                    var href = (cursorProps.href && navigate.getBrowseHref(cursorProps.href)) || null;

                    // Reset existing filters if selecting from 'all' view. Preserve if from filtered view.
                    var currentExpSetFilters = this.props.showType === 'all' ? {} : Filters.currentExpSetFilters();

                    Filters.saveChangedFilters(
                        _.reduce(cursorProps.path, function(expSetFilters, node){
                            // Do not change filter IF SET ALREADY because we want to strictly enable filters, not disable any.
                            if (
                                expSetFilters && expSetFilters[node.field] &&
                                expSetFilters[node.field].has(node.term)
                            ){
                                return expSetFilters;
                            }
                            return Filters.changeFilter(
                                node.field,
                                node.term,
                                'sets',             // If 'sets', skips checking if field starts with 'experiments_in_set' and adding if not.
                                expSetFilters,      // Existing expSetFilters, if null they're retrieved from Redux store.
                                null,               // Callback
                                true,               // Only return new expSetFilters vs saving them == set to TRUE
                            );
                        }, currentExpSetFilters),
                        true,
                        href
                    );

                    //console.log(newExpSetFilters);
                    

                    /*
                    return Filters.changeFilter(
                        field,
                        term,
                        this.props.experimentsOrSets,
                        this.props.expSetFilters,
                        callback,
                        false,      // Only return new expSetFilters vs saving them == set to false
                        this.props.useAjax,
                        //this.props.href
                    );
                    */
                    

                },
                'disabled' : (cursorProps)=>{
                    var expSetFilters = store.getState().expSetFilters;

                    if (expSetFilters && typeof expSetFilters === 'object'){
                        if (
                            Array.isArray(cursorProps.path) &&
                            (cursorProps.path[0] && cursorProps.path[0].field) &&
                            expSetFilters[cursorProps.path[0].field] instanceof Set &&
                            expSetFilters[cursorProps.path[0].field].has(cursorProps.path[0].term) &&
                            (
                                !cursorProps.path[1] || (
                                    cursorProps.path[1].field &&
                                    expSetFilters[cursorProps.path[1].field] instanceof Set &&
                                    expSetFilters[cursorProps.path[1].field].has(cursorProps.path[1].term)
                                )
                            )
                        ) return true;
                    }
                    return false;
                }
            }
        ];
    },

    handleClickAnywhere : function(evt){
        // Don't do anything if clicked on DetailCursor.
        if (ChartDetailCursor.isTargetDetailCursor(evt.target)){
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
                    if (ViewContainer.BarSection.isSelected(node, this.state.selectedBarSectionTerm, this.state.selectedBarSectionParentTerm)){
                        return false;
                    }


                    var newCursorDetailState = {
                        'path' : [],
                        'includeTitleDescendentPrefix' : false,
                        'actions' : this.props.actions || this.cursorDetailActions() || null
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
                    if (ViewContainer.BarSection.isSelected(node, this.state.selectedBarSectionTerm, this.state.selectedBarSectionParentTerm)){
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

});

