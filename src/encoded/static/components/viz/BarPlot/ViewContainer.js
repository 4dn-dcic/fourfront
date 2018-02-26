'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as d3 from 'd3';
import * as store from './../../../store';
import * as vizUtil from './../utilities';
import { barplot_color_cycler } from './../ColorCycler';
import ChartDetailCursor, { CursorViewBounds } from './../ChartDetailCursor';
import { console, object, isServerSide, expFxn, Filters, layout, navigate, analytics } from './../../util';

// Used for transitioning
var cachedBars = {},
    cachedPastBars = {},
    cachedBarSections = {},
    cachedPastBarSections = {};


/**
 * Outputs a section of a bar.
 * 
 * @class BarSection
 * @type {Component}
 */
class BarSection extends React.Component {

    constructor(props){
        super(props);
        this.isSelected = this.isSelected.bind(this);
        this.isHoveredOver = this.isHoveredOver.bind(this);
    }

    /**
     * Check if component (aka props.node) is selected.
     * Calls CursorViewBounds.isSelected(..) internally.
     * 
     * @returns {boolean} - True if selected.
     */
    isSelected(){
        return CursorViewBounds.isSelected(this.props.node, this.props.selectedTerm, this.props.selectedParentTerm);
    }

    isHoveredOver(){
        return CursorViewBounds.isSelected(this.props.node, this.props.hoverTerm, this.props.hoverParentTerm);
    }

    /**
     * @returns {Element} - A div element representing a bar section.
     */
    render(){
        var d               = this.props.node;
        var color           = d.color || barplot_color_cycler.colorForNode(d);
        var isSelected      = this.isSelected(),
            isHoveredOver   = this.isHoveredOver();

        var className = "bar-part";
        if (d.parent) className += ' multiple-parts';
        if (isSelected) className += ' selected';
        if (isHoveredOver) className += ' hover';
        if (!this.props.canBeHighlighted) className += ' no-highlight';
        else className += ' no-highlight-color';
        
        return (
            <div
                className={className}
                style={{
                    height : this.props.isNew || this.props.isRemoving ? '0%' : (d.attr.height / d.parent.attr.height) * 100 + '%',
                    //width: '100%', //(this.props.isNew && d.pastWidth) || (d.parent || d).attr.width,
                    backgroundColor : color
                }}
                ref={(r)=>{
                    if (this.props.isNew || this.props.transitioning) setTimeout(function(){
                        vizUtil.requestAnimationFrame(function(){
                            if (r && r.style && (r.style.height < d.attr.height)) r.style.height = d.attr.height + 'px';
                        });
                    }, 0);
                }}
                data-key={this.props['data-key'] || null}
                data-term={d.parent ? d.term : null}
                data-color={color}
                data-target-height={d.attr.height}
                key={'bar-part-' + (d.parent ? d.parent.term + '~' + d.term : d.term)}
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
    }
}


/**
 * Outputs a vertical bar containing bar sections.
 * 
 * @class Bar
 * @type {Component}
 */
class Bar extends React.Component {

    constructor(props){
        super(props);
        this.barStyle = this.barStyle.bind(this);
        this.renderBarSection = this.renderBarSection.bind(this);
        this.render = this.render.bind(this);
    }

    barStyle(){
        var style = {};
        var d = this.props.node;
        var styleOpts = this.props.styleOptions;

        // Position bar's x coord via translate3d CSS property for CSS3 transitioning.
        style.transform = vizUtil.style.translate3d(d.attr.x, 0, 0);
        if (d.removing && this.props.transitioning) style.opacity = 0; // Fade it out from current (opacity=1) via CSS3.
        else style.opacity = 1; // 'Default' (no transitioning) style
        style.left = styleOpts.offset.left;
        style.bottom = styleOpts.offset.bottom;
        style.width = d.attr.width;
        style.height = d.attr.height;

        return style;
    }

    renderBarSection(d,i,all){
        var parentBarTerm = (d.parent || d).term;
        cachedBarSections[parentBarTerm][d.term] = d;
        var isNew = false;
        if (this.props.transitioning && (!cachedPastBarSections[parentBarTerm] || !cachedPastBarSections[parentBarTerm][d.term])){
            isNew = true;
        }

        var key = d.term || d.name || i;

        return (
            <BarSection
                key={key}
                data-key={key}
                //yPos={_.reduce(all.slice(0, i), function(m, sd){  return sd.attr.height + m;  }, 0)}
                node={d}
                onClick={this.props.onBarPartClick}
                onMouseEnter={this.props.onBarPartMouseEnter}
                onMouseLeave={this.props.onBarPartMouseLeave}
                aggregateType={this.props.aggregateType}
                selectedParentTerm={this.props.selectedParentTerm}
                selectedTerm={this.props.selectedTerm}
                hoverParentTerm={this.props.hoverParentTerm}
                hoverTerm={this.props.hoverTerm}
                isNew={isNew}
                isRemoving={d.removing}
                transitioning={this.props.transitioning}
                canBeHighlighted={this.props.canBeHighlighted}
            />
        );
    }

