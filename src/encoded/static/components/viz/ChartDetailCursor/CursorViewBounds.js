'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'underscore';
import * as vizUtil from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';
import { console, isServerSide, layout, analytics, WindowEventDelegator } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { barplot_color_cycler } from './../ColorCycler';
import ChartDetailCursor from './ChartDetailCursor';


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
export default class CursorViewBounds extends React.PureComponent {

    /**
     * Check if 'node' is currently selected.
     *
     * @public
     * @param {Object} node - A 'node' containing at least 'field', 'term', and 'parent' if applicable.
     * @param {string} selectedTerm - Currently selected subdivision field term.
     * @param {string} selectedParentTerm - Currently selected X-Axis field term.
     * @returns {boolean} True if node (and node.parent, if applicable) matches selectedTerm & selectedParentTerm.
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
    };

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

        this.boundsContainerRef = React.createRef();
        this.cursorRef = React.createRef();
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

        if (pastProps.href !== this.props.href){
            this.cursorRef.current.reset(true);
        } else if (pastState.selectedTerm !== this.state.selectedTerm){

            // If we now have a selected bar section, enable click listener.
            // Otherwise, disable it.
            // And set ChartDetailCursor to be 'stickied'. This is the only place where the ChartDetailCursor state should be updated.
            if (typeof this.state.selectedTerm === 'string'){
                this.cursorRef.current.update({ 'sticky' : true });
                setTimeout(()=>{
                    WindowEventDelegator.addHandler('click', this.handleClickAnywhere);
                    WindowEventDelegator.addHandler('mousemove', this.handleMouseMoveToUnsticky);
                }, 100);
            } else {
                WindowEventDelegator.removeHandler('click', this.handleClickAnywhere);
                WindowEventDelegator.removeHandler('mousemove', this.handleMouseMoveToUnsticky);
                if (!this.state.hoverTerm){
                    this.cursorRef.current.reset(true);
                } else {
                    this.cursorRef.current.update({ 'sticky' : false });
                }
            }

        }
    }

    updateDetailCursorFromNode(node, overrideSticky = false){
        const { actions = null, aggregateType } = this.props;
        const newCursorDetailState = {
            'path' : [],
            'includeTitleDescendentPrefix' : false,
            actions
        };

        if (node.parent) newCursorDetailState.path.push(node.parent);
        if (typeof aggregateType === 'string') {
            newCursorDetailState.primaryCount = aggregateType;
        }
        newCursorDetailState.path.push(node);
        this.cursorRef.current.update(newCursorDetailState, null, overrideSticky);
    }

    handleMouseMoveToUnsticky(evt){
        const container = this.boundsContainerRef && this.boundsContainerRef.current;
        const { cursorContainerMargin } = this.props;

        if (container){

            var containerOffset = layout.getElementOffset(container),
                marginTop       = (cursorContainerMargin && cursorContainerMargin.top)    || cursorContainerMargin || 0,
                marginBottom    = (cursorContainerMargin && cursorContainerMargin.bottom) || marginTop             || 0,
                marginLeft      = (cursorContainerMargin && cursorContainerMargin.left)   || marginTop             || 0,
                marginRight     = (cursorContainerMargin && cursorContainerMargin.right)  || marginLeft            || 0;

            if (
                (evt.pageY || evt.clientY) < containerOffset.top - marginTop ||
                (evt.pageY || evt.clientY) > containerOffset.top + container.clientHeight + marginBottom ||
                (evt.pageX || evt.clientX) < containerOffset.left - marginLeft ||
                (evt.pageX || evt.clientX) > containerOffset.left + container.clientWidth + marginRight
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
        const { selectedTerm, selectedParentTerm } = this.state;
        // Cancel if same node as selected.
        if (CursorViewBounds.isSelected(node, selectedTerm, selectedParentTerm)){
            return false;
        }
        if (selectedTerm === null){
            this.updateDetailCursorFromNode(node, false);
        }

        const newOwnState = {};

        // Update hover state
        _.extend(newOwnState, {
            'hoverTerm' : node.term || null,
            'hoverParentTerm' : (node.parent && node.parent.term) || null,
        });

        if (_.keys(newOwnState).length > 0){
            this.setState(newOwnState);
        }

        if (this.props.highlightTerm && typeof vizUtil.highlightTerm === 'function') vizUtil.highlightTerm(node.field, node.term, node.color || barplot_color_cycler.colorForNode(node));
    }

    onNodeMouseLeave(node, evt){
        // Update hover state
        this.setState({
            'hoverTerm' : null,
            'hoverParentTerm' : null
        });

        if (!evt || !ChartDetailCursor.isTargetDetailCursor(evt.relatedTarget)){
            this.cursorRef.current.reset(false);
        }
    }

    onNodeClick(node, evt){
        const { selectedTerm, selectedParentTerm } = this.state;
        evt.preventDefault();
        evt.stopPropagation(); // Prevent this event from being captured by this.handleClickAnywhere() listener.
        // If this section already selected:
        if (CursorViewBounds.isSelected(node, selectedTerm, selectedParentTerm)){
            this.setState({
                'selectedTerm' : null,
                'selectedParentTerm' : null
            });
        } else {
            const { context, styleOptions, windowWidth, clickCoordsFxn, eventCategory } = this.props;

            // Manually adjust popover position if a different bar section is already selected.
            if (selectedTerm) {

                const container = this.boundsContainerRef && this.boundsContainerRef.current;
                const containerPos = layout.getElementOffset(container);
                let containerWidth;

                //var mouseXInContainer = (evt.pageX || evt.clientX) - containerPos.left;

                // Try to use window width.
                if (!isServerSide() && typeof windowWidth === 'number'){
                    containerWidth = windowWidth;
                } else {
                    containerWidth = container.clientWidth;
                }

                const isPopoverOnRightSide = (evt.pageX || evt.clientX) > (containerWidth / 2);
                const coords = clickCoordsFxn(node, containerPos, container.clientHeight, isPopoverOnRightSide);

                // Manually update popover coords then update its contents
                this.cursorRef.current.setCoords(
                    _.extend({ 'onRightSide' : isPopoverOnRightSide }, coords),
                    this.updateDetailCursorFromNode.bind(this, node, true)
                );
            }

            // Set new selected bar part.
            this.setState({
                'selectedTerm' : node.term || null,
                'selectedParentTerm' : (node.parent && node.parent.term) || null
            }, function(){
                // Track 'BarPlot':'Change Experiment Set Filters':ExpSetFilters event.
                setTimeout(()=>{
                    //analytics
                    analytics.event('cursor_detail', eventCategory || 'CursorViewBounds', 'Set Filter', null, {
                        'name' : analytics.eventLabelFromChartNode(node),
                        'filters'     : analytics.getStringifiedCurrentFilters((context && context.filters) || null),
                    });
                }, 10);
            });

        }
        return false;
    }

    render(){
        const { children, ...passProps } = this.props;
        return (
            <div className="popover-bounds-container" ref={this.boundsContainerRef} style={_.pick(this.props, 'width', 'height')}>
                {
                    React.cloneElement(children, _.extend(
                        passProps,
                        _.pick(this.state, 'selectedTerm', 'selectedParentTerm', 'hoverTerm', 'hoverParentTerm'),
                        _.pick(this, 'onNodeMouseEnter', 'onNodeMouseLeave', 'onNodeClick')
                    ))
                }
                <ChartDetailCursor {..._.pick(this.props, 'windowWidth', 'windowHeight', 'href', 'schemas')} ref={this.cursorRef} />
            </div>
        );
    }

}
