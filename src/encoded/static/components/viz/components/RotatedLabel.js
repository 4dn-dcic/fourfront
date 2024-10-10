import React from 'react';
import _ from 'underscore';
import memoize from 'memoize-one';
import * as vizUtil from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';
import { console, isServerSide, layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

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
    'append'            : <i className="icon icon-caret-up fas"/>,
    'appendOffset'      : 0,
    'deRotateAppend'    : true,
    'debug'             : false
};

// TODO:
// Adjust so that outer .label-text element does not get offset dynamically in response to text height
// and instead the .inner element gets offset left and top (- labelHeight / 4 probably) if text is too high.
// Then adjust dimensioning of props.append so that is also bit more static (no top offset).
// This will improve positioning to be pixel-perfect, but is not too important at moment.


const RotatedLabelAxis = React.memo(function RotatedLabelAxis(props){
    const {
        placementWidth, placementHeight, angle, lineHeight, extraHeight, maxLabelWidth, append, debug,
        appendOffset, labelClassName = null, className = null, x, y, isMounted, deRotateAppend, term: propTerm, field: propField,
        labels = [
            { name: "Label1" }, { name: "Label 2 Extra Long Ok Maybe Longer", term: 'test2' }
        ]
    } = props;
    const maxTextHeight = RotatedLabel.maxTextHeight(placementWidth, lineHeight, extraHeight || 0);
    const labelWidth = Math.min(RotatedLabel.maxHypotenuse(placementHeight, angle), maxLabelWidth || 1000);
    return (
        <div className={"rotated-labels-axis " + (className || '')}>
            { _.map(labels, function(label, i){
                if (typeof label === 'string') label = { 'name' : label };
                const childProps = {
                    'label'             : label.name || "No Label",
                    'key'               : label.term || label.name || i,
                    'className'         : labelClassName || null,
                    'term'              : label.term || propTerm || null,
                    'field'             : label.field || propField || null,
                    'extraHeight'       : extraHeight || 0,
                    'x'                 : label.x || x || 0,
                    'y'                 : label.y || y || 0,
                    placementWidth, placementHeight, isMounted,
                    maxTextHeight, labelWidth, maxLabelWidth, deRotateAppend
                };
                if (typeof angle === 'number') childProps.angle = angle;
                else childProps.angle = 45;
                if (append)       childProps.append = append;
                if (debug)        childProps.debug = debug;
                if (lineHeight)   childProps.lineHeight = lineHeight;
                if (appendOffset) childProps.appendOffset = appendOffset;
                if (!appendOffset && deRotateAppend) childProps.appendOffset = 3;
                if (label.color)        childProps.color = label.color;
                return React.createElement(RotatedLabel, childProps);
            }) }
        </div>
    );
});


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
        return Math.floor(( 1 / Math.abs(Math.sin((angle / 180) * Math.PI) )) * height);
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
            'textHeight'  : null,
            'shortLabel'  : null,
            'expanded'    : null,
            'hover'       : false
        };

        this.textContainerRef = React.createRef();
    }

    componentDidMount(){
        const { label } = this.props, { textHeight } = this.state;
        if (textHeight === null && label){
            this.setState(this.getTextHeightState());
        }
    }

    getTextHeightState(){
        const { label, lineHeight, style } = this.props;
        let shortLabel  = null;
        let expanded    = null;
        const maxHeight = this.maxTextHeight();
        const textHeight = layout.textHeight(
            label,
            this.labelWidth(),
            'label-text',
            _.extend({}, style || {}, { 'lineHeight' : lineHeight + 'px' }),
            this.textContainerRef.current
        );

        if (textHeight > maxHeight){
            // maxHeight just aligns conveniently to be val of maxChars
            // TODO: In the future maybe some smarter logic could be used, such as
            // length of hypotenuse divided by avg character width (+~1px) in
            // context of maxTextHeight and maxLabelWidth.
            const maxChars = maxHeight;
            shortLabel = layout.shortenString(label, maxChars, true, ' ');
            expanded = false;
        }

        return { textHeight, shortLabel, expanded };
    }

    maxTextHeight(){
        const { maxTextHeight, placementWidth, lineHeight, extraHeight } = this.props;
        if (typeof maxTextHeight === 'number') return maxTextHeight;
        return RotatedLabel.maxTextHeight(placementWidth, lineHeight, extraHeight);
    }

    labelWidth(){
        const { labelWidth, placementHeight, angle, maxLabelWidth } = this.props;
        if (typeof labelWidth === 'number') return labelWidth;
        return Math.min( RotatedLabel.maxHypotenuse(placementHeight, angle), maxLabelWidth );
    }

    onMouseEnter(e){
        this.setState(function({ expanded, hover }){
            const nextExpanded = (typeof expanded === 'boolean' || null) && true;
            if (!hover || expanded !== nextExpanded){
                return { 'hover' : true, 'expanded' : nextExpanded };
            }
        });
    }

    onMouseLeave(e){
        this.setState(function({ expanded, hover }){
            const nextExpanded = (typeof expanded === 'boolean' || null) && false;
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
        const { append, appendOffset, angle, lineHeight, appendExpanded, deRotateAppend } = this.props;
        const { expanded,  } = this.state;
        if (!append) return null;

        let offTop = 0;
        let offRight = 0;

        if (appendOffset > 0){
            // Move appendor upwards by appendOffset, in context of angle/rotation.
            offRight = appendOffset * Math.sin(angle/180 * Math.PI);
            offTop = appendOffset * Math.cos(angle/180 * Math.PI);
        }

        const dims = {
            // right is same thing as adjacent (= right) = cotan(angle) * (opposite (= labelHeight) / 2)
            'right' : - ( (labelHeight / 2) / Math.tan(angle / 180 * Math.PI) ) - offRight,
            'top' : (labelHeight / 2) - offTop,
        };
        const innerStyle = {
            'position' : 'relative',
            'left' : - ((labelHeight - lineHeight) / 4) * Math.sin(angle/180 * Math.PI)
        };

        return (
            <span className="append" style={dims}>
                <div style={deRotateAppend ? { transform : vizUtil.style.rotate3d(Math.abs(angle), 'z') } : null}>
                    <div style={innerStyle}>
                        { (expanded && appendExpanded) ? appendExpanded : append }
                    </div>
                </div>
            </span>
        );
    }

    render(){
        const { lineHeight, angle, className, x, y, placementWidth, label, color, term: propTerm } = this.props;
        const { expanded, shortLabel, hover, textHeight } = this.state;
        const term = this.props['data-term'] || propTerm || null;
        const labelWidth = this.labelWidth();
        const labelHeight = Math.min(textHeight || lineHeight, this.maxTextHeight());
        const angleToUse = - Math.abs(angle);
        const fullClassName = (
            "rotated-label " + (className || '') + ((expanded && ' expanded') || '') +
            (hover ? ' hover' : '')
        );

        return (
            <div data-term={term} className={fullClassName} title={shortLabel ? label : null}
                style={{
                    transform : vizUtil.style.translate3d(x, y, 0),
                    width : placementWidth,
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

                    <span className="inner" style={lineHeight ? { 'lineHeight' : lineHeight + 'px' } : null }>
                        { color ?
                            <i className="icon icon-circle color-indicator fas" style={{ color }}/>
                            : null }
                        { expanded ? label : shortLabel || label }
                    </span>

                    { this.renderLabelAppend(labelHeight, labelWidth) }

                </span>
            </div>
        );
    }

}
