var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var { highlightTerm, unhighlightTerms } = require('./../../facetlist');
var { console, isServerSide, Filters, layout } = require('./../../util');

var RotatedLabel = module.exports = React.createClass({

    statics : {
        maxHypotenuse : function(height, angle){
            return (
                1 / Math.abs(Math.sin((angle / 180) * Math.PI)
            )) * height;
        }
    },

    getDefaultProps : function(){
        return {
            'label' : null,
            'title' : null,
            'angle' : 30,
            'maxLabelWidth' : 1000,
            'className' : null,
            'term' : null,
            'data-field' : null,
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
            'extraHeight' : 5

        };
    },

    render : function(){
        var label;
        var labelWidth = Math.min(
            RotatedLabel.maxHypotenuse(this.props.placementHeight, this.props.angle),
            this.props.maxLabelWidth
        );

        if (this.props.label) {
            label = this.props.label;
            var labelTextHeight = layout.textHeight(label, labelWidth, 'label-text', { fontSize : '0.85rem' });
            var extraLongText = false;
            if (labelTextHeight > (this.props.placementWidth / 2) + this.props.extraHeight){
                extraLongText = true;
                label = layout.concatString(label, 30, false);
            }
        } else {
            label = this.props.children;
        }

        return (
            <div
                data-term={this.props['data-term'] || this.props.term || null}
                className={this.props.className}
                style={{
                    transform : vizUtil.style.translate3d(this.props.x, this.props.y, 0),
                    width : this.props.placementWidth,
                    opacity : this.props.opacity
                }}
                title={extraLongText ? this.props.label : null}
            >
                <span className={"label-text" + (extraLongText ? ' extra-long' : '')} style={{
                    width: labelWidth,
                    left: 0 - parseInt(
                        labelWidth - (this.props.placementWidth / 2)
                    ),
                    transform : vizUtil.style.rotate3d(
                        typeof this.props.angle === 'number' ? 
                            - Math.abs(this.props.angle) : 
                            - (90 / (this.props.placementWidth * .1)), // If not set, rotate so 1 line will fit.
                        'z'
                    ), 
                }}>
                    { label }
                </span>
            </div>
        );
    }

});