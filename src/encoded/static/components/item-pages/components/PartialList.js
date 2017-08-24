'use strict';

import React from 'react';
import { Collapse } from 'react-bootstrap';
import { console } from './../../util';


/**
 * Bootstrap 'Row' component which may be used in PartialList's props.collapsible or props.persistent.
 * Renders two row columns: one for props.label and one for props.value or props.children.
 * 
 * @memberof module:item-pages/components.PartialList
 * @namespace
 * @type {Component}
 * @prop {Component|Element|string} label - Label to use in left column.
 * @prop {Component|Element|string} value - Value to use in right column.
 * @prop {string} className - Classname to add to '.row.list-item'.
 * @prop {number} colSm - Grid size (1-12) of label column at *small* screen sizes.
 * @prop {number} colMd - Grid size (1-12) of label column at *medium* screen sizes.
 * @prop {number} colLg - Grid size (1-12) of label column at *large* screen sizes.
 * @prop {Component|Element|string} title - Alias for props.label.
 * @prop {Component|Element|string} children - Alias for props.value.
 */
class Row extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render(){
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
}

Row.defaultProps = {
    'colSm' : 12,
    'colMd' : 4,
    'colLg' : 4,
    'className' : ''
};


/**
 * Renders a list using elements along the Bootstrap grid.
 * Takes two lists as props: 'persistent' and 'collapsible'. 
 * Persistent items are always visible, while collapsible are only shown if props.open is true.
 * 
 * @type {Component}
 * @prop {Component[]|Element[]|string[]} persistent    - React elements or components to always render. 
 * @prop {Component[]|Element[]|string[]} collapsible   - React elements or components to render conditionally.
 * @prop {boolean} open          - Show collapsed items or not.
 * @prop {string}  className     - Class name for outermost element.
 * @prop {string}  containerType - Type of element to use as container for the two lists. Defaults to 'div'.
 */
export class PartialList extends React.Component{

    static Row = Row

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        if (props.open === null) this.state = { 'open' : false };
        else this.state = null;
    }

    render(){
        //console.log('render partial list',this.props.open, this.props.collapsible);
        return (
            <div className={"expandable-list " + (this.props.className || '')}>

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

}

PartialList.defaultProps = {
    'className' : null,
    'containerClassName' : null,
    'containerType' : 'div',
    'persistent' : [],
    'collapsible' : [],
    'open' : null
};
