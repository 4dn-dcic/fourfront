'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Draggable from 'react-draggable';
import { console, layout } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { requestAnimationFrame as raf } from '@hms-dbmi-bgm/shared-portal-components/src/components/viz/utilities';


export const DraggableVerticalBorder = React.memo(function DraggableVerticalBorder(props){
    const { xOffset, height, left, handleHeight } = props;
    return (
        <Draggable axis="x" position={{ 'x': xOffset, 'y': 0 }} {..._.pick(props, 'onStart', 'onStop', 'onDrag', 'bounds')}>
            <div className="draggable-border vertical-border" style={{ 'height' : height, 'left': left - 5 }}>
                <div className="inner">
                    <div className="drag-handle" style={{ 'height' : handleHeight, 'top' : (Math.max(height - handleHeight, 10) / 2) }}/>
                </div>
            </div>
        </Draggable>
    );
});
DraggableVerticalBorder.defaultProps = {
    'handleHeight' : 24
};


/** This is pretty ugly. @todo refactor, reimplement, something... */
export class AdjustableDividerRow extends React.PureComponent {

    static defaultProps = {
        'leftPanelCollapseWidth'    : 240,
        'leftPanelDefaultWidth'     : 300,
        'leftPanelClassName'        : null,
        'minLeftPanelWidth'         : 60,
        'minRightPanelWidth'        : 170,
        'rightPanelClassName'       : null,
        'handleDragThrottleLimit'   : 50,
        'leftPanelDefaultCollapsed' : false,
        'height'                    : 200
    };

    static propTypes = {
        /**
         * For renderLeftPanel -
         *
         * @param {number} leftPanelWidth - State passed in by AdjustableDividerRow.renderLeftPanel(...)
         * @param {function} resetXOffset - Function to reset to default the divider position and panel widths.
         * @param {boolean} collapsed - State passed in by AdjustableDividerRow.renderLeftPanel(...)
         * @param {number} rightPanelHeight - State passed in by AdjustableDividerRow.renderLeftPanel(...)
         */
        'renderLeftPanel'               : PropTypes.func.isRequired,
        'renderRightPanel'              : PropTypes.func.isRequired,
        'renderLeftPanelPlaceHolder'    : PropTypes.func,
        'height'                        : PropTypes.number.isRequired, // Pre-define this.
        'width'                         : PropTypes.number,
        'windowWidth'                   : PropTypes.number.isRequired
    };

    constructor(props){
        super(props);
        this.getRightPanelHeight = this.getRightPanelHeight.bind(this);
        this.handleStopDrag = this.handleStopDrag.bind(this);
        this.handleDrag = _.throttle(this.handleDrag.bind(this), props.handleDragThrottleLimit);
        this.resetXOffset = this.resetXOffset.bind(this);

        this.state = {
            'xOffset' : 0,
            'rightPanelHeight' : null
        };

        this.rightPanelRef = React.createRef();

        if (props.mounted && props.leftPanelDefaultCollapsed && props.width){
            const leftPanelCollapseWidth = Math.max(
                props.leftPanelCollapseWidth || 0,
                props.minLeftPanelWidth
            );
            const layoutSize = layout.responsiveGridState(props.windowWidth) || null;
            if (layoutSize === 'lg' || layoutSize === 'xl'){
                const leftPanelWidth = props.leftPanelDefaultWidth || 240;
                this.state.xOffset = - leftPanelWidth + props.minLeftPanelWidth;
            }
        }
    }

    componentDidMount(){
        if (typeof this.props.leftPanelCollapseHeight !== 'number'){
            setTimeout(()=>{
                this.setState({ 'rightPanelHeight' : this.getRightPanelHeight() });
            }, 0);
        }
    }

    componentDidUpdate(pastProps, pastState){
        const { leftPanelDefaultCollapsed, leftPanelCollapseWidth, leftPanelCollapseHeight, minLeftPanelWidth, width, renderRightPanel } = this.props;
        const { xOffset, rightPanelHeight } = this.state;
        const stateChange = {};

        if (pastProps.width !== width){
            if (!(leftPanelDefaultCollapsed && this.draggableBounds && (xOffset - (leftPanelCollapseWidth || minLeftPanelWidth)) <= this.draggableBounds.left)){
                stateChange.xOffset = 0;
            }
        }

        if (typeof leftPanelCollapseHeight !== 'number' && pastProps.width !== width || renderRightPanel !== pastProps.renderRightPanel){
            var newRightPanelHeight = this.getRightPanelHeight();
            if (!(newRightPanelHeight === null && rightPanelHeight !== null)) { // newRightPanelHeight may be 0 if currently invisible or something. For now, lets just skip over it.
                stateChange.rightPanelHeight = newRightPanelHeight;
            }
        }

        if (_.keys(stateChange).length > 0){
            this.setState(stateChange);
        }
    }

