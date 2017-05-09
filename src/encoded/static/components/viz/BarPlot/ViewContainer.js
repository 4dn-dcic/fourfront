'use strict';

var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var store = require('./../../../store');
var vizUtil = require('./../utilities');
var ChartDetailCursor = require('./../ChartDetailCursor');
var { console, object, isServerSide, expFxn, Filters, layout, navigate, analytics } = require('./../../util');
var { unhighlightTerms, highlightTerm } = require('./../../facetlist');

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

    /**
     * Check if 'node' is currently selected.
     * 
     * @public
     * @param {Object} node - A 'node' containing at least 'field', 'term', and 'parent' if applicable.
     * @param {string} selectedBarSectionTerm - Currently selected subdivision field term.
     * @param {string} selectedBarSectionParentTerm - Currently selected X-Axis field term.
     * @returns {boolean} True if node (and node.parent, if applicable) matches selectedBarSectionTerm & selectedBarSectionParentTerm.
     */
    static isSelected(node, selectedBarSectionTerm, selectedBarSectionParentTerm){
        if (
            node.term === selectedBarSectionTerm && (
                ((node.parent && node.parent.term) || null) === (selectedBarSectionParentTerm || null)
            )
        ) return true;
        return false;
    }

    constructor(props){
        super(props);
        this.isSelected = this.isSelected.bind(this);
        this.isHoveredOver = this.isHoveredOver.bind(this);
    }

    /**
     * Check if component (aka props.node) is selected.
     * Calls BarSection.isSelected(..) internally.
     * 
     * @returns {boolean} - True if selected.
     */
    isSelected(){
        return BarSection.isSelected(this.props.node, this.props.selectedTerm, this.props.selectedParentTerm);
    }

    isHoveredOver(){
        return BarSection.isSelected(this.props.node, this.props.hoverTerm, this.props.hoverParentTerm);
    }

    /**
     * @returns {Element} - A div element representing a bar section.
     */
    render(){
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

        return style;
    }

    renderBarSection(d,i){
        var parentBarTerm = (d.parent || d).term;
        cachedBarSections[parentBarTerm][d.term] = d;
        var isNew = false;
        if (this.props.transitioning && (!cachedPastBarSections[parentBarTerm] || !cachedPastBarSections[parentBarTerm][d.term])){
            isNew = true;
        }

        return (
            <BarSection
                key={d.term || i}
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
}


class PopoverViewBounds extends React.Component {

    static defaultProps = {
        'cursorContainerMargin' : 100,
        // Return an object with 'x', 'y'.
        'clickCoordsFxn' : function(node, containerPosition, boundsHeight){
            var bottomOffset = (this.props && this.props.styleOptions && this.props.styleOptions.offset && this.props.styleOptions.offset.bottom) || 0;
            var leftOffset = (this.props && this.props.styleOptions && this.props.styleOptions.offset && this.props.styleOptions.offset.left) || 0;

            var barYPos = node.attr.height;

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

            return {
                x : containerPosition.left + leftOffset + (node.parent || node).attr.x + ((node.parent || node).attr.width / 2),
                y : containerPosition.top + boundsHeight - bottomOffset - barYPos,
            };

        }
    }

    constructor(props){
        super(props);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.updateDetailCursorFromNode = this.updateDetailCursorFromNode.bind(this);
        this.handleMouseMoveToUnsticky = this.handleMouseMoveToUnsticky.bind(this);
        this.handleClickAnywhere = this.handleClickAnywhere.bind(this);
        this.onNodeMouseEnter = this.onNodeMouseEnter.bind(this);
        this.onNodeMouseLeave = this.onNodeMouseLeave.bind(this);
        this.onNodeClick = this.onNodeClick.bind(this);
        this.state = {
            'selectedParentTerm' : null,
            'selectedTerm' : null,
            'hoverTerm' : null,
            'hoverParentTerm' : null
        };
    }

    /**
     * Important lifecycle method.
     * Checks if a selected bar section (via state.selectedTerm) has been set or unset.
     * Then passes that to the ChartDetailCursor's 'sticky' state.
     * 
     * Also enables or disables a 'click' event listener to cancel out stickiness/selected section.
     * 
     * @param {Object} pastProps - Previous props of this component.
     * @param {Object} pastState - Previous state of this component.
     */
    componentDidUpdate(pastProps, pastState){
        if (pastState.selectedTerm !== this.state.selectedTerm){
            
            // If we now have a selected bar section, enable click listener.
            // Otherwise, disable it.
            // And set ChartDetailCursor to be 'stickied'. This is the only place where the ChartDetailCursor state should be updated.
            if (typeof this.state.selectedTerm === 'string'){
                ChartDetailCursor.update({ 'sticky' : true });
                setTimeout(window.addEventListener, 100, 'click', this.handleClickAnywhere);
                setTimeout(window.addEventListener, 100, 'mousemove', this.handleMouseMoveToUnsticky);
                //window.addEventListener('click', this.handleClickAnywhere);
            } else {
                window.removeEventListener('click', this.handleClickAnywhere);
                window.removeEventListener('mousemove', this.handleMouseMoveToUnsticky);
                if (!this.state.hoverTerm){
                    ChartDetailCursor.reset();
                } else {
                    ChartDetailCursor.update({ 'sticky' : false });
                }
            }

        }
    }

    updateDetailCursorFromNode(node, overrideSticky = false, cursorId = 'default'){
        var newCursorDetailState = {
            'path' : [],
            'includeTitleDescendentPrefix' : false,
            'actions' : this.props.actions || null,
        };
        
        if (node.parent) newCursorDetailState.path.push(node.parent);
        if (typeof this.props.aggregateType === 'string') {
            newCursorDetailState.primaryCount = this.props.aggregateType;
        }
        newCursorDetailState.path.push(node);
        ChartDetailCursor.update(newCursorDetailState, cursorId, null, overrideSticky);
    }

    handleMouseMoveToUnsticky(evt){
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
                    'selectedParentTerm' : null,
                    'selectedTerm' : null
                });
                return true;
            }
            return false;
        } else {
            return false;
        }
    }

    handleClickAnywhere(evt){
        // Don't do anything if clicked on DetailCursor. UNLESS it's a button.
        if (
            //evt.target.className &&
            //evt.target.className.split(' ').indexOf('btn') === -1 &&
            ChartDetailCursor.isTargetDetailCursor(evt.target)
        ){
            return false;
        }

        this.setState({
            'selectedParentTerm' : null,
            'selectedTerm' : null
        });
    }

    onNodeMouseEnter(node, evt){
        // Cancel if same node as selected.
        if (BarSection.isSelected(node, this.state.selectedTerm, this.state.selectedParentTerm)){
            return false;
        }
        if (this.state.selectedTerm === null){
            this.updateDetailCursorFromNode(node, false);
        }

        var newOwnState = {};

        // Update hover state
        _.extend(newOwnState, {
            'hoverTerm' : node.term || null,
            'hoverParentTerm' : (node.parent && node.parent.term) || null,
        });

        if (_.keys(newOwnState).length > 0){
            this.setState(newOwnState, function(){
                analytics.event(this.props.eventCategory || 'PopoverViewBounds', 'Hover Bar Section', {
                    eventLabel : analytics.eventLabelFromChartNode(node),
                    currentFilters : analytics.getStringifiedCurrentFilters(Filters.currentExpSetFilters())
                });
            });
        }

        highlightTerm(node.field, node.term, node.color || vizUtil.colorForNode(node));
    }

    onNodeMouseLeave(node, evt){
        // Update hover state
        this.setState({
            'hoverTerm' : null,
            'hoverParentTerm' : null
        });

        if (!ChartDetailCursor.isTargetDetailCursor(evt.relatedTarget)){
            ChartDetailCursor.reset(false);
        }
    }

    onNodeClick(node, evt){
        evt.preventDefault();
        evt.stopPropagation(); // Prevent this event from being captured by this.handleClickAnywhere() listener.
        // If this section already selected:
        if (BarSection.isSelected(node, this.state.selectedTerm, this.state.selectedParentTerm)){
            this.setState({
                'selectedTerm' : null,
                'selectedParentTerm' : null
            });
        } else {
            // Manually adjust popover position if a different bar section is already selected.
            if (this.state.selectedTerm) {

                var containerPos = layout.getElementOffset(this.refs.container);
                var bottomOffset = (this.props.styleOptions && this.props.styleOptions.offset && this.props.styleOptions.offset.bottom) || 0;
                var leftOffset = (this.props.styleOptions && this.props.styleOptions.offset && this.props.styleOptions.offset.left) || 0;

                var mouseXInContainer = (evt.pageX || evt.clientX) - containerPos.left;
                var isPopoverOnRightSide = mouseXInContainer > (this.refs.container.clientWidth / 2);

                var coords = this.props.clickCoordsFxn(node, containerPos, this.refs.container.clientHeight);

                // Manually update popover coords then update its contents
                ChartDetailCursor.setCoords({
                    x : coords.x,
                    y : coords.y,
                    onRightSide : isPopoverOnRightSide
                }, this.updateDetailCursorFromNode.bind(this, node, true, 'default'));

            }
            // Set new selected bar part.
            this.setState({
                'selectedTerm' : node.term || null,
                'selectedParentTerm' : (node.parent && node.parent.term) || null
            }, function(){
                // Track 'BarPlot':'Change Experiment Set Filters':ExpSetFilters event.
                analytics.event(this.props.eventCategory || 'PopoverViewBounds', 'Select Bar Section', {
                    eventLabel : analytics.eventLabelFromChartNode(node),
                    currentFilters : analytics.getStringifiedCurrentFilters(Filters.currentExpSetFilters())
                });
            });

        }
        return false;
    }

    render(){
        return (
            <div className="popover-bounds-container" ref="container" style={{ height: this.props.height }}>
            {
                React.cloneElement(this.props.children, _.extend({}, _.omit(this.props, 'children'), {
                    selectedTerm : this.state.selectedTerm,
                    selectedParentTerm : this.state.selectedParentTerm,
                    hoverTerm : this.state.hoverTerm,
                    hoverParentTerm : this.state.hoverParentTerm,
                    onNodeMouseEnter : this.onNodeMouseEnter,
                    onNodeMouseLeave : this.onNodeMouseLeave,
                    onNodeClick : this.onNodeClick
                }))
            }
            </div>
        );
    }

}