    render(){
        var d = this.props.node;

        var transitioning = this.props.transitioning; // Cache state.transitioning to avoid risk of race condition in ref function.
        var styleOpts = this.props.styleOptions;

        var prevBarData = null;
        if (d.existing && transitioning && cachedPastBars) prevBarData = cachedPastBars[d.term].__data__;

        if (!cachedBarSections[d.term]) cachedBarSections[d.term] = {};

        var hasSubSections = Array.isArray(d.bars);

        var barSections = (hasSubSections ?
            d.bars : [_.extend({}, d, { color : 'rgb(139, 114, 142)' })]
        );

        // If transitioning, add existing bar sections to fade out.
        if (transitioning && cachedPastBarSections[d.term]){
            barSections = barSections.concat(
                _.map(
                    _.filter(
                        _.pairs(cachedPastBarSections[d.term]), // [ barNode.term, { <barSectionNode.term> : { ...barSectionNode } } ][]
                        function(pastNodePair){
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
                                }).length === 0) return true;
                            return false;
                        }
                    ),
                    function(pastNodePair){
                        var pastNode = pastNodePair[1];
                        pastNode.removing = true;
                        //pastNode.attr.width = d.attr.width;
                        //if (pastNode.parent) pastNode.parent.attr.width = d.attr.width;
                        return pastNode;
                    }
                )
            );
        }

        var className = "chart-bar";
        if (!this.props.canBeHighlighted) className += ' no-highlight';
        else className += ' no-highlight-color';

        var renderedBarSections = _.map(barSections, this.renderBarSection);

        var topLabel = null;
        if (this.props.showBarCount){
            topLabel = <span
                className="bar-top-label"
                key="text-label"
                children={d.count}
                style={{
                    //'transform' : vizUtil.style.translate3d(0, -_.reduce(barSections, function(m, sd){  return sd.attr.height + m;  }, 0), 0)
                }}
            />;
        }

        return (
            <div
                className={className}
                //onMouseLeave={()=>{
                    //if (Array.isArray(d.bars) && d.bars.length > 0) unhighlightTerms(d.bars[0].field);
                    //else unhighlightTerms(d.field);
                //}}
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
                children={[topLabel, renderedBarSections]}
            />
        );
    }
}

/**
 * React Component for wrapping the generated markup of BarPlot.Chart.
 * Also contains Components Bar and BarSection as static children, for wrapping output bar and bar parts.
 * 
 * The top-level ViewContainer component contains state for interactivity of the generated chart mark-up.
 * The child Bar and BarSection components are stateless and utilize the state passed down from ViewContainer.
 */
export class ViewContainer extends React.Component {

    static Bar = Bar
    static BarSection = BarSection

    static defaultProps = {
        canBeHighlighted : true
    }

    constructor(props){
        super(props);
        this.renderBars = this.renderBars.bind(this);
        this.render = this.render.bind(this);
    }

    /**
     * Passes props to and renders child 'Bar' Components.
     * Handles caching of bars for transitioning.
     * Passes in own state, high-level props if child prop not set, and extends event handlers.
     * 
     * @returns {Component[]} Array of 'Bar' React Components.
     */
    renderBars(){

        // Global/Module-level Variables
        cachedPastBars = _.clone(cachedBars);
        cachedBars = {};
        cachedPastBarSections = _.clone(cachedBarSections);
        cachedBarSections = {};

        var barsToRender, currentBars;

        // Current Bars only (unless transitioning).
        barsToRender = currentBars = this.props.bars.map((d)=>{
            // Determine whether bar existed before.
            return _.extend(d, { 
                'existing' : typeof cachedPastBars[d.term] !== 'undefined' && cachedPastBars[d.term] !== null
            });
        });

        // If transitioning, get D3 datums of existing bars which need to transition out and add removing=true property to inform this.renderParts.bar.
        if (this.props.transitioning){
            var barsToRemove = _.difference(  _.keys(cachedPastBars),  _.pluck(this.props.bars, 'term') ).map((barTerm) => {
                return _.extend(cachedPastBars[barTerm].__data__, { 'removing' : true });
            });
            barsToRender = barsToRemove.concat(currentBars);
        }

        return barsToRender.sort(function(a,b){ // key will be term or name, if available
            return (a.term || a.name) < (b.term || b.name) ? -1 : 1;
        }).map((d,i,a) =>
            <Bar
                key={d.term || d.name || i}
                node={d}
                showBarCount={true /*!allExpsBarDataContainer */}

                selectedParentTerm={this.props.selectedParentTerm}
                selectedTerm={this.props.selectedTerm}
                hoverParentTerm={this.props.hoverParentTerm}
                hoverTerm={this.props.hoverTerm}

                styleOptions={this.props.styleOptions}
                transitioning={this.props.transitioning}
                aggregateType={this.props.aggregateType}
                showType={this.props.showType}

                onBarPartMouseEnter={this.props.onNodeMouseEnter}
                onBarPartMouseLeave={this.props.onNodeMouseLeave}
                onBarPartClick={this.props.onNodeClick}

                canBeHighlighted={this.props.canBeHighlighted}
            />
        );
    }

