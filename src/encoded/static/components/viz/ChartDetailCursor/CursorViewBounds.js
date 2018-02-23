'use strict';

import React from 'react';
import _ from 'underscore';
import * as vizUtil from './../utilities';
import { barplot_color_cycler } from './../ColorCycler';
import ChartDetailCursor from './ChartDetailCursor';
import { console, isServerSide, Filters, layout, analytics } from './../../util';

/**
 * Use this Component to wrap a chart or other view which displays any sort of Experiment Set 'Node'(s).
 * A "Node" here implies an object with properties: 'field', 'term', 'experiment_sets', 'experiments', and 'files'.
 * Optionally may have a 'parent' node also, and any other metada.
 * 
 * This components adjusts child Component to pass down props:
 * {function} onNodeMouseEnter(node, evt)
 * {function} onNodeMouseLeave(node, evt)
 * {function} onNodeClick(node, evt)
 * {string} selectedTerm
 * {string} selectedParentTerm
 * {string} hoverTerm
 * {string} hoverParentTerm
 * 
 * The added prop callback functions should be used in the view whenever a "Node" element is hovered over or clicked on,
 * to pass node to them for the popover display.
 * 
 * Added prop strings should be used alongside CursorViewBounds.isSelected or similar to determine to highlight a node element that is selected, or something.
 * 
 * @export
 * @class CursorViewBounds
 * @extends {React.Component}
 */
export default class CursorViewBounds extends React.Component {

    /**
     * Check if 'node' is currently selected.
     * 
     * @public
     * @param {Object} node - A 'node' containing at least 'field', 'term', and 'parent' if applicable.
     * @param {string} selectedBarSectionTerm - Currently selected subdivision field term.
     * @param {string} selectedBarSectionParentTerm - Currently selected X-Axis field term.
     * @returns {boolean} True if node (and node.parent, if applicable) matches selectedBarSectionTerm & selectedBarSectionParentTerm.
     */
    static isSelected(node, selectedTerm, selectedParentTerm){
        if (
            node.term === selectedTerm && (
                ((node.parent && node.parent.term) || null) === (selectedParentTerm || null)
            )
        ) return true;
        return false;
    }

    static defaultProps = {
        'cursorContainerMargin' : 100,
        'highlightTerm' : false,
        // Return an object with 'x', 'y'.
        'clickCoordsFxn' : function(node, containerPosition, boundsHeight, isOnRightSide){

            return {
                x : containerPosition.left,
                y : containerPosition.top + boundsHeight,
            };

        }
    }

    constructor(props){
        super(props);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.updateDetailCursorFromNode = this.updateDetailCursorFromNode.bind(this);
        this.handleMouseMoveToUnsticky = this.handleMouseMoveToUnsticky.bind(this);
        this.handleClickAnywhere = this.handleClickAnywhere.bind(this);
        this.sendHoverEvent = _.debounce(this.sendHoverEvent.bind(this), 3000);
        this.registerHoverEvent = this.registerHoverEvent.bind(this);
        this.onNodeMouseEnter = this.onNodeMouseEnter.bind(this);
        this.onNodeMouseLeave = this.onNodeMouseLeave.bind(this);
        this.onNodeClick = this.onNodeClick.bind(this);
        this.hovers = [];
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

    sendHoverEvent(node){
        setTimeout(()=>{
            analytics.event(this.props.eventCategory || 'CursorViewBounds', 'Hover Node', {
                eventLabel : analytics.eventLabelFromChartNodes(this.hovers),
                currentFilters : analytics.getStringifiedCurrentFilters(Filters.currentExpSetFilters()),
                eventValue : this.hovers.length
            });
            this.hovers = [];
        }, 10);
    }

    registerHoverEvent(node){
        this.hovers.push(node);
        this.sendHoverEvent();
    }

    onNodeMouseEnter(node, evt){
        // Cancel if same node as selected.
        if (CursorViewBounds.isSelected(node, this.state.selectedTerm, this.state.selectedParentTerm)){
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
            this.setState(newOwnState, this.registerHoverEvent.bind(this, node));
        }

        if (this.props.highlightTerm && typeof vizUtil.highlightTerm === 'function') vizUtil.highlightTerm(node.field, node.term, node.color || barplot_color_cycler.colorForNode(node));
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
        if (CursorViewBounds.isSelected(node, this.state.selectedTerm, this.state.selectedParentTerm)){
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

                //var mouseXInContainer = (evt.pageX || evt.clientX) - containerPos.left;

                // Try to use window width.
                var containerWidth;
                if (!isServerSide() && window && window.innerWidth){
                    containerWidth = window.clientWidth || window.innerWidth;
                } else {
                    containerWidth = this.refs.container.clientWidth;
                }

                var isPopoverOnRightSide = (evt.pageX || evt.clientX) > (containerWidth / 2);

                var coords = this.props.clickCoordsFxn(node, containerPos, this.refs.container.clientHeight, isPopoverOnRightSide);

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
                setTimeout(()=>{
                    analytics.event(this.props.eventCategory || 'CursorViewBounds', 'Select Node', {
                        eventLabel : analytics.eventLabelFromChartNode(node),
                        currentFilters : analytics.getStringifiedCurrentFilters(Filters.currentExpSetFilters())
                    });
                }, 10);
            });

        }
        return false;
    }

    render(){
        return (
            <div className="popover-bounds-container" ref="container" style={{ height: this.props.height, width : this.props.width }}>
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
