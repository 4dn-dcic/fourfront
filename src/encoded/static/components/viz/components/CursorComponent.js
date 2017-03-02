'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { console, object, isServerSide, layout } = require('./../../util');

var CursorComponent = module.exports = React.createClass({

    getDefaultProps : function(){
        return {
            'cursorOffset': {
                x: 0,
                y: 0
            },
            'scale' : 3,
            'visibilityMargin' : null,
            'style' : null,
            'width' : 300,
            'height' : 100,
            'containingElement' : null,
            // In lieu of containingElement:
            'containingWidth' : 200,
            'containingHeight' : 200,
            'offsetLeft' : 0,
            'offsetTop' : 0
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
        var def = { 'top' : 0, 'right' : 0, 'bottom' : 0, 'left' : 0 };
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
        console.log('Mounted CursorComponent');
        if (!this.portalElement) {
            this.portalElement = document.createElement('div');
            document.body.appendChild(this.portalElement);
        }
        document.addEventListener('mousemove', this._onMouseMove);
        this.setState({ 'mounted' : true });
    },

    componentWillUnmount : function() {
        console.log('Will unmount CursorComponent');
        document.removeEventListener('mousemove', this._onMouseMove);
        document.body.removeChild(this.portalElement);
        this.portalElement = null;
        this.setState({ 'mounted' : false });
    },

    getHoverComponentDimensions : function(){
        return {
            'width'  : ((this.props.style && this.props.style.width)  || this.props.width ) || (this.refs && this.refs.base && this.refs.base.clientWidth ),
            'height' : ((this.props.style && this.props.style.height) || this.props.height) || (this.refs && this.refs.base && this.refs.base.clientHeight)
        };
    },

    getCursorContainmentDimensions : function(){
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
    },

    isVisible : function(cursorContainmentDims = null, visibilityMargin = null){
        if (typeof this.props.isVisible === 'boolean') return this.props.isVisible;
        if (this.props.debugStyle) return true;
        if (!cursorContainmentDims) cursorContainmentDims = this.getCursorContainmentDimensions();
        if (!visibilityMargin) visibilityMargin = this.visibilityMargin();
        return (
            this.state.offsetY - visibilityMargin.bottom < cursorContainmentDims.height &&
            this.state.offsetX - visibilityMargin.right < cursorContainmentDims.width &&
            this.state.offsetY + visibilityMargin.top > 0 &&
            this.state.offsetX + visibilityMargin.left > 0
        );
    },

    componentDidUpdate : function() {
        if (!this.state.mounted) return;
        vizUtil.requestAnimationFrame(()=>{
            //console.log('Updated CursorComponent', this.state);
            var hoverComponentDimensions = this.getHoverComponentDimensions();
            var isVisible = this.isVisible();

            ReactDOM.render(React.createElement(CursorComponent.CursorContent, _.extend({
                width: hoverComponentDimensions.width,
                height : hoverComponentDimensions.height,
                isVisible : isVisible,
                cursorOffset: this.props.cursorOffset,
                pointerStyle: this.props.pointerStyle,
                onClick: this._handleClick,
                className : this.props.className,
                onMouseLeave : this.props.onMouseLeave,
                style : this.props.style,
                children : this.props.children
            }, this.state)), this.portalElement);

        });
    },

    _onMouseMove : _.throttle(function(e) {
        var offset = layout.getElementOffset(this.props.containingElement || this.refs.base) || { left : this.props.offsetLeft || 0, top: this.props.offsetRight || 0 };

        var scrollX = (typeof window.pageXOffset !== 'undefined') ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft;
        var scrollY = (typeof window.pageYOffset !== 'undefined') ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;

        if (this.props.debugStyle){
            this.setState({
                x : offset.left + 100,
                y : offset.top + 100,
                offsetX : 100,
                offsetY : 100
            });
        } else {
            this.setState({
                x: e.clientX + scrollX, //(window.scrollX || window.pageXOffset),
                y: e.clientY + scrollY, //(window.scrollY || window.pageYOffset),
                offsetX: e.clientX + scrollX - offset.left,
                offsetY: e.clientY + scrollY - offset.top
            });
        }
    }, 100, { trailing: false }),

    _handleClick : function(e) {
        if (this.props.onClick) {
            this.props.onClick(e);
        }
    },

    render : function(){
        return null;
    },

    statics : {

        CursorContent : React.createClass({

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
                if (!this.props.isVisible || !this.props.children) return null;

                var halfSizeY = this.props.height / 2;
                var halfSizeX = this.props.width / 2;

                return (
                    <div
                        className={'cursor-component-container ' + (this.props.className || '')}
                        style={{
                            display: this.props.isVisible ? 'block' : 'none',
                            width: this.props.width,
                            height: this.props.height,
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

                        <div className={'inner' + (this.props.className ? ' ' + this.props.className : '')}>
                            { this.props.children }
                        </div>

                    </div>

                );
            }

        })

    }


});