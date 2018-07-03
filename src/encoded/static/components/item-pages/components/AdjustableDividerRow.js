'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Draggable from 'react-draggable';
import { console, layout } from './../../util';
import { requestAnimationFrame } from './../../viz/utilities';


export class DraggableVerticalBorder extends React.Component {

    static defaultProps = {
        'handleHeight' : 24
    };

    render(){
        var { xOffset, height, left, handleHeight } = this.props;
        return (
            <Draggable axis="x" position={{ 'x': xOffset, 'y': 0 }} {..._.pick(this.props, 'onStart', 'onStop', 'onDrag', 'bounds')}>
                <div className="draggable-border vertical-border" style={{ 'height' : height, 'left': left - 5 }}>
                    <div className="inner">
                        <div className="drag-handle" style={{ height : handleHeight, top: (Math.max(height - handleHeight, 10) / 2) }}/>
                    </div>
                </div>
            </Draggable>
        );
    }
}


export class AdjustableDividerRow extends React.PureComponent {

    static defaultProps = {
        'leftPanelCollapseWidth'    : 240,
        'leftPanelDefaultSizeMD'    : 5,
        'leftPanelDefaultSizeLG'    : 4,
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
        'height'                        : PropTypes.number, // Pre-define this.
        'width'                         : PropTypes.number  // Wrap in a WidthProvider if don't have
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
        if (props.mounted && props.leftPanelDefaultCollapsed && props.width){
            var leftPanelCollapseWidth = Math.max(props.leftPanelCollapseWidth || 0, props.minLeftPanelWidth);
            var layoutSize = layout.responsiveGridState() || null;
            if (layoutSize === 'md' || layoutSize === 'lg'){
                var leftPanelWidth;
                if (layoutSize === 'md'){
                    leftPanelWidth = props.width * ( props.leftPanelDefaultSizeMD / 12 );
                } else {
                    leftPanelWidth = props.width * ( props.leftPanelDefaultSizeLG / 12 );
                }
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

    componentWillReceiveProps(nextProps){
        if (nextProps.width !== this.props.width){
            if (!(nextProps.leftPanelDefaultCollapsed && this.draggableBounds && (this.state.xOffset - (nextProps.leftPanelCollapseWidth || nextProps.minLeftPanelWidth)) <= this.draggableBounds.left)){
                this.setState({ 'xOffset' : 0 });
            }
        }
    }

    componentDidUpdate(pastProps, pastState){
        if (typeof this.props.leftPanelCollapseHeight !== 'number' && pastProps.width !== this.props.width || this.props.renderRightPanel !== pastProps.renderRightPanel){
            var newRightPanelHeight = this.getRightPanelHeight();
            if (!(newRightPanelHeight === null && this.state.rightPanelHeight !== null)) { // newRightPanelHeight may be 0 if currently invisible or something. For now, lets just skip over it.
                this.setState({ 'rightPanelHeight' : newRightPanelHeight });
            }
        }
    }

    getRightPanelHeight(){
        var rightPanelChild = (this.refs && this.refs.rightPanel && this.refs.rightPanel.childNodes && this.refs.rightPanel.childNodes[0]);
        return (rightPanelChild && rightPanelChild.clientHeight) || null;
    }

    handleStopDrag(evt, data){
        var xOffset = data.x;
        var leftPanelCollapseWidth = Math.max(this.props.leftPanelCollapseWidth || 0, this.props.minLeftPanelWidth);
        if (this.leftPanelWidth + xOffset < leftPanelCollapseWidth){ // If in "collapse" width size lower half
            xOffset = this.draggableBounds.left;
        }
        this.setState({ xOffset }, () => this.handleDrag(evt, { 'x' : xOffset }));
    }

    handleDrag(evt, data){
        requestAnimationFrame(()=>{
            this.setState({ 'xOffset' : data.x }, (this.props && this.props.onDrag));
        });
    }

    resetXOffset(){
        this.setState({ 'xOffset' : 0 });
    }

    render(){
        var { mounted, width, height, leftPanelCollapseWidth, minRightPanelWidth, minLeftPanelWidth, leftPanelDefaultSizeMD, leftPanelDefaultSizeLG,
            className, rightPanelClassName, leftPanelClassName, renderLeftPanel, renderRightPanel, leftPanelCollapseHeight } = this.props;

        if (!mounted) return null;

        leftPanelCollapseWidth = Math.max(leftPanelCollapseWidth || 0, minLeftPanelWidth);

        var xOffset = this.state.xOffset;
        var layoutSize = layout.responsiveGridState() || null;
        var rightPanelDefaultSizeMD = 12 - leftPanelDefaultSizeMD;
        var rightPanelDefaultSizeLG = 12 - leftPanelDefaultSizeLG;

        this.rightPanelWidth = width; // Original full width. Used for <= small layout size.
        this.leftPanelWidth = width;

        if (layoutSize === 'md' || layoutSize === 'lg'){
            if (layoutSize === 'md'){
                this.rightPanelWidth = this.rightPanelWidth * ( rightPanelDefaultSizeMD / 12 ) - 10;
            } else {
                this.rightPanelWidth = this.rightPanelWidth * ( rightPanelDefaultSizeLG / 12 ) - 10;
            }
            this.leftPanelWidth = width - this.rightPanelWidth - 10;
        }
        this.draggableBounds = {
            'top': 0,
            'bottom': 0,
            'left': - this.leftPanelWidth + minLeftPanelWidth,
            'right' : this.rightPanelWidth - minRightPanelWidth
        };
        var leftPanelCollapsed = xOffset - (leftPanelCollapseWidth - minLeftPanelWidth) <= this.draggableBounds.left;
        if (leftPanelCollapsed && typeof leftPanelCollapseHeight === 'number'){
            height = leftPanelCollapseHeight;
        } else if (leftPanelCollapsed && typeof this.state.rightPanelHeight === 'number'){
            height = this.state.rightPanelHeight;
        } else if (!leftPanelCollapsed && typeof this.state.rightPanelHeight === 'number'){
            height = Math.max(this.state.rightPanelHeight, height);
        }

        var rightPanel = renderRightPanel(  (layoutSize === 'md' || layoutSize === 'lg') ? this.rightPanelWidth + 10 - xOffset : width,  this.resetXOffset,  !!(leftPanelCollapsed)  );

        return (
            <div className={"row" + (className ? ' ' + className : '')}>
                <div className={"left-panel col-xs-12 col-md-" + leftPanelDefaultSizeMD + " col-lg-" + leftPanelDefaultSizeMD + (leftPanelClassName ? ' ' + leftPanelClassName : '')}
                    style={{ 'width' : (layoutSize === 'lg' || layoutSize === 'md') ? this.leftPanelWidth + xOffset : width + 20, height }}>
                    { renderLeftPanel((layoutSize === 'md' || layoutSize === 'lg') ? this.leftPanelWidth + xOffset : width, this.resetXOffset, leftPanelCollapsed, this.state.rightPanelHeight) }
                    { (layoutSize === 'lg' || layoutSize === 'md') ? <DraggableVerticalBorder xOffset={xOffset} height={height || null} left={this.leftPanelWidth} onStop={this.handleStopDrag} onDrag={this.handleDrag} bounds={this.draggableBounds} /> : null }
                </div>
                <div className={"right-panel col-xs-12 col-md-" + rightPanelDefaultSizeMD + " col-lg-" + rightPanelDefaultSizeLG + (rightPanelClassName ? ' ' + rightPanelClassName : '')} ref="rightPanel"
                    style={(layoutSize === 'lg' || layoutSize === 'md') ? { width : (this.rightPanelWidth + 30) - xOffset } : null}
                    children={rightPanel} />
            </div>
        );
    }

}
