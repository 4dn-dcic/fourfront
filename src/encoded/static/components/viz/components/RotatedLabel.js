import React from 'react';
import _ from 'underscore';
import memoize from 'memoize-one';
import * as vizUtil from './../utilities';
import { console, isServerSide, layout } from './../../util';

/**
 * If keep in RotatedLabel.statics, RotatedLabel doesn't exist at time that getDefaultProps() is hit.
 * @memberof viz/components.RotatedLabel
 * @type {Object}
 * @private
 */
const commonDefaultProps = {
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



class RotatedLabelAxis extends React.PureComponent {

    static defaultProps = _.extend({}, commonDefaultProps, {
        'labels' : [
            { name : "Label1" }, { name : "Label 2 Extra Long Ok Maybe Longer", term: 'test2' }
        ],
        'labelClassName' : null,
        //'availWidth' : 200, // ToDo calculate X coord positions on labels along this 0...N range if not present.
        'className' : null,
    });


    render(){
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
                        'label'             : label.name || "No Label",
                        'key'               : label.term || label.name || i,
                        'className'         : props.labelClassName || null,
                        'term'              : label.term || props.term || null,
                        'field'             : label.field || props.field || null,
                        'extraHeight'       : props.extraHeight || 0,
                        'x'                 : label.x || props.x || 0,
                        'y'                 : label.y || props.y || 0,
                        'placementWidth'    : props.placementWidth,
                        'placementHeight'   : props.placementHeight,
                        'isMounted'         : props.isMounted,
                        'maxTextHeight'     : maxTextHeight,
                        'labelWidth'        : labelWidth,
                        'maxLabelWidth'     : props.maxLabelWidth,
                        'deRotateAppend'    : props.deRotateAppend
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
}


/**
 * A label meant to be place along an X-axis.
 * Given an angle, label text, placementHeight, and other properties, calculates
 * visible portion of label and rotates it. Handles showing full label onHover.
 * Optionally adds a directional pointer icon to tail of label.
 *
 * @prop {number} angle - Angle of label rotation. Defaults to 30.
 * @prop {number} placementWidth - How wide along the X axis is the object to be labeled. Defaults to 60.
 * @prop {number} placementHeight - How much height, +~10px, is available for the label(s). Defaults to 50.
 * @prop {boolean} isMounted - Pass true if we are not server-side and/or if parent component is mounted. Will not render anything unless this is true. Defaults to false.
 * @prop {number} lineHeight - Line height of label, in px. Defaults to 14. Recommended to leave 14px as CSS stylesheet is set up for this value.
 * @prop {boolean} deRotateAppend - If true, caret or other appendage will be de-rotated from props.angle. Defaults to 14.
 * @prop {Element|Component|string} append - A React Element or Component to append at tail of label, centered at bottom of X axis placement. Defaults to an upwards-pointing caret.
 */
export class RotatedLabel extends React.PureComponent {

    static Axis = RotatedLabelAxis;

    /**
     * @param {number} height - Available height.
     * @param {number} angle - Angle to rotate.
     * @returns {number} Length of hypotenuse.
     */
    static maxHypotenuse = memoize(function(height, angle){
        return Math.floor((
            1 / Math.abs(Math.sin((angle / 180) * Math.PI)
        )) * height);
    });

    /**
     * @param {number} [placementWidth=60] Available width.
     * @param {number} [lineHeight=14] Line height, in px.
     * @param {number} [extraHeight=0] Extra height to give.
     * @returns {number} Maximum hypotenuse length.
     */
    static maxTextHeight = memoize(function(placementWidth = 60, lineHeight = 14, extraHeight = 0){
        return Math.max(lineHeight,
            typeof lineHeight === 'number' ?
                ((Math.floor(placementWidth / lineHeight) - 2) * lineHeight) // Max lines fit - 2
                : ((placementWidth / 2) + extraHeight)
        );
    });

    static defaultProps = _.extend({}, commonDefaultProps, {
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

    constructor(props){
        super(props);
        this.getTextHeightState = this.getTextHeightState.bind(this);
        this.maxTextHeight = this.maxTextHeight.bind(this);
        this.labelWidth = this.labelWidth.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);

        // State is null unless text is too long and we need a 'show full label' state.
        this.state = {
            textHeight  : null,
            shortLabel  : null,
            expanded    : null,
            hover       : false
        };

        this.textContainerRef = React.createRef();
    }

    componentDidMount(){
        if (this.state.textHeight === null && this.props.label){
            this.setState(this.getTextHeightState());
        }
    }

    getTextHeightState(){
        var textHeight,
            shortLabel  = null,
            expanded    = null,
            maxHeight   = this.maxTextHeight();

        textHeight = layout.textHeight(
            this.props.label,
            this.labelWidth(),
            'label-text',
            _.extend({}, this.props.style || {}, { lineHeight : this.props.lineHeight + 'px' }),
            this.textContainerRef.current
        );

        if (textHeight > maxHeight){
            shortLabel = layout.shortenString(this.props.label, 28, true);
            expanded = false;
        }

        return { textHeight, shortLabel, expanded };
    }

    maxTextHeight(){
        if (typeof this.props.maxTextHeight === 'number') return this.props.maxTextHeight;
        return RotatedLabel.maxTextHeight(this.props.placementWidth, this.props.lineHeight, this.props.extraHeight);
    }

    labelWidth(props = this.props){
        if (typeof props.labelWidth === 'number') return props.labelWidth;
        return Math.min(
            RotatedLabel.maxHypotenuse(props.placementHeight, props.angle),
            props.maxLabelWidth
        );
    }

    onMouseEnter(e){
        this.setState(function({ expanded, hover }){
            var nextExpanded = (typeof expanded === 'boolean' || null) && true;
            if (!hover || expanded !== nextExpanded){
                return { 'hover' : true, 'expanded' : nextExpanded };
            }
        });
        //this.state && typeof this.state.expanded === 'boolean' && !this.state.expanded && this.setState({ expanded : true });
    }

    onMouseLeave(e){
        this.setState(function({ expanded, hover }){
            var nextExpanded = (typeof expanded === 'boolean' || null) && false;
            if (hover || expanded !== nextExpanded){
                return { 'hover' : false, 'expanded' : nextExpanded };
            }
        });
    }

    /**
     * Render the pointer or other appendage for label, positioned at label.x + props.placementWidth / 2.
     *
     * @see http://mathforum.org/sarah/hamilton/ham.1side.1angle.html
     * @param {number} labelHeight
     * @param {number} labelWidth
     * @returns {ReactElement|null} The React element to append or null.
     */
    renderLabelAppend(labelHeight, labelWidth){
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
    }

    render(){
        var { lineHeight, angle, className, x, y, placementWidth, opacity, label, color } = this.props,
            { expanded, shortLabel, hover } = this.state,
            term = this.props['data-term'] || this.props.term || null,
            labelWidth = this.labelWidth(),
            labelHeight = Math.min(
                (this.state && this.state.textHeight) || lineHeight,
                this.maxTextHeight()
            ),
            angleToUse = - Math.abs(angle),
            fullClassName = (
                "rotated-label " + (className || '') + ((expanded && ' expanded') || '') +
                (hover ? ' hover' : '')
            );

        return (
            <div data-term={term} className={fullClassName} title={shortLabel ? label : null}
                style={{
                    transform : vizUtil.style.translate3d(x, y, 0),
                    width : placementWidth,
                    opacity : opacity,
                }}
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                ref={this.textContainerRef} >

                <span className={"label-text" + (shortLabel ? ' extra-long' : '')} style={{
                    width: labelWidth,
                    left: parseInt(
                        (placementWidth / 2) - labelWidth - (labelHeight * Math.cos(angle/180 * Math.PI))
                    ),
                    transform : vizUtil.style.rotate3d(angleToUse, 'z')
                }}>

                    <span className="inner" style={lineHeight ? {
                        lineHeight : lineHeight + 'px'
                    } : null }>
                        { color ?
                            <i className="icon icon-circle color-indicator" style={{ color }}/>
                        : null }
                        { expanded ? label : shortLabel || label }
                    </span>

                    { this.renderLabelAppend(labelHeight, labelWidth) }

                </span>
            </div>
        );
    }

}