    render(){

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

}


export const barPlotCursorActions = [
    {
        'title' : function(cursorProps){
            if (navigate.isBrowseHref(cursorProps.href)){
                //return "Browse " + _.pluck(cursorProps.path, 'term').join(' & ') + " Experiment Sets";
                return "Explore";
            }
            return "Browse";
        },
        'function' : function(showType = 'all', cursorProps, mouseEvt){
            //var isOnBrowsePage = navigate.isBrowseHref(cursorProps.href);
            var baseParams = navigate.getBrowseBaseParams();
            var href = navigate.getBrowseBaseHref(baseParams);

            // Reset existing filters if selecting from 'all' view. Preserve if from filtered view.
            var currentExpSetFilters = showType === 'all' ? {} : Filters.currentExpSetFilters();

            var newExpSetFilters = _.reduce(cursorProps.path, function(expSetFilters, node){
                // Do not change filter IF SET ALREADY because we want to strictly enable filters, not disable any.
                if (expSetFilters && expSetFilters[node.field] && expSetFilters[node.field].has(node.term)){
                    return expSetFilters;
                }
                return Filters.changeFilter(node.field, node.term, expSetFilters, null, true);// Existing expSetFilters, if null they're retrieved from Redux store, only return new expSetFilters vs saving them == set to TRUE
            }, currentExpSetFilters);

            // Track 'BarPlot':'Change Experiment Set Filters':ExpSetFilters event.
            analytics.event('BarPlot', 'Set Filter', {
                'eventLabel' : analytics.eventLabelFromChartNode(cursorProps.path[cursorProps.path.length - 1]), // 'New' filters logged here.
                'currentFilters' : analytics.getStringifiedCurrentFilters(Filters.currentExpSetFilters()) // 'Existing' filters, or filters at time of action, go here.
            });

            Filters.saveChangedFilters(newExpSetFilters, href, () => {
                // Scroll to top of browse page container after navigation is complete.
                setTimeout(layout.animateScrollTo, 200, "browsePageContainer", Math.abs(layout.getPageVerticalScrollPosition() - 510) * 2, 79);
            });

        },
        'disabled' : function(cursorProps){
            var expSetFilters = Filters.currentExpSetFilters();

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

export function boundActions(to, showType = null){
    if (!showType) showType = to.props.showType;
    return barPlotCursorActions.map((action)=>{
        var clonedAction = _.clone(action);
        if (typeof action.function === 'function') clonedAction.function = action.function.bind(to, showType);
        if (typeof action.title === 'function') clonedAction.title = action.title.bind(to);
        if (typeof action.disabled === 'function') clonedAction.disabled = action.disabled.bind(to);
        return clonedAction;
    });
}


/**
 * Wraps ViewContainer with PopoverViewBounds, which feeds it
 * props.onNodeMouseEnter(node, evt), props.onNodeMouseLeave(node, evt), props.onNodeClick(node, evt),
 * props.selectedTerm, props.selectedParentTerm, props.hoverTerm, and props.hoverParentTerm.
 * 
 * @export
 * @class PopoverViewContainer
 * @extends {React.Component}
 */
export class PopoverViewContainer extends React.Component {

    static propTypes = {
        'height' : PropTypes.number,
        'width'  : PropTypes.number,
        'cursorDetailActions': PropTypes.arrayOf(PropTypes.shape({
            'title' : PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
            'function' : PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
            'disabled' : PropTypes.oneOfType([PropTypes.bool, PropTypes.func]).isRequired,
        }))
    }

    static defaultProps = {
        'cursorDetailActions' : [],
        'cursorContainerMargin' : 100
    }

    cursorDetailActions(){
        return this.props.cursorDetailActions.concat(boundActions(this));
    }

    render(){
        return (
            <CursorViewBounds
                height={this.props.height}
                width={this.props.width}
                actions={this.cursorDetailActions.call(this)}
                cursorContainerMargin={this.props.cursorContainerMargin}
                eventCategory="BarPlot" // For Analytics events
                highlightTerm={false}
                clickCoordsFxn={(node, containerPosition, boundsHeight)=>{
                    var bottomOffset = (this.props && this.props.styleOptions && this.props.styleOptions.offset && this.props.styleOptions.offset.bottom) || 0;
                    var leftOffset = (this.props && this.props.styleOptions && this.props.styleOptions.offset && this.props.styleOptions.offset.left) || 0;

                    var barYPos = node.attr.height;

                    if (node.parent){
                        var done = false;
                        barYPos = _.reduce(
                            node.parent.bars,//.slice(0).reverse(),
                            //_.sortBy(node.parent.bars, 'term').reverse(),
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

                    return {
                        x : containerPosition.left + leftOffset + (node.parent || node).attr.x + ((node.parent || node).attr.width / 2),
                        y : containerPosition.top + boundsHeight - bottomOffset - barYPos,
                    };

                }}
            >
                <ViewContainer {...this.props} />
            </CursorViewBounds>
        );
    }
}
