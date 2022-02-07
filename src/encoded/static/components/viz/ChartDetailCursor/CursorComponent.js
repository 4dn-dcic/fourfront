'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'underscore';
import * as vizUtil from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';
import { console, isServerSide, layout, WindowEventDelegator } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

/**
 * @typedef {Object} Offset
 * @property {number} top     Top margin or offset.
 * @property {number} right   Right margin or offset.
 * @property {number} bottom  Bottom margin or offset.
 * @property {number} left    Left margin or offset.
 */


class CursorContent extends React.PureComponent {

    static defaultProps = {
        'scale'     : 2,
        'x'         : 0,
        'y'         : 0,
        'offsetX'   : -1,
        'offsetY'   : -1,
        'isVisible' : false
    }

    componentDidUpdate(pastProps){
        if (this.props.isVisible === false && pastProps.isVisible === true){
            if (typeof this.props.onMouseLeave === 'function'){
                this.props.onMouseLeave();
            }
        }
    }

    render(){
        const { isVisible, children, className, sticky, width, height, x, y, cursorOffset, onRightSide, pointerStyle } = this.props;
        if (!isVisible || !children) return null;
        const cls = 'cursor-component-container ' + (className || '') + (sticky ? ' sticky' : '');
        return (
            <div className={cls}
                style={{
                    width, height,
                    display: isVisible ? 'block' : 'none',
                    transform : vizUtil.style.translate3d(x, y),
                    marginLeft: -(width / 2) + ((onRightSide ? -1 : 1) * cursorOffset.x),
                    marginTop: -(height / 2) + cursorOffset.y,
                    opacity : 0
                }}
                ref={function(r){
                    if (!r) return;
                    setTimeout(function(){
                        r.style.opacity = 1;
                    }, 0);
                }}
            >
                { pointerStyle && <div className="cursor-zoom-pointer" style={pointerStyle} /> }
                <div className="inner">{ children }</div>
            </div>

        );
    }

}


export default class CursorComponent extends React.Component {

    static defaultProps = {
        'cursorOffset'      : {
            x: 0,
            y: 0
        },
        'scale'             : 3,
        'visibilityMargin'  : null,
        'style'             : null,
        'width'             : 300,
        'height'            : 100,
        'containingElement' : null,
        // In lieu of containingElement:
        'containingWidth'   : 200,
        'containingHeight'  : 200,
        'offsetLeft'        : 0,
        'offsetTop'         : 0,
        'debugStyle'        : false
    };

    constructor(props){
        super(props);
        this.visibilityMargin = this.visibilityMargin.bind(this);
        this.getHoverComponentDimensions = this.getHoverComponentDimensions.bind(this);
        this.getCursorContainmentDimensions = this.getCursorContainmentDimensions.bind(this);
        this.isVisible = this.isVisible.bind(this);
        this._onMouseMove = _.throttle(this._onMouseMove.bind(this), 50, { trailing: false });
        this._handleClick = this._handleClick.bind(this);

        this.state = {
            'x'       : 0,
            'y'       : 0,
            'offsetX' : -1,
            'offsetY' : -1,
            'mounted' : false
        };

        // Reference to a DOM element in body that can hold absolutely-positioned overlays.
        this.overlaysRoot = null;

        // Will hold a literal DOM element reference which is appended to overlaysRoot.
        this.portalElement = null;
    }


    /**
     * @return {Offset} Offsets or margins from SVG for visibility. Defaults to 5 for top, right, bottom, & left unless set in props.
     */
    visibilityMargin(){
        const { visibilityMargin : vm } = this.props;
        const def = { 'top' : 0, 'right' : 0, 'bottom' : 0, 'left' : 0 };
        if (typeof vm === 'number'){
            return _.extend(def, { 'left' : vm });
        } else if (typeof vm === 'object' && vm){
            return _.extend(def, vm);
        }
        return def;
    }

