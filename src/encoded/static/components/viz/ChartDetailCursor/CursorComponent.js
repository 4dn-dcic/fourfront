'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'underscore';
import * as vizUtil from '../utilities';
import { console, object, isServerSide, layout } from './../../util';

/**
 * @typedef {Object} Offset
 * @property {number} top     Top margin or offset.
 * @property {number} right   Right margin or offset.
 * @property {number} bottom  Bottom margin or offset.
 * @property {number} left    Left margin or offset.
 */


class CursorContent extends React.Component {

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
        if (!this.props.isVisible || !this.props.children) return null;

        return (
            <div
                className={'cursor-component-container ' + (this.props.className || '') + (this.props.sticky ? ' sticky' : '')}
                style={{
                    display: this.props.isVisible ? 'block' : 'none',
                    width: this.props.width,
                    height: this.props.height,
                    transform : vizUtil.style.translate3d(this.props.x, this.props.y),
                    marginLeft: -(this.props.width / 2) + ((this.props.onRightSide ? -1 : 1) * this.props.cursorOffset.x),
                    marginTop: -(this.props.height / 2) + this.props.cursorOffset.y,
                    opacity : 0
                }}
                ref={function(r){
                    if (!r) return;
                    setTimeout(function(){
                        r.style.opacity = 1;
                    }, 0);
                }}
            >
                { this.props.pointerStyle && 
                    <div
                        className={'cursor-zoom-pointer'}
                        style={this.props.pointerStyle}
                    />
                }

                <div className={'inner' + (this.props.className ? ' ' + this.props.className : '')}>
                    { this.props.children }
                </div>

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
        'offsetTop'         : 0
    }


    constructor(props){
        super(props);
        this.visibilityMargin = this.visibilityMargin.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.getHoverComponentDimensions = this.getHoverComponentDimensions.bind(this);
        this.getCursorContainmentDimensions = this.getCursorContainmentDimensions.bind(this);
        this.isVisible = this.isVisible.bind(this);
        this._onMouseMove = _.throttle(this._onMouseMove.bind(this), 50, { trailing: false });
        this._handleClick = this._handleClick.bind(this);

        this.portalElement = null;
        this.state = {
            x       : 0,
            y       : 0,
            offsetX : -1,
            offsetY : -1,
            mounted : false
        };
    }


    /** 
     * @return {Offset} Offsets or margins from SVG for visibility. Defaults to 5 for top, right, bottom, & left unless set in props.
     */
    visibilityMargin(){
        var def = { 'top' : 0, 'right' : 0, 'bottom' : 0, 'left' : 0 };
        if        (typeof this.props.visibilityMargin === 'number'){
            return _.extend(def, {
                'left'   : this.props.visibilityMargin
            });
        } else if (typeof this.props.visibilityMargin === 'object' && this.props.visibilityMargin){
            return _.extend(def, this.props.visibilityMargin);
        }
        return def;
    }

    componentDidMount() {
        if (isServerSide()) return null;
        if (this.props.debug) console.log('Mounted CursorComponent');
        if (!this.portalElement) {
            this.portalElement = document.createElement('div');
            if (this.portalElement.classList){
                this.portalElement.classList.add('cursor-component-root');
            }
            document.body.appendChild(this.portalElement);
        }
        document.addEventListener('mousemove', this._onMouseMove);
        this.setState({ 'mounted' : true });
    }

    componentWillUnmount() {
        if (this.props.debug) console.log('Will unmount CursorComponent');
        document.removeEventListener('mousemove', this._onMouseMove);

        vizUtil.requestAnimationFrame(()=>{
            document.body.removeChild(this.portalElement);
            this.portalElement = null;
        });

        this.setState({ 'mounted' : false });   
    }

    componentDidUpdate() {
        if (!this.state.mounted || !this.portalElement) return;
        vizUtil.requestAnimationFrame(()=>{
            if (!this.state.mounted || !this.portalElement) return;
            //console.log('Updated CursorComponent', this.state);
            var hoverComponentDimensions = this.getHoverComponentDimensions();
            var isVisible = this.isVisible();

            var state = _.clone(this.state);
            if (typeof this.props.xCoordOverride === 'number') state.x = this.props.xCoordOverride;

            ReactDOM.render(React.createElement(CursorContent, _.extend({
                width: hoverComponentDimensions.width,
                height : hoverComponentDimensions.height,
                isVisible : isVisible,
                cursorOffset: this.props.cursorOffset,
                pointerStyle: this.props.pointerStyle,
                onClick: this._handleClick,
                className : this.props.className,
                onMouseLeave : this.props.onMouseLeave,
                style : this.props.style,
                children : this.props.children,
                sticky : this.props.sticky,
                schemas : this.props.schemas
            }, state)), this.portalElement);

        });
    }

    getHoverComponentDimensions(){
        return {
            'width'  : ((this.props.style && this.props.style.width)  || this.props.width ) || (this.refs && this.refs.base && this.refs.base.clientWidth ),
            'height' : ((this.props.style && this.props.style.height) || this.props.height) || (this.refs && this.refs.base && this.refs.base.clientHeight)
        };
    }

    getCursorContainmentDimensions(){
        if (this.props.containingElement && typeof this.props.containingElement.clientHeight === 'number'){
            return {
                width : this.props.containingElement.clientWidth,
                height : this.props.containingElement.clientHeight
            };
        }
        return {
            width : this.props.containingWidth,
            height : this.props.containingHeight
        };
    }

    isVisible(cursorContainmentDims = null, visibilityMargin = null){
        if (typeof this.props.isVisible === 'boolean') return this.props.isVisible;
        if (this.props.sticky) return true;
        if (this.props.debugStyle) return true;
        if (!cursorContainmentDims) cursorContainmentDims = this.getCursorContainmentDimensions();
        if (!visibilityMargin) visibilityMargin = this.visibilityMargin();
        return (
            this.state.offsetY - visibilityMargin.bottom < cursorContainmentDims.height &&
            this.state.offsetX - visibilityMargin.right < cursorContainmentDims.width &&
            this.state.offsetY + visibilityMargin.top > 0 &&
            this.state.offsetX + visibilityMargin.left > 0
        );
    }

    _onMouseMove(e){

        if (this.props.sticky) return;

        var offset = layout.getElementOffset(this.props.containingElement || this.refs.base) || { left : this.props.offsetLeft || 0, top: this.props.offsetRight || 0 };

        var scrollX = (typeof window.pageXOffset !== 'undefined') ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft;
        var scrollY = (typeof window.pageYOffset !== 'undefined') ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
        
        var onRightSide = this.props.horizontalAlign === 'auto' && e.clientX + scrollX > (
            //(this.props.containingElement && this.props.containingElement.clientWidth) || 
            (document && document.body && document.body.clientWidth) ||
            (window && window.innerWidth)
        ) / 2;

        if (this.props.debugStyle){
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
        return null;
    }
}
