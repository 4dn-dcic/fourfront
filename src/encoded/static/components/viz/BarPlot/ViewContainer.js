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
class BarSection extends React.PureComponent {

    componentWillUnmount(){
        var { isSelected, isHoveredOver, onMouseLeave, node } = this.props;
        if (this.refs.element && (isSelected || isHoveredOver)){
            onMouseLeave(node, { 'relatedTarget' : this.refs.element });
        }
    }

    /**
     * @returns {Element} - A div element representing a bar section.
     */
    render(){
        var d               = this.props.node,
            color           = d.color || barplot_color_cycler.colorForNode(d),
            { isSelected, isHoveredOver, canBeHighlighted, onMouseEnter, onMouseLeave, onClick } = this.props,
            className = "bar-part";

        if (d.parent)           className += ' multiple-parts';
        if (isSelected)         className += ' selected';
        if (isHoveredOver)      className += ' hover';
        if (!canBeHighlighted)  className += ' no-highlight';
        else                    className += ' no-highlight-color';

        var height;
        if (!d.parent) { // No sub-buckets
            height = '100%';
        } else {
            // Use a percentage for styling purposes because we want the outermost bar height
            // to transition and child bar sections to stay aligned to it.
            height = (d.count / d.parent.count) * 100 + '%';
        }

        return (
            <div className={className} ref="element"
                style={{
                    height, 'backgroundColor' : color
                    //width: '100%', //(this.props.isNew && d.pastWidth) || (d.parent || d).attr.width,
                }}
                data-key={this.props['data-key'] || null} data-term={d.parent ? d.term : null}
                data-count={d.count} data-color={color} data-target-height={d.attr.height}
                key={'bar-part-' + (d.parent ? d.parent.term + '~' + d.term : d.term)}
                onMouseEnter={(e)=>{ typeof onMouseEnter === 'function' && onMouseEnter(d, e); }}
                onMouseLeave={(e)=>{ typeof onMouseLeave === 'function' && onMouseLeave(d, e); }}
                onClick={(e)=>{ typeof onClick === 'function' && onClick(d, e); }}
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
class Bar extends React.PureComponent {

    constructor(props){
        super(props);
        this.verifyCounts = this.verifyCounts.bind(this);
        this.barStyle = this.barStyle.bind(this);
        this.renderBarSection = this.renderBarSection.bind(this);
        this.render = this.render.bind(this);
    }

    componentDidMount(){
        this.verifyCounts();
    }

    componentDidUpdate(pastProps){
        if (this.props.node !== pastProps.node){
            this.verifyCounts();
        }
    }

    /**
     * Double check sum of bar parts and report an Exception to Google Analytics if doesn't match.
     * Do this in a setTimeout because it doesn't affect rendering or site UI.
     */
    verifyCounts(){
        var d = this.props.node;
        if (!d.bars) return;
        setTimeout(()=>{
            var combinedChildrenCount = _.reduce(d.bars, function(sum, bar){
                return sum + bar.count;
            }, 0);
            if (combinedChildrenCount && d.count !== combinedChildrenCount){
                var errorMsg = (
                    "Data Error: 1 or more ExperimentSets was counted multiple times for 'group by' field '" +
                    d.bars[0].field + "'."
                );
                analytics.exception(errorMsg);
                console.error(errorMsg);
            }
        }, 0);
    }

    barStyle(){
        var style = {};
        var d = this.props.node;
        var styleOpts = this.props.styleOptions;

        // Position bar's x coord via translate3d CSS property for CSS3 transitioning.
        style.transform = vizUtil.style.translate3d(d.attr.x, 0, 0);
        if ((d.removing || d.new) && this.props.transitioning) style.opacity = 0; // Fade it out from current (opacity=1) via CSS3.
        else style.opacity = 1; // 'Default' (no transitioning) style
        style.left = styleOpts.offset.left;
        style.bottom = styleOpts.offset.bottom;
        style.width = d.attr.width;
        style.height = d.attr.height;

        return style;
    }

    renderBarSection(d, i, all){
        //var parentBarTerm = (d.parent || d).term;
        //cachedBarSections[parentBarTerm][d.term] = d;
        //var isNew = false;
        //if (this.props.transitioning && (!cachedPastBarSections[parentBarTerm] || !cachedPastBarSections[parentBarTerm][d.term])){
        //    isNew = true;
        //}

        var key = d.term || d.name || i,
            isHoveredOver = CursorViewBounds.isSelected(d, this.props.hoverTerm, this.props.hoverParentTerm),
            isSelected = CursorViewBounds.isSelected(d, this.props.selectedTerm, this.props.selectedParentTerm);

        return (
            <BarSection
                key={key}
                data-key={key}
                node={d}
                onClick={this.props.onBarPartClick}
                onMouseEnter={this.props.onBarPartMouseEnter}
                onMouseLeave={this.props.onBarPartMouseLeave}
                aggregateType={this.props.aggregateType}
                //isNew={isNew}
                {...{ isHoveredOver, isSelected }}
                isRemoving={d.removing}
                transitioning={this.props.transitioning}
                canBeHighlighted={this.props.canBeHighlighted}
            />
        );
    }

    render(){
        var { transitioning, canBeHighlighted, showBarCount } = this.props,
            d = this.props.node,
            prevBarData = null;

        if (d.existing && transitioning && cachedPastBars)  prevBarData = cachedPastBars[d.term].__data__;
        if (!cachedBarSections[d.term])                     cachedBarSections[d.term] = {};

        var hasSubSections = Array.isArray(d.bars),
            barSections = (hasSubSections ?
                // If needed, remove sort + reverse to keep order of heaviest->lightest aggs regardless of color
                barplot_color_cycler.sortObjectsByColorPalette(d.bars).reverse() : [_.extend({}, d, { color : 'rgb(139, 114, 142)' })]
            ),
            className = "chart-bar",
            topLabel = showBarCount ? <span className="bar-top-label" key="text-label" children={d.count} /> : null;

        // If transitioning, add existing bar sections to fade out.
        /* Removed for now as we don't transition barSections currently
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
        */

        if (!canBeHighlighted)  className += ' no-highlight';
        else                    className += ' no-highlight-color';

        if (transitioning)      className += ' transitioning';
        if (d.new)              className += ' new-bar';
        else if (d.existing)    className += ' existing-bar';

        return (
            <div
                className={className}
                //onMouseLeave={()=>{
                    //if (Array.isArray(d.bars) && d.bars.length > 0) unhighlightTerms(d.bars[0].field);
                    //else unhighlightTerms(d.field);
                //}}
                data-term={d.term}
                data-count={d.count}
                data-field={Array.isArray(d.bars) && d.bars.length > 0 ? d.bars[0].field : null}
                key={"bar-" + d.term}
                style={this.barStyle()}
                ref={(r) => {
                    if (typeof cachedBars !== 'undefined' && r !== null){
                        // Save bar element; set its data w/ D3 but don't save D3 wrapped-version
                        d3.select(r).datum(d);
                        if (!(d.removing && !transitioning)) cachedBars[d.term] = r;
                        if (d.new && transitioning) r.style.opacity = 1;
                    }
                }}
                children={[ topLabel, _.map(barSections, this.renderBarSection) ]}
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
        this.verifyCounts = this.verifyCounts.bind(this);
        this.renderBars = this.renderBars.bind(this);
        this.render = this.render.bind(this);
    }

    componentDidMount(){
        this.verifyCounts();
    }

    componentDidUpdate(pastProps){
        if (this.props.bars !== pastProps.bars || this.props.aggregateType !== pastProps.aggregateType || this.props.topLevelField !== pastProps.topLevelField){
            this.verifyCounts();
        }
    }

    /**
     * Double check sum of bar parts and report an Exception to Google Analytics if doesn't match.
     * Do this in a setTimeout because it doesn't affect rendering or site UI.
     */
    verifyCounts(){
        var { bars, topLevelField, aggregateType } = this.props,
            totalCount = topLevelField && topLevelField.total && topLevelField.total[aggregateType];

        if (!totalCount || !bars) return;

        setTimeout(()=>{
            var combinedChildrenCount = _.reduce(bars, function(sum, bar){
                return sum + bar.count;
            }, 0);
            if (combinedChildrenCount && totalCount !== combinedChildrenCount){
                var errorMsg = (
                    "Data Error: 1 or more ExperimentSets was counted multiple times for 'group by' field '" +
                    bars[0].field + "'."
                );
                analytics.exception(errorMsg);
                console.error(errorMsg);
            }
        }, 0);
    }

    /**
     * Passes props to and renders child 'Bar' Components.
     * Handles caching of bars for transitioning.
     * Passes in own state, high-level props if child prop not set, and extends event handlers.
     * 
     * @returns {Component[]} Array of 'Bar' React Components.
     */
    renderBars(){
        var { bars, transitioning, onNodeMouseEnter, onNodeMouseLeave, onNodeClick } = this.props;

        // Global/Module-level Variables
        cachedPastBars = _.clone(cachedBars);
        cachedBars = {};
        cachedPastBarSections = _.clone(cachedBarSections);
        cachedBarSections = {};

        var barsToRender, currentBars;

        // Current Bars only (unless transitioning).
        barsToRender = currentBars = _.map(bars, (d)=>{
            // Determine whether bar existed before.
            var isExisting = typeof cachedPastBars[d.term] !== 'undefined' && cachedPastBars[d.term] !== null;
            return _.extend(d, { 
                'existing' : isExisting,
                'new' : !isExisting
            });
        });

        // If transitioning, get D3 datums of existing bars which need to transition out and add removing=true property to inform this.renderParts.bar.
        if (transitioning){
            var barsToRemove = _.map(_.difference(_.keys(cachedPastBars), _.pluck(bars, 'term')), function(barTerm){
                return _.extend(cachedPastBars[barTerm].__data__, { 'removing' : true });
            });
            barsToRender = barsToRemove.concat(currentBars);
        }

        return _.map(barsToRender.sort(function(a,b){ // key will be term or name, if available
            return (a.term || a.name) < (b.term || b.name) ? -1 : 1;
        }), (d,i,a) =>
            <Bar key={d.term || d.name || i} node={d}
                showBarCount={true /*!allExpsBarDataContainer */}
                {..._.pick(this.props, 'selectedParentTerm', 'selectedTerm', 'hoverParentTerm', 'hoverTerm', 'styleOptions',
                    'transitioning', 'aggregateType', 'showType', 'canBeHighlighted')}
                onBarPartMouseEnter={onNodeMouseEnter} onBarPartMouseLeave={onNodeMouseLeave} onBarPartClick={onNodeClick} />
        );
    }

    render(){

        return (
            <div
                className="bar-plot-chart chart-container no-highlight"
                data-field={this.props.topLevelField.field}
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

            // Register 'Set Filter' event for each field:term pair (node) of selected Bar Section.
            _.forEach(cursorProps.path, function(node){
                analytics.event('BarPlot', 'Set Filter', {
                    'eventLabel'        : analytics.eventLabelFromChartNode(node, false),                         // 'New' filter logged here.
                    'field'             : node.field,
                    'term'              : node.term,
                    'currentFilters'    : analytics.getStringifiedCurrentFilters(Filters.currentExpSetFilters()), // 'Existing' filters, or filters at time of action, go here.
                });
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