    componentDidMount() {
        if (isServerSide()) return null;
        if (this.props.debug) console.log('Mounted CursorComponent');

        this.overlaysRoot = this.overlaysRoot || document.getElementById('overlays-root') || document.body;
        if (!this.overlaysRoot){
            throw new Error('No overlay root element to add cursor component to.');
        }

        if (!this.portalElement) {
            this.portalElement = document.createElement('div');
            if (this.portalElement.classList){
                this.portalElement.classList.add('cursor-component-root');
            }
            this.overlaysRoot.appendChild(this.portalElement);
        }

        WindowEventDelegator.addHandler('mousemove', this._onMouseMove);
        this.setState({ 'mounted' : true });
    }

    componentWillUnmount() {
        if (this.props.debug) console.log('Will unmount CursorComponent');
        WindowEventDelegator.removeHandler('mousemove', this._onMouseMove);

        this.overlaysRoot.removeChild(this.portalElement);
        this.portalElement = null;

        this.setState({ 'mounted' : false });
    }

    getHoverComponentDimensions(){
        const { style, width, height } = this.props;
        return {
            'width'  : (style && style.width)  || width,
            'height' : (style && style.height) || height
        };
    }

    getCursorContainmentDimensions(){
        const { containingElement, containingWidth, containingHeight } = this.props;
        if (containingElement && typeof containingElement.clientHeight === 'number'){
            return {
                width : containingElement.clientWidth,
                height : containingElement.clientHeight
            };
        }
        return {
            width : containingWidth,
            height : containingHeight
        };
    }

    isVisible(cursorContainmentDims = null, visibilityMargin = null){
        const { isVisible, sticky, debugStyle } = this.props;
        const { offsetX, offsetY } = this.state;
        if (typeof isVisible === 'boolean') return isVisible;
        if (sticky) return true;
        if (debugStyle) return true;
        if (!cursorContainmentDims) cursorContainmentDims = this.getCursorContainmentDimensions();
        if (!visibilityMargin) visibilityMargin = this.visibilityMargin();
        return (
            offsetY - visibilityMargin.bottom < cursorContainmentDims.height &&
            offsetX - visibilityMargin.right < cursorContainmentDims.width &&
            offsetY + visibilityMargin.top > 0 &&
            offsetX + visibilityMargin.left > 0
        );
    }

    _onMouseMove(e){
        const { containingElement, offsetLeft, offsetRight, sticky, horizontalAlign, debugStyle } = this.props;
        if (sticky) return;

        const offset = layout.getElementOffset(containingElement) || { 'left' : offsetLeft || 0, 'top' : offsetRight || 0 };
        const scrollX = (typeof window.pageXOffset !== 'undefined') ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft;
        const scrollY = (typeof window.pageYOffset !== 'undefined') ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;

        const onRightSide = horizontalAlign === 'auto' && e.clientX + scrollX > (
            //(this.props.containingElement && this.props.containingElement.clientWidth) ||
            (document && document.body && document.body.clientWidth) ||
            (window && window.innerWidth)
        ) / 2;

        if (debugStyle){
            this.setState({
                x : offset.left + 100,
                y : offset.top + 100,
                offsetX : 100,
                offsetY : 100,
                onRightSide : onRightSide
            });
        } else {
            this.setState({
                x: e.clientX + scrollX, //(window.scrollX || window.pageXOffset),
                y: e.clientY + scrollY, //(window.scrollY || window.pageYOffset),
                offsetX: e.clientX + scrollX - offset.left,
                offsetY: e.clientY + scrollY - offset.top,
                onRightSide : onRightSide
            });
        }
    }

    _handleClick(e) {
        if (this.props.onClick) {
            this.props.onClick(e);
        }
    }

    render(){
        if (!this.state.mounted || !this.portalElement) return null;

        const isVisible = this.isVisible();
        const hoverComponentDimensions = this.getHoverComponentDimensions();
        const passedProps = _.extend(
            _.pick(this.props, 'sticky', 'schemas', 'children', 'style', 'className', 'onMouseLeave', 'pointerStyle', 'cursorOffset'),
            _.pick(hoverComponentDimensions, 'width', 'height'),
            { isVisible, 'onClick' : this._handleClick },
            this.state
        );

        if (typeof this.props.xCoordOverride === 'number'){
            passedProps.x = this.props.xCoordOverride;
        }

        return ReactDOM.createPortal(<CursorContent {...passedProps} />, this.portalElement);
    }
}
