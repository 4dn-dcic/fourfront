'use strict';

var React = require('react');
var Collapse = require('react-bootstrap').Collapse;
var { console } = require('./../../util');

var PartialList = module.exports = React.createClass({

    statics : {

        /**
         * Bootstrap 'Row' component which may be used in PartialList's props.collapsible or props.persistent.
         * Renders two row columns: one for props.label and one for props.value or props.children.
         * 
         * @memberof module:item-pages/components.PartialList
         * @namespace
         * @prop {Component|Element|string} label - Label to use in left column.
         * @prop {Component|Element|string} value - Value to use in right column.
         * @prop {string} className - Classname to add to '.row.list-item'.
         * @prop {number} colSm - Grid size (1-12) of label column at *small* screen sizes.
         * @prop {number} colMd - Grid size (1-12) of label column at *medium* screen sizes.
         * @prop {number} colLg - Grid size (1-12) of label column at *large* screen sizes.
         * @prop {Component|Element|string} title - Alias for props.label.
         * @prop {Component|Element|string} children - Alias for props.value.
         */
        Row : React.createClass({

            getDefaultProps : function(){
                return {
                    'colSm' : 12,
                    'colMd' : 4,
                    'colLg' : 4,
                    'className' : ''
                };
            },

            render : function(){
                var valSm = 12 - this.props.colSm;
                var valMd = 12 - this.props.colMd;
                var valLg = 12 - this.props.colLg;
                if (valSm < 3) valSm = 12;
                if (valMd < 3) valMd = 12;
                if (valLg < 3) valLg = 12;
                return (
                    <div className={"row list-item " + this.props.className}>
                        <div className={"item-label col-sm-"+ this.props.colSm +" col-md-"+ this.props.colMd +" col-lg-"+ this.props.colLg}>
                            <div className="inner">
                                { this.props.label || this.props.title || "Label" }
                            </div>
                        </div>
                        <div className={"item-value col-sm-"+ valSm +" col-md-"+ valMd +" col-lg-"+ valLg}>
                            <div className="inner">
                                { this.props.value || this.props.val || this.props.children || "Value" }
                            </div>
                        </div>
                    </div>
                );
            }
        })
    },

    getDefaultProps : function(){
        return {
            'className' : null,
            'containerClassName' : null,
            'containerType' : 'div',
            'persistent' : [],
            'collapsible' : [],
            'open' : null
        };
    },

    getInitialState : function(){
        if (this.props.open === null) return { 'open' : false };
        else return null;
    },

    render : function(){
        //console.log('render partial list',this.props.open, this.props.collapsible);
        return (
            <div className={this.props.className}>

                { React.createElement(this.props.containerType, { 'className' : this.props.containerClassName }, this.props.persistent || this.props.children) }

                { this.props.collapsible.length > 0 ?
                <Collapse in={this.props.open === null ? this.state.open : this.props.open}>
                    <div>
                        { React.createElement(this.props.containerType, { 'className' : this.props.containerClassName }, this.props.collapsible) }
                    </div>
                </Collapse>
                : null }
            </div>
        );  

    }

});