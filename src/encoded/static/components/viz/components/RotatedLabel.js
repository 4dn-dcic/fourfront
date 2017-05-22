var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { console, isServerSide, Filters, layout } = require('./../../util');

/**
 * If keep in RotatedLabel.statics, RotatedLabel doesn't exist at time that getDefaultProps() is hit.
 * @memberof viz/components.RotatedLabel
 * @type {Object}
 * @private
 */
var commonDefaultProps = {
    'angle'             : 30,
    'placementWidth'    : 60,
    'placementHeight'   : 50,
    'y'                 : 5,        // Top margin or offset
    'isMounted'         : false,    // Can't use some funcs in component without DOM so nothing is rendered until we are mounted.
    'lineHeight'        : 14,       // Pixels
    'maxLabelWidth'     : 1000,
    'extraHeight'       : 0,
    'append'            : <i className="icon icon-caret-up"/>,
    'appendOffset'      : 0,
    'deRotateAppend'    : true,
    'debug'             : false
};

// TODO: 
// Adjust so that outer .label-text element does not get offset dynamically in response to text height
// and instead the .inner element gets offset left and top (- labelHeight / 4 probably) if text is too high.
// Then adjust dimensioning of props.append so that is also bit more static (no top offset).
// This will improve positioning to be pixel-perfect, but is not too important at moment.

/**
 * Given an angle, label text, placementHeight, and other properties, calculates 
 * visible portion of label and rotates it. Handles showing full label onHover.
 * Optionally adds a directional pointer icon to tail of label.
 */