    getRightPanelHeight(){
        var rightPanelElem = this.rightPanelRef.current,
            rightPanelChild = rightPanelElem && rightPanelElem.childNodes && rightPanelElem.childNodes[0];
        return (rightPanelChild && rightPanelChild.clientHeight) || null;
    }

    handleStopDrag(evt, data){
        const { leftPanelCollapseWidth, minLeftPanelWidth } = this.props;
        let xOffset = data.x;
        const leftPanelCollapseWidthCurr = Math.max(leftPanelCollapseWidth || 0, minLeftPanelWidth);

        if (this.leftPanelWidth + xOffset < leftPanelCollapseWidthCurr){ // If in "collapse" width size lower half
            xOffset = this.draggableBounds.left;
        }
        this.setState({ xOffset }, () => this.handleDrag(evt, { 'x' : xOffset }));
    }

    handleDrag(evt, data){
        raf(()=>{
            this.setState({ 'xOffset' : data.x }, this.props.onDrag);
        });
    }

    resetXOffset(){
        this.setState({ 'xOffset' : 0 });
    }

    render(){
        const { leftPanelDefaultWidth, mounted, width, height, leftPanelCollapseWidth, minRightPanelWidth, minLeftPanelWidth,
            className, rightPanelClassName, leftPanelClassName, renderLeftPanel, renderRightPanel, leftPanelCollapseHeight, windowWidth } = this.props;

        if (!mounted) return null;
        const { rightPanelHeight, xOffset } = this.state;

        const useLeftPanelCollapseWidth = Math.max(leftPanelCollapseWidth || 0, minLeftPanelWidth);
        let useHeight = height;

        const layoutSize = layout.responsiveGridState(windowWidth) || null;
        const isDraggableSize = layoutSize === 'lg' || layoutSize === 'xl';

        // Original full width. Used for <= small layout size.
        this.rightPanelWidth = width;
        this.leftPanelWidth = width;

        if (isDraggableSize){
            this.leftPanelWidth = leftPanelDefaultWidth;
            this.rightPanelWidth = width - leftPanelDefaultWidth;
        }

        this.draggableBounds = {
            'top': 0,
            'bottom': 0,
            'left': - this.leftPanelWidth + minLeftPanelWidth,
            'right' : this.rightPanelWidth - minRightPanelWidth
        };

        const leftPanelCollapsed = xOffset - (useLeftPanelCollapseWidth - minLeftPanelWidth) <= this.draggableBounds.left;
        if (leftPanelCollapsed && typeof leftPanelCollapseHeight === 'number'){
            useHeight = leftPanelCollapseHeight;
        } else if (leftPanelCollapsed && typeof rightPanelHeight === 'number'){
            useHeight = rightPanelHeight;
        } else if (!leftPanelCollapsed && typeof rightPanelHeight === 'number'){
            useHeight = Math.max(rightPanelHeight, height);
        }

        // minus 10 to account for padding/gap between the things.
        const leftPanel = renderLeftPanel(
            isDraggableSize ? this.leftPanelWidth - 10 + xOffset : width,
            this.resetXOffset, leftPanelCollapsed, rightPanelHeight
        );
        const rightPanel = renderRightPanel(
            isDraggableSize ? this.rightPanelWidth - 10 - xOffset : width,
            this.resetXOffset,  !!(leftPanelCollapsed)
        );

        const leftPanelCls = (
            "left-panel" +
            (leftPanelClassName ? ' ' + leftPanelClassName : '')
        );
        const leftPanelStyle = {
            'height' : useHeight,
            'width' : isDraggableSize ? this.leftPanelWidth + xOffset : width + 20
        };

        const rightPanelCls = (
            "right-panel" +
            (rightPanelClassName ? ' ' + rightPanelClassName : '')
        );
        const rightPanelStyle = isDraggableSize ? {
            'width' : this.rightPanelWidth - xOffset
        } : null;

        return (
            <div className={"row adjustable-divider-row" + (className ? ' ' + className : '')}>
                <div className={leftPanelCls} style={leftPanelStyle}>
                    { leftPanel }
                    { isDraggableSize ?
                        <DraggableVerticalBorder xOffset={xOffset} height={useHeight || null} left={this.leftPanelWidth}
                            onStop={this.handleStopDrag} onDrag={this.handleDrag} bounds={this.draggableBounds} />
                        : null }
                </div>
                <div className={rightPanelCls} ref={this.rightPanelRef} style={rightPanelStyle}>
                    { rightPanel }
                </div>
            </div>
        );
    }

}
