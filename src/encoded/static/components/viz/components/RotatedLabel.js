var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { highlightTerm, unhighlightTerms } = require('./../../facetlist');
var { console, isServerSide, Filters, layout } = require('./../../util');

/**
 * Given an angle, label text, placementHeight, and other properties, calculates 
 * visible portion of label and rotates it. Handles showing full label onHover.
 * Optionally adds a directional pointer icon to tail of label.
 */
var RotatedLabel = module.exports = React.createClass({

    statics : {

        maxHypotenuse : function(height, angle){
            return (
                1 / Math.abs(Math.sin((angle / 180) * Math.PI)
            )) * height;
        },

        maxTextHeight : function(placementWidth = 60, lineHeight = 14, extraHeight = 0){
            return (
                typeof lineHeight === 'number' ?
                    (Math.floor(placementWidth / lineHeight) - 1) * lineHeight // Max lines fit - 1
                    : (placementWidth / 2) + extraHeight
            );
        },

        Axis : React.createClass({

            getDefaultProps : function(){
                return {
                    'angle' : 30,
                    'labels' : [
                        { name : "Label1" }, { name : "Label 2 Extra Long Ok Maybe Longer", term: 'test2' }
                    ],
                    'labelClassName' : null,
                    //'availWidth' : 200,
                    'placementWidth' : 60,
                    'placementHeight' : 50,
                    'y' : 5,
                    'isMounted' : false,
                    'lineHeight' : 14,
                    'maxLabelWidth' : 1000,
                    'className' : null
                };
            },

            render : function(){
                var props = this.props;
                var maxTextHeight = RotatedLabel.maxTextHeight(props.placementWidth, props.lineHeight, props.extraHeight || 0);
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
                                maxLabelWidth : props.maxLabelWidth
                            };
                            if (typeof props.angle === 'number') childProps.angle = props.angle;
                            else childProps.angle = 45;
                            if (props.append)       childProps.append = props.append;
                            if (props.lineHeight)   childProps.lineHeight = props.lineHeight;
                            if (typeof label.opacity !== 'undefined')   childProps.opacity = label.opacity;
                            else if (typeof props.opacity !== 'undefined')   childProps.opacity = props.opacity;
                            return React.createElement(RotatedLabel, childProps);
                        }) }
                    </div>
                );
            }

        })

    },

    getDefaultProps : function(){
        return {
            'label' : null,
            'title' : null,
            'angle' : 30,
            'maxLabelWidth' : 1000,
            'className' : null,
            'term' : null,
            'field' : null,
            'x' : 0,
            'y' : 5,
            'placementWidth' : 60,
            'placementHeight' : 50,
            'opacity' : 1,
            'style' : {
                fontSize : '0.85rem',
                fontFamily : 'Work Sans',
                fontWeight : '400'
            },
            'lineHeight' : 14,
            'extraHeight' : 5,
            'isMounted' : false, // IMPORTANT - Component relies on layout which relies on DOM being ready (not server-side).
            'append' : <i className="icon icon-caret-right icon-fw"/>,
            //'appendExpanded' : <i className="icon icon-caret-right icon-fw"/>
        };
    },

    getInitialState : function(){
        
        var state = null; // State is null unless text is too long and we need a 'show full label' state.

        if (this.props.label && this.props.isMounted){

            var state = {
                'textHeight' : layout.textHeight(
                    this.props.label,
                    this.labelWidth(),
                    'label-text',
                    { fontSize : '0.85rem', lineHeight : this.props.lineHeight + 'px' }
                )
            };
            console.log(this.maxTextHeight(), state.textHeight);
            if (state.textHeight > this.maxTextHeight()){
                state.shortLabel = layout.shortenString(this.props.label, 30, false);
                state.expanded = false;
            }
        }
        return state;
    },

    componentWillReceiveProps : function(nextProps){
        if (nextProps.isMounted) {
            if (this.refs && this.refs.container){
                console.log('Updating RotatedLabel.state.textHeight w/ refs.container.');
                this.setState({ 
                    textHeight : layout.textHeight(
                        nextProps.label,
                        this.labelWidth(nextProps),
                        'label-text',
                        { fontSize : '0.85rem' },
                        this.refs.container
                    )
                });
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

    render : function(){
        var labelWidth = this.labelWidth();
        var labelHeight = Math.min(
            (this.state && this.state.textHeight) || 0, 
            this.maxTextHeight()
        );

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
                    left: 0 - parseInt(
                        labelWidth - (this.props.placementWidth / 2) + (labelHeight * Math.cos(this.props.angle/180 * Math.PI))
                    ),
                    transform : vizUtil.style.rotate3d(
                        typeof this.props.angle === 'number' ? 
                            - Math.abs(this.props.angle) : 
                            - (90 / (this.props.placementWidth * .1)), // If not set, rotate so 1 line will fit.
                        'z'
                    ), 
                }}>
                    <span className="inner">{ this.state && this.state.expanded ? 
                        this.props.label
                        : (this.state && this.state.shortLabel) || this.props.label
                    }</span>

                    { this.props.append ?
                        <span className="append" style={{
                            right : - ( Math.max(labelHeight * Math.cos(this.props.angle/180 * Math.PI), 7) ),
                            top : labelHeight * .5 //Math.sin(this.props.angle/180 * Math.PI)
                            //top : Math.max(labelHeight / 2, 7)
                        }}>
                            { (this.state && this.state.expanded && this.props.appendExpanded) ?
                                this.props.appendExpanded : this.props.append
                            }
                        </span>
                    : null }

                </span>
            </div>
        );
    }

});