var RotatedLabel = module.exports = React.createClass({

    statics : {

        /**
         * @memberof module:viz/components.RotatedLabel
         * @static
         * @param {number} height - Available height.
         * @param {number} angle - Angle to rotate.
         * @returns {number} Length of hypotenuse.
         */
        maxHypotenuse : function(height, angle){
            return Math.floor((
                1 / Math.abs(Math.sin((angle / 180) * Math.PI)
            )) * height);
        },

        /**
         * @memberof module:viz/components.RotatedLabel
         * @static
         * @param {number} [placementWidth=60] Available width.
         * @param {number} [lineHeight=14] Line height, in px.
         * @param {number} [extraHeight=0] Extra height to give.
         * @returns {number} Maximum hypotenuse length.
         */
        maxTextHeight : function(placementWidth = 60, lineHeight = 14, extraHeight = 0){
            return Math.max(lineHeight,
                typeof lineHeight === 'number' ?
                    ((Math.floor(placementWidth / lineHeight) - 2) * lineHeight) // Max lines fit - 2
                    : ((placementWidth / 2) + extraHeight)
            );
        },

        /**
         * An Axis component which would generate and contain multiple RotatedLabel components, data for which is provided via props.labels.
         * @memberof module:viz/components.RotatedLabel
         * @namespace
         * @type {Component}
         * @prop {Object[]} labels - List of label objects containing 'name' and maybe 'term'.
         * @prop {string} labelClassName - Class name to give to rendered label <div> elements.
         * @prop {string} className - Outer <div> element class name, in addition to 'rotated-label-axis'.
        */
        Axis : React.createClass({

            /**
             * @memberof module:viz/components.RotatedLabel.Axis
             * @instance
             * @private
             * @returns {Object} Common default props.
            */
            getDefaultProps : function(){
                return _.extend({}, commonDefaultProps, {
                    'labels' : [
                        { name : "Label1" }, { name : "Label 2 Extra Long Ok Maybe Longer", term: 'test2' }
                    ],
                    'labelClassName' : null,
                    //'availWidth' : 200, // ToDo calculate X coord positions on labels along this 0...N range if not present.
                    'className' : null,
                });
            },

            render : function(){
                var props = this.props;
                var maxTextHeight = RotatedLabel.maxTextHeight(
                    props.placementWidth,
                    props.lineHeight,
                    props.extraHeight || 0
                );
                var labelWidth = Math.min(
                    RotatedLabel.maxHypotenuse(props.placementHeight, props.angle),
                    props.maxLabelWidth || 1000
                );
                return (
                    <div className={"rotated-labels-axis " + (props.className || '')}>
                        { props.labels.map(function(label, i){
                            if (typeof label === 'string') label = { name : label };
                            var childProps = {
                                label       : label.name || "No Label",
                                key         : label.term || label.name || i,
                                className   : props.labelClassName || null,
                                term        : label.term || props.term || null,
                                field       : label.field || props.field || null,
                                extraHeight : props.extraHeight || 0,
                                x           : label.x || props.x || 0,
                                y           : label.y || props.y || 0,
                                placementWidth : props.placementWidth,
                                placementHeight : props.placementHeight,
                                isMounted   : props.isMounted,
                                maxTextHeight : maxTextHeight,
                                labelWidth  : labelWidth,
                                maxLabelWidth : props.maxLabelWidth,
                                deRotateAppend : props.deRotateAppend
                            };
                            if (typeof props.angle === 'number') childProps.angle = props.angle;
                            else childProps.angle = 45;
                            if (props.append)       childProps.append = props.append;
                            if (props.debug)        childProps.debug = props.debug;
                            if (props.lineHeight)   childProps.lineHeight = props.lineHeight;
                            if (props.appendOffset) childProps.appendOffset = props.appendOffset;
                            if (!props.appendOffset && props.deRotateAppend) childProps.appendOffset = 3;
                            if (typeof label.opacity !== 'undefined')   childProps.opacity = label.opacity;
                            else if (typeof props.opacity !== 'undefined')   childProps.opacity = props.opacity;
                            if (label.color)        childProps.color = label.color;
                            return React.createElement(RotatedLabel, childProps);
                        }) }
                    </div>
                );
            }

        })

    },

    getDefaultProps : function(){
        return _.extend({}, commonDefaultProps, {
            'label'     : null,
            'title'     : null,
            'className' : null,
            'term'      : null,
            'field'     : null,
            'x'         : 0,
            'opacity'   : 1,
            'style'     : {
                fontSize    : '0.85rem',
                fontFamily  : 'Work Sans',
                fontWeight  : '400'
            },
        });
    },

    getInitialState : function(){
        
        var state = null; // State is null unless text is too long and we need a 'show full label' state.

        if (this.props.label && this.props.isMounted){
            state = {
                'textHeight' : layout.textHeight(
                    this.props.label,
                    this.labelWidth(),
                    'label-text',
                    _.extend({}, this.props.style || {}, { lineHeight : this.props.lineHeight + 'px' })
                )
            };
            if (state.textHeight > this.maxTextHeight()){
                state.shortLabel = layout.shortenString(this.props.label, 28, true);
                state.expanded = false;
            }
        }
        return state;
    },

    componentWillReceiveProps : function(nextProps){
        if (nextProps.isMounted) {
            if (this.refs && this.refs.container){
                nextProps.debug && console.log('Updating "' + nextProps.label + '" RotatedLabel.state.textHeight using refs.container. Old:', this.state.textHeight);
                this.setState({ 
                    'textHeight' : layout.textHeight(
                        nextProps.label,
                        this.labelWidth(nextProps),
                        'label-text',
                        _.extend({}, this.props.style || {}, { lineHeight : this.props.lineHeight + 'px' }),
                        this.refs.container
                    )
                }, nextProps.debug ? ()=> {
                    console.log('New:', this.state.textHeight);
                } : null);
            }
        }
    },

    maxTextHeight : function(){
        if (typeof this.props.maxTextHeight === 'number') return this.props.maxTextHeight;
        return RotatedLabel.maxTextHeight(this.props.placementWidth, this.props.lineHeight, this.props.extraHeight);
    },

    labelWidth : function(props = this.props){
        if (typeof props.labelWidth === 'number') return props.labelWidth;
        return Math.min(
            RotatedLabel.maxHypotenuse(props.placementHeight, props.angle),
            props.maxLabelWidth
        );
    },

    onMouseEnter : function(e){
        this.state && typeof this.state.expanded === 'boolean' && !this.state.expanded && this.setState({ expanded : true });
    },

    onMouseLeave : function(e){
        this.state && typeof this.state.expanded === 'boolean' && this.state.expanded && this.setState({ expanded : false });
    },

    /** 
     * Render the pointer or other appendage for label, positioned at label.x + props.placementWidth / 2.
     * 
     * @see http://mathforum.org/sarah/hamilton/ham.1side.1angle.html
     * @param {number} labelHeight
     * @param {number} labelWidth
     * @returns {ReactElement|null} The React element to append or null.
     */
    renderLabelAppend : function(labelHeight, labelWidth){
        if (!this.props.append) return null;
        
        var offTop = 0, offRight = 0;
        
        if (this.props.appendOffset > 0){
            // Move appendor upwards by appendOffset, in context of angle/rotation.
            offRight = this.props.appendOffset * Math.sin(this.props.angle/180 * Math.PI);
            offTop = this.props.appendOffset * Math.cos(this.props.angle/180 * Math.PI);
        }
        
        var dims = {
                // right is same thing as adjacent (= right) = cotan(angle) * (opposite (= labelHeight) / 2)
                right : - ( (labelHeight / 2) / Math.tan(this.props.angle/180 * Math.PI) ) - offRight,
                top : (labelHeight / 2) - offTop,
            },
            innerStyle = {
                position : 'relative',
                left : - ((labelHeight - this.props.lineHeight) / 4)
                        * Math.sin(this.props.angle/180 * Math.PI)
            };

        return (
            <span className="append" style={dims}>
                <div style={this.props.deRotateAppend ? { transform : vizUtil.style.rotate3d(Math.abs(this.props.angle), 'z') } : null}>
                    <div style={innerStyle}>
                    { (this.state && this.state.expanded && this.props.appendExpanded) ?
                        this.props.appendExpanded : this.props.append
                    }
                    </div>
                </div>
            </span>
        );
    },

    render : function(){
        var labelWidth = this.labelWidth();
        var labelHeight = Math.min(
            (this.state && this.state.textHeight) || this.props.lineHeight,
            this.maxTextHeight()
        );
        var angle = - Math.abs(this.props.angle);

        return (
            <div
                data-term={this.props['data-term'] || this.props.term || null}
                className={"rotated-label " + (this.props.className || '') + ' ' + ((this.state && this.state.expanded && 'expanded') || '')}
                style={{
                    transform : vizUtil.style.translate3d(this.props.x, this.props.y, 0),
                    width : this.props.placementWidth,
                    opacity : this.props.opacity,

                }}
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                title={this.state && this.state.shortLabel ? this.props.label : null}
                ref="container"
            >
                <span className={"label-text" + (this.state && this.state.shortLabel ? ' extra-long' : '')} style={{
                    width: labelWidth,
                    left: parseInt(
                        (this.props.placementWidth / 2) - labelWidth - (labelHeight * Math.cos(this.props.angle/180 * Math.PI))
                    ),
                    transform : vizUtil.style.rotate3d(angle, 'z')
                }}>

                    <span className="inner" style={this.props.lineHeight ? {
                        lineHeight : this.props.lineHeight + 'px'
                    } : null }>
                        { this.props.color ? 
                            <i className="icon icon-circle color-indicator" style={{ color : this.props.color }}/>
                        : null }
                        { this.state && this.state.expanded ? 
                            this.props.label
                            : (this.state && this.state.shortLabel) || this.props.label
                        }
                    </span>

                    { this.renderLabelAppend(labelHeight, labelWidth) }

                </span>
            </div>
        );
    }

});