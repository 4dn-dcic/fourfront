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
const Row = React.memo(function Row(props){
    const { colSm, colMd, colLg, className, label, title, value, val, children } = props;
    let valSm = 12 - colSm;
    let valMd = 12 - colMd;
    let valLg = 12 - colLg;
    if (valSm < 3) valSm = 12;
    if (valMd < 3) valMd = 12;
    if (valLg < 3) valLg = 12;
    return (
        <div className={"row list-item " + className}>
            <div className={"item-label col-sm-"+ colSm +" col-md-"+ colMd +" col-lg-"+ colLg}>
                <div className="inner">
                    { label || title || "Label" }
                </div>
            </div>
            <div className={"item-value col-sm-"+ valSm +" col-md-"+ valMd +" col-lg-"+ valLg}>
                <div className="inner">
                    { value || val || children || "Value" }
                </div>
            </div>
        </div>
    );
});
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

    static getDerivedStateFromProps(props, state){
        if (typeof props.open === 'boolean'){
            return { "open" : props.open };
        }
        return null;
    }

    constructor(props){
        super(props);
        this.state = { 'open' : false };
    }

    /** TODO implement handleToggle fxn and pass to child */

    render(){
        const { className, containerClassName, containerType, collapsible, persistent, children } = this.props;
        const { open } = this.state;
        return (
            <div className={"expandable-list " + (className || '')}>

                { React.createElement(containerType, { 'className' : containerClassName }, persistent || children) }

                { collapsible.length > 0 ?
                    <Collapse in={open}>
                        <div>
                            { React.createElement(containerType, { 'className' : containerClassName }, collapsible) }
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
