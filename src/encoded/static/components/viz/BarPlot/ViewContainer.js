'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var store = require('./../../../store');
var vizUtil = require('./../utilities');
var ChartDetailCursor = require('./../ChartDetailCursor');
var { console, object, isServerSide, expFxn, Filters, layout, navigate } = require('./../../util');
var { unhighlightTerms, highlightTerm } = require('./../../facetlist');

// Used for transitioning
var cachedBars = {},
    cachedPastBars = {},
    cachedBarSections = {},
    cachedPastBarSections = {};

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
                            height : this.props.isNew || this.props.isRemoving ? 0 : d.attr.height,
                            //width: '100%', //(this.props.isNew && d.pastWidth) || (d.parent || d).attr.width,
                            backgroundColor : color,
                            
                        }}
                        ref={(r)=>{
                            if (this.props.isNew) setTimeout(function(){
                                vizUtil.requestAnimationFrame(function(){
                                    r.style.height = d.attr.height + 'px';
                                });
                            }, 0);
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
                if ((d.removing) && this.props.transitioning){
                    style.opacity = 0;
                    style.transform = vizUtil.style.translate3d(d.attr.x, 0, 0);
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
                var parentBarTerm = (d.parent || d).term;
                cachedBarSections[parentBarTerm][d.term] = d;
                var isNew = false;
                if (this.props.transitioning && (!cachedPastBarSections[parentBarTerm] || !cachedPastBarSections[parentBarTerm][d.term])){
                    isNew = true;
                }

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
                        isNew={isNew}
                        isRemoving={d.removing}
                    />
                );
            },

            render : function(){
                var d = this.props.node;

                var transitioning = this.props.transitioning; // Cache state.transitioning to avoid risk of race condition in ref function.
                var styleOpts = this.props.styleOptions;

                var prevBarData = null;
                if (d.existing && transitioning && cachedPastBars) prevBarData = cachedPastBars[d.term].__data__;

                if (!cachedBarSections[d.term]) cachedBarSections[d.term] = {};

                var barSections = Array.isArray(d.bars) ? d.bars : [_.extend({}, d, { color : 'rgb(139, 114, 142)' })];

                // If transitioning, add existing bar sections to fade out.
                if (this.props.transitioning && cachedPastBarSections[d.term]) barSections = barSections.concat(
                    _.filter(_.pairs(cachedPastBarSections[d.term]), function(pastNodePair){
                        if (
                            _.filter(barSections, function(barNode){ // Find existing bars out of current barSections, set them to have existing : true.
                                //if (typeof barNode.pastWidth !== 'number'){
                                //    barNode.pastWidth = (pastNodePair[1].parent || pastNodePair[1]).attr.width;
                                //}
                                if (barNode.term === pastNodePair[0]){
                                    barNode.existing = true;
                                    return true;
                                }
                                return false;
                            })
                            .length === 0) return true;
                        return false;
                    }).map(function(pastNodePair){
                        var pastNode = pastNodePair[1];
                        pastNode.removing = true;
                        //pastNode.attr.width = d.attr.width;
                        //if (pastNode.parent) pastNode.parent.attr.width = d.attr.width;
                        return pastNode;
                    })
                )

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
                            if (typeof cachedBars !== 'undefined' && r !== null){
                                // Save bar element; set its data w/ D3 but don't save D3 wrapped-version
                                d3.select(r).datum(d);
                                if (!(d.removing && !transitioning)) cachedBars[d.term] = r;
                            }
                        }}
                    >
                        { this.props.showBarCount ?
                        <span className="bar-top-label" key="text-label">
                            { d.count }
                        </span>
                        : null }
                        {
                            _.sortBy(barSections, 'term').map(this.renderBarSection)
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

    getDefaultProps : function(){
        return { 
            'cursorContainerMargin' : 100,
            'cursorDetailActions' : []
        };
    },

    cursorDetailActions : function(){
        return this.props.cursorDetailActions.concat([
            {
                'title' : function(cursorProps){
                    if (navigate.isBrowseHref(cursorProps.href)){
                        //return "Browse " + _.pluck(cursorProps.path, 'term').join(' & ') + " Experiment Sets";
                        return "Explore";
                    }
                    return "Browse";
                },
                'function' : (cursorProps, mouseEvt) => {

                    var isOnBrowsePage = navigate.isBrowseHref(cursorProps.href);
                    var href = isOnBrowsePage ? cursorProps.href : navigate.getBrowseHref(cursorProps.href) || null;

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
                        href,
                        function(){
                            setTimeout(layout.animateScrollTo, 100, 360, Math.abs(document.body.scrollTop - 360) * 2, 0);
                        }
                        
                    );

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
        ]);
    },

    handleClickAnywhere : function(evt){
        // Don't do anything if clicked on DetailCursor. UNLESS it's a button.
        if (
            //evt.target.className &&
            //evt.target.className.split(' ').indexOf('btn') === -1 &&
            ChartDetailCursor.isTargetDetailCursor(evt.target)
        ){
            return false;
        }

        this.setState({
            'selectedBarSectionParentTerm' : null,
            'selectedBarSectionTerm' : null
        });
    },

    handleMouseMoveToUnsticky : function(evt){
        if (this.refs && this.refs.container){

            var containerOffset = layout.getElementOffset(this.refs.container);
            var marginTop   = (this.props.cursorContainerMargin && this.props.cursorContainerMargin.top) || this.props.cursorContainerMargin || 0,
                marginBottom= (this.props.cursorContainerMargin && this.props.cursorContainerMargin.bottom) || marginTop || 0,
                marginLeft  = (this.props.cursorContainerMargin && this.props.cursorContainerMargin.left) || marginTop || 0,
                marginRight = (this.props.cursorContainerMargin && this.props.cursorContainerMargin.right) || marginLeft || 0;


            if (
                (evt.pageY || evt.clientY) < containerOffset.top - marginTop ||
                (evt.pageY || evt.clientY) > containerOffset.top + this.refs.container.clientHeight + marginBottom ||
                (evt.pageX || evt.clientX) < containerOffset.left - marginLeft ||
                (evt.pageX || evt.clientX) > containerOffset.left + this.refs.container.clientWidth + marginRight
            ){
                this.setState({
                    'selectedBarSectionParentTerm' : null,
                    'selectedBarSectionTerm' : null
                });
                return true;
            }
            return false;
        } else {
            return false;
        }
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
                setTimeout(window.addEventListener, 100, 'mousemove', this.handleMouseMoveToUnsticky);
                //window.addEventListener('click', this.handleClickAnywhere);
            } else {
                window.removeEventListener('click', this.handleClickAnywhere);
                window.removeEventListener('mousemove', this.handleMouseMoveToUnsticky);
                if (!this.state.hoverBarSectionTerm){
                    ChartDetailCursor.reset();
                } else {
                    ChartDetailCursor.update({ 'sticky' : false });
                }
            }

        }
    },

    updateDetailCursorFromNode : function(node, overrideSticky = false, cursorId = 'default'){
        var newCursorDetailState = {
            'path' : [],
            'includeTitleDescendentPrefix' : false,
            'actions' : this.props.actions || this.cursorDetailActions() || null,
        };
        
        if (node.parent) newCursorDetailState.path.push(node.parent);
        if (typeof this.props.aggregateType === 'string') {
            newCursorDetailState.primaryCount = this.props.aggregateType;
        }
        newCursorDetailState.path.push(node);
        ChartDetailCursor.update(newCursorDetailState, cursorId, null, overrideSticky);
    },

    /**
     * Passes props to and renders child 'Bar' Components.
     * Handles caching of bars for transitioning.
     * Passes in own state, high-level props if child prop not set, and extends event handlers.
     * 
     * @returns {Component[]} Array of 'Bar' React Components.
     */

    renderBars : function(){

        cachedPastBars = _.clone(cachedBars);
        cachedBars = {};
        cachedPastBarSections = _.clone(cachedBarSections);
        cachedBarSections = {};

        // Current Bars only.
        var currentBars = this.props.bars.map((d)=>{
            // Determine whether bar existed before.
            return _.extend(d, { 
                'existing' : typeof cachedPastBars[d.term] !== 'undefined' && cachedPastBars[d.term] !== null
            });
        });

        var barsToRender = currentBars;

        // If transitioning, get D3 datums of existing bars which need to transition out and add removing=true property to inform this.renderParts.bar.
        if (this.props.transitioning){
            var barsToRemove = _.difference(  _.keys(cachedPastBars),  _.pluck(this.props.bars, 'term')).map((barTerm) => {
                return _.extend(cachedPastBars[barTerm].__data__, { 'removing' : true });
            });
            barsToRender = barsToRemove.concat(currentBars);
        }

        return barsToRender.sort(function(a,b){
            return a.term < b.term ? -1 : 1;
        }).map((d,i,a) =>
            <ViewContainer.Bar
                key={d.term || i}
                node={d}
                showBarCount={true /*!allExpsBarDataContainer */}

                selectedBarSectionParentTerm={this.state.selectedBarSectionParentTerm}
                selectedBarSectionTerm={this.state.selectedBarSectionTerm}
                hoverBarSectionParentTerm={this.state.hoverBarSectionParentTerm}
                hoverBarSectionTerm={this.state.hoverBarSectionTerm}

                styleOptions={this.props.styleOptions}
                transitioning={this.props.transitioning}
                aggregateType={this.props.aggregateType}
                showType={this.props.showType}

                onBarPartMouseEnter={(node, evt)=>{

                    // Cancel if same node as selected.
                    if (ViewContainer.BarSection.isSelected(node, this.state.selectedBarSectionTerm, this.state.selectedBarSectionParentTerm)){
                        return false;
                    }

                    // Cancel if any node still selected
                    //if (this.state.selectedBarSectionTerm !== null) return false;

                    //var xCoordOverride = null;
                    /*
                    if (this.refs && this.refs.container){
                        xCoordOverride = (
                            layout.getElementOffset(this.refs.container).left
                            + this.props.styleOptions.offset.left
                            + ((node.attr.width / 2)
                            + (node.parent || node).attr.x)
                        );
                    }
                    */


                    if (this.state.selectedBarSectionTerm === null){
                        this.updateDetailCursorFromNode(node, false);
                    }

                    var newOwnState = {};

                    // Unset selected nodes.
                    //if (this.state.selectedBarSectionTerm !== null){
                    //    _.extend(newOwnState, {
                    //        'selectedBarSectionTerm' : null,
                    //        'selectedBarSectionParentTerm' : null
                    //    });
                    //}

                    // Update hover state
                    _.extend(newOwnState, {
                        'hoverBarSectionTerm' : node.term || null,
                        'hoverBarSectionParentTerm' : (node.parent && node.parent.term) || null,
                    });

                    if (_.keys(newOwnState).length > 0){
                        this.setState(newOwnState);
                    }

                    highlightTerm(node.field, node.term, node.color || vizUtil.colorForNode(node));
                }}
                onBarPartMouseLeave={(node, evt)=>{

                    // Update hover state
                    this.setState({
                        'hoverBarSectionTerm' : null,
                        'hoverBarSectionParentTerm' : null
                    });

                    if (!ChartDetailCursor.isTargetDetailCursor(evt.relatedTarget)){
                        ChartDetailCursor.reset(false);
                    }
                }}
                onBarPartClick={(node, evt)=>{
                    evt.preventDefault();
                    evt.stopPropagation(); // Prevent this event from being captured by this.handleClickAnywhere() listener.
                    // If this section already selected:
                    if (ViewContainer.BarSection.isSelected(node, this.state.selectedBarSectionTerm, this.state.selectedBarSectionParentTerm)){
                        this.setState({
                            'selectedBarSectionTerm' : null,
                            'selectedBarSectionParentTerm' : null
                        });
                    } else {
                        if (this.state.selectedBarSectionTerm) {
                            console.log(node);

                            var containerPos = layout.getElementOffset(this.refs.container);
                            var bottomOffset = (this.props.styleOptions && this.props.styleOptions.offset && this.props.styleOptions.offset.bottom) || 0;
                            var leftOffset = (this.props.styleOptions && this.props.styleOptions.offset && this.props.styleOptions.offset.left) || 0;

                            var mouseXInContainer = (evt.pageX || evt.clientX) - containerPos.left;
                            var barYPos = node.attr.height;
                            var isPopoverOnRightSide = mouseXInContainer > (this.refs.container.clientWidth / 2);

                            if (node.parent){
                                var done = false;
                                barYPos = _.reduce(
                                    _.sortBy(node.parent.bars, 'term').reverse(),
                                    function(m, siblingNode){
                                        if (done) return m;
                                        if (siblingNode.term === node.term){
                                            done = true;
                                        }
                                        return m + siblingNode.attr.height;
                                    },
                                    0
                                );
                            }


                            // Manually update popover coords then update its contents
                            ChartDetailCursor.setCoords({
                                x : containerPos.left + leftOffset + (node.parent || node).attr.x + ((node.parent || node).attr.width / 2),
                                y : containerPos.top + this.refs.container.clientHeight - bottomOffset - barYPos,
                                onRightSide : isPopoverOnRightSide
                            }, this.updateDetailCursorFromNode.bind(this, node, true, 'default'));
                        }
                        this.setState({
                            'selectedBarSectionTerm' : node.term || null,
                            'selectedBarSectionParentTerm' : (node.parent && node.parent.term) || null
                        });
                    }
                    if (typeof oldOnClickFxn === 'function') return oldOnClickFxn(node, evt);
                    return false;
                }}

            />
        );
    },

    render: function(){

        return (
            <div
                className="bar-plot-chart chart-container no-highlight"
                data-field={this.props.topLevelField}
                style={{ height : this.props.height, width: this.props.width }}
                ref="container"
                /*
                onMouseLeave={(evt)=>{
                    if (ChartDetailCursor.isTargetDetailCursor(evt.relatedTarget)){
                        return false;
                    }
                    var newState = {};
                    if (this.state.hoverBarSectionTerm) {
                        newState.hoverBarSectionParentTerm = newState.hoverBarSectionTerm = null;
                    }
                    if (this.state.selectedBarSectionTerm) {
                        newState.selectedBarSectionParentTerm = newState.selectedBarSectionTerm = null;
                    }
                    if (_.keys(newState).length > 0){
                        this.setState(newState);
                    }
                }}
                */
            >
                { this.props.leftAxis }
                {/* allExpsBarDataContainer && allExpsBarDataContainer.component */}
                { this.renderBars() }
                { this.props.bottomAxis }
            </div>
        );

    }

});

