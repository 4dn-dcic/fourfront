'use strict';

var React = require('react');
import createReactClass from 'create-react-class';
var ReactDOM = require('react-dom');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { console, object, isServerSide, layout } = require('./../../util');

/**
 * Deprecated. Magnifies an SVG component into a viewport which appears over mouse cursor.
 * Informed by https://github.com/CarMax/react-cursor-zoom/blob/master/src/cursor-zoom.jsx, for use on existing components (SVGs).
 * 
 * @deprecated
 * @class ZoomCursor
 */
var ZoomCursor = createReactClass({

    getDefaultProps : function(){
        return {
            'size' : 160,
            'cursorOffset': { x: 0, y: 0 },
            'scale' : 3,
            'visibilityMargin' : null,
            'style' : null
        };
    },

    getInitialState : function(){
        return {
            x : 0,
            y : 0,
            offsetX : -1,
            offsetY : -1,
            mounted : false
        };
    },

    /**
     * @typedef {Object} Offset
     * @property {number} top     Top margin or offset.
     * @property {number} right   Right margin or offset.
     * @property {number} bottom  Bottom margin or offset.
     * @property {number} left    Left margin or offset.
     */

    /** @return {Offset} Offsets or margins from SVG for visibility. Defaults to 5 for top, right, bottom, & left unless set in props. */
    visibilityMargin : function(){
        var def = { 'top' : 5, 'right' : 5, 'bottom' : 5, 'left' : 5 };
        if        (typeof this.props.visibilityMargin === 'number'){
            return _.extend(def, {
                'left'   : this.props.visibilityMargin
            });
        } else if (typeof this.props.visibilityMargin === 'object' && this.props.visibilityMargin){
            return _.extend(def, this.props.visibilityMargin);
        }
        return def;
    },

    componentDidMount : function() {
        if (isServerSide()) return null;
        if (!this.portalElement) {
            this.portalElement = document.createElement('div');
            document.body.appendChild(this.portalElement);
        }
        document.addEventListener('mousemove', this._onMouseMove);
        this.setState({ 'mounted' : true });
    },

    componentWillUnmount : function() {
        document.removeEventListener('mousemove', this._onMouseMove);
        document.body.removeChild(this.portalElement);
        this.portalElement = null;
    },

    getBaseDimensions : function(){
        return {
            'width'  : ((this.props.style && this.props.style.width)  || this.props.width ) || (this.refs && this.refs.base && this.refs.base.clientWidth ),
            'height' : ((this.props.style && this.props.style.height) || this.props.height) || (this.refs && this.refs.base && this.refs.base.clientHeight)
        };
    },

    scaleSVGChildrenComponent : function(svg, baseDimensions = null){
        if (!baseDimensions) baseDimensions = this.getBaseDimensions();
        return React.cloneElement(
            svg,
            {
                'viewBox' : '0 0 ' + baseDimensions.width + ' ' + baseDimensions.height,
                'style' : _.extend({}, svg.props.style, {
                    'width'  : baseDimensions.width  * this.props.scale,
                    'height' : baseDimensions.height * this.props.scale
                })
                
            },
            svg.props.children
        );
    },
    
    isVisible : function(baseDimensions = null, visibilityMargin = null){
        if (!baseDimensions) baseDimensions = this.getBaseDimensions();
        if (!visibilityMargin) visibilityMargin = this.visibilityMargin();
        return (
            this.state.offsetY - visibilityMargin.bottom < baseDimensions.height &&
            this.state.offsetX - visibilityMargin.right < baseDimensions.width &&
            this.state.offsetY + visibilityMargin.top > 0 &&
            this.state.offsetX + visibilityMargin.left > 0
        );
    },

    componentDidUpdate : function() {
        
        if (!this.state.mounted) return;
        var baseDimensions = this.getBaseDimensions();
        var isVisible = this.isVisible();

        ReactDOM.render(React.createElement(ZoomCursor.Magnifier, _.extend({
            size: this.props.size,
            scale : this.props.scale,
            base : baseDimensions,
            isVisible : isVisible,
            childSVG : isVisible ? this.scaleSVGChildrenComponent(this.props.children, baseDimensions) : null,
            cursorOffset: this.props.cursorOffset,
            borderSize: this.props.borderSize,
            borderColor: this.props.borderColor,
            pointerStyle: this.props.pointerStyle,
            onClick: this._handleClick,
            className : this.props.zoomClassName,
            onMouseLeave : this.props.onMouseLeave
        }, this.state)), this.portalElement);
    },

    _onMouseMove : _.throttle(function(e) {
        var offset = layout.getElementOffset(this.refs.base);
        //console.log('OFFSET', offset, layout.getElementOffset(this.refs.base))

        var scrollX = (typeof window.pageXOffset !== 'undefined') ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft;
        var scrollY = (typeof window.pageYOffset !== 'undefined') ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;

        this.setState({
            x: e.clientX + scrollX, //(window.scrollX || window.pageXOffset),
            y: e.clientY + scrollY, //(window.scrollY || window.pageYOffset),
            offsetX: e.clientX - offset.left,
            offsetY: e.clientY - offset.top
        });
    }, 100 /*, { trailing: false }*/ ),

    _handleClick : function(e) {
        if (this.props.onClick) {
            this.props.onClick(e);
        }
    },

    render : function(){
        return (
            <div
                className={"zoom-cursor-wrapper" + (this.props.className ? ' ' + this.props.className : '')}
                style={this.props.style}
                ref="base"
            >{ this.props.children }</div>
        );
    },

    statics : {
        Magnifier : createReactClass({
            
            getDefaultProps : function(){
                return {
                    'scale'     : 2,
                    'x'         : 0,
                    'y'         : 0,
                    'offsetX'   : -1,
                    'offsetY'   : -1,
                    'isVisible' : false
                };
            },

            componentDidUpdate : function(pastProps){
                if (this.props.isVisible === false && pastProps.isVisible === true){
                    if (typeof this.props.onMouseLeave === 'function'){
                        this.props.onMouseLeave();
                    }
                }
            },

            render : function(){

                if (!this.props.isVisible || !this.props.childSVG) return null;

                var halfSizeY = this.props.size / 2;
                var halfSizeX = this.props.size / 2;
                var magX, magY;
                magX = magY = this.props.scale;
                var bgX = -(this.props.offsetX * magX - halfSizeX);
                var bgY = -((this.props.offsetY + ((document && document.body && document.body.scrollTop) || 0)) * magY - halfSizeY);

                return (
                    <div
                        className={'cursor-zoom-magnifier-container'}
                        style={{
                            display: this.props.isVisible ? 'block' : 'none',
                            width: this.props.size,
                            height: this.props.size,
                            transform : vizUtil.style.translate3d(this.props.x, this.props.y),
                            marginLeft: -halfSizeX + this.props.cursorOffset.x,
                            marginTop: -halfSizeY + this.props.cursorOffset.y,
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

                            <div
                                className={'cursor-zoom-magnifier' + (this.props.className ? ' ' + this.props.className : '')}
                                style={{
                                    width: this.props.size,
                                    height: this.props.size,
                                    border: this.props.borderSize + ' solid ' + this.props.borderColor
                                }}
                                onClick={this._handleClick}
                            >
                                <div className="inner" style={{
                                    transform : vizUtil.style.translate3d(bgX, bgY),
                                    width : (this.props.base.width * this.props.scale),
                                    height : (this.props.base.height * this.props.scale)
                                }}>
                                    { this.props.childSVG }
                                </div>
                            </div>

                    </div>
                );

            }

        })
    }

});

module.exports.ZoomCursor = ZoomCursor;