export class ViewContainer extends React.Component {

    static Bar = Bar
    static BarSection = BarSection

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
            <Bar
                key={d.term || i}
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


/**
 * Wraps ViewContainer with PopoverViewBounds
 * 
 * @export
 * @class PopoverViewContainer
 * @extends {React.Component}
 */
export class PopoverViewContainer extends React.Component {

    static defaultProps = {
        'cursorDetailActions' : [],
        'cursorContainerMargin' : 100
    }

    cursorDetailActions(){
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

                    var newExpSetFilters = _.reduce(cursorProps.path, function(expSetFilters, node){
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
                    }, currentExpSetFilters);

                    // Track 'BarPlot':'Change Experiment Set Filters':ExpSetFilters event.
                    analytics.event('BarPlot', 'Set Filter', {
                        'eventLabel' : analytics.eventLabelFromChartNode(cursorProps.path[cursorProps.path.length - 1]), // 'New' filters logged here.
                        'currentFilters' : analytics.getStringifiedCurrentFilters(Filters.currentExpSetFilters()) // 'Existing' filters, or filters at time of action, go here.
                    });

                    Filters.saveChangedFilters(
                        newExpSetFilters,
                        true,
                        href,
                        function(){
                            // Scroll to top of page after navigation is complete.
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
    }

    render(){
        return (
            <PopoverViewBounds
                height={this.props.height}
                width={this.props.width}
                actions={this.cursorDetailActions()}
                cursorContainerMargin={this.props.cursorContainerMargin}
                eventCategory="BarPlot" // For Analytics events
            >
                <ViewContainer {...this.props} />
            </PopoverViewBounds>
        );
    }
}
