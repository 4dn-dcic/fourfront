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
        'handleDragThrottleLimit'   : 100,
        'leftPanelDefaultCollapsed' : false
    };

    static propTypes = {
        'renderLeftPanel'               : PropTypes.func,
        'renderRightPanel'              : PropTypes.func,
        'renderLeftPanelPlaceHolder'    : PropTypes.func
    };

    constructor(props){
        super(props);
        this.handleStopDrag = this.handleStopDrag.bind(this);
        this.handleDrag = _.throttle(this.handleDrag.bind(this), props.handleDragThrottleLimit);
        this.resetXOffset = this.resetXOffset.bind(this);
        this.state = {
            'xOffset' : 0
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

    componentWillReceiveProps(nextProps){
        if (nextProps.width !== this.props.width){
            this.setState({ 'xOffset' : 0 });
        }
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
            className, rightPanelClassName, leftPanelClassName, renderLeftPanel, renderRightPanel } = this.props;

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

        return (
            <div className={"row" + (className ? ' ' + className : '')}>
                <div className={"left-panel col-xs-12 col-md-" + leftPanelDefaultSizeMD + " col-lg-" + leftPanelDefaultSizeMD + (leftPanelClassName ? ' ' + leftPanelClassName : '')}
                    style={{ 'width' : (layoutSize === 'lg' || layoutSize === 'md') ? this.leftPanelWidth + xOffset : width + 20, 'height' : height || null }}>
                    { renderLeftPanel((layoutSize === 'md' || layoutSize === 'lg') ? this.leftPanelWidth + xOffset : width, this.resetXOffset, leftPanelCollapsed) }
                    { (layoutSize === 'lg' || layoutSize === 'md') ? <DraggableVerticalBorder xOffset={xOffset} height={height} left={this.leftPanelWidth} onStop={this.handleStopDrag} onDrag={this.handleDrag} bounds={this.draggableBounds} /> : null }
                </div>
                <div className={"right-panel col-xs-12 col-md-" + rightPanelDefaultSizeMD + " col-lg-" + rightPanelDefaultSizeLG + (rightPanelClassName ? ' ' + rightPanelClassName : '')}
                    style={(layoutSize === 'lg' || layoutSize === 'md') ? { width : (this.rightPanelWidth + 30) - xOffset } : null}
                    children={renderRightPanel((layoutSize === 'md' || layoutSize === 'lg') ? this.rightPanelWidth + 10 - xOffset : width, this.resetXOffset)} />
            </div>
        );
    }

}
