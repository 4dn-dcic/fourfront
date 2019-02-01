'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import { console } from './../../util';
import { requestAnimationFrame } from './../utilities';
import _ from 'underscore';
import { Fade } from 'react-bootstrap';
import { traceNodePathAndRun } from './parsing-functions';


export class DefaultNodeElement extends React.PureComponent {

    static propTypes = {
        'node' : PropTypes.object,
        'disabled' : PropTypes.bool,
        'selected' : PropTypes.bool,
        'related'  : PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
        'columnWidth' : PropTypes.number
    }

    icon(){
        var iconClass;
        if (this.props.node.type === 'input' || this.props.node.type === 'output'){
            var formats = this.props.node.format;
            if (typeof formats === 'undefined'){
                iconClass = 'question';
            } else if (typeof formats === 'string') {
                formats = formats.toLowerCase();
                if (formats.indexOf('file') > -1){
                    iconClass = 'file-text-o';
                } else if (
                    formats.indexOf('parameter') > -1 || formats.indexOf('int') > -1 || formats.indexOf('string') > -1
                ){
                    iconClass = 'wrench';
                }
            }

        } else if (this.props.node.type === 'step'){
            iconClass = 'cogs';
        }
        if (!iconClass) return null;
        return <i className={"icon icon-fw icon-" + iconClass}/>;
    }

    tooltip(){
        var node = this.props.node;
        var output = '';

        // Node Type
        if (node.nodeType === 'step'){
            output += '<small>Step ' + ((node.column - 1) / 2 + 1) + '</small>';
        } else {
            var nodeType = node.nodeType;
            nodeType = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
            output += '<small>' + nodeType + '</small>';
        }

        // Title
        output += '<h5 class="text-600 tooltip-title">' +
            (node.title || node.name) +
            '</h5>';

        // Description
        if (typeof node.description === 'string' || (node.meta && typeof node.meta.description === 'string')){
            output += '<div>' + (node.description || node.meta.description) + '</div>';
        }

        return output; 
    }

    style(){
        if (this.props.node.nodeType === 'input' || this.props.node.nodeType === 'output'){
            return {
                width : (this.props.columnWidth || 100)
            };
        }
    }
    
    render(){
        var node = this.props.node;
        return (
            <div
                className="node-visible-element"
                data-tip={this.tooltip()}
                data-place="top"
                data-html
                style={this.style()}
            >
                <span className="node-name">{ this.icon() }{ this.props.title || node.title || node.name }</span>
            </div>
        );
    }
}


export default class Node extends React.PureComponent {

    /**
     * @param {Object} currentNode - Current node, e.g. node calling this function
     * @param {?Object} selectedNode - Currently-selected node reference for view.
     * @returns {boolean} True if currentNode matches selectedNode, and is thus the selectedNode.
     */
    static isSelected(currentNode, selectedNode){
        if (!selectedNode) return false;
        if (selectedNode === currentNode) return true;
        /* 
        // We shouldn't need the below and can just rely on a simple reference comparison
        // Keeping around for now/reference.
        if (typeof selectedNode.name === 'string' && typeof currentNode.name === 'string') {
            if (selectedNode.name === currentNode.name){
                // Case: IO node (which would have add'l self-generated ID to ensure uniqueness)
                if (typeof selectedNode.id === 'string'){
                    if (selectedNode.id === currentNode.id) return true;
                    return false;
                }
                return true;
            }
            return false;
        }
        */
        return false;
    }

    static isInSelectionPath(currentNode, selectedNode){
        if (!selectedNode) return false;

        function check(nodeBeingTraversed, prevNode, nextNodes){
            return Node.isSelected(currentNode, nodeBeingTraversed);
        }

        var selectedInputs = (selectedNode && (selectedNode.inputNodes || (selectedNode.outputOf && [selectedNode.outputOf]))) || null,
            selectedOutputs = (selectedNode && (selectedNode.outputNodes || selectedNode.inputOf)) || null,
            results;

        if (Array.isArray(selectedInputs) && selectedInputs.length > 0){
            results = _.flatten(_.map(selectedInputs, (sI)=>{
                return traceNodePathAndRun(sI, check, 'input', selectedNode);
            }), false);
            if (_.any(results)) return true;
        }

        if (Array.isArray(selectedOutputs) && selectedOutputs.length > 0){
            results = _.flatten(_.map(selectedOutputs, (sO)=>{
                return traceNodePathAndRun(sO, check, 'output', selectedNode);
            }), false);
            if (_.any(results)) return true;
        }

        return false;
    }

    /**
     * Returns list of common step nodes that input/output nodes
     * are both input into.
     */
    static findCommonStepNodesInputInto(){
        var nodes = Array.from(arguments),
            nodeInputOfLists = _.filter(_.pluck(nodes, 'inputOf'), function(ioList){ return Array.isArray(ioList) && ioList.length > 0; });

        if (nodeInputOfLists.length !== nodes.length) return false;
        return _.intersection(...nodeInputOfLists);
    }

    static isInputOfSameStep(){ return Node.findCommonStepNodesInputInto(...arguments).length > 0; }

    static isRelated(currentNode, selectedNode) {

        if (!selectedNode) return false;

        // Ensure that an argument name (as appears on a step input/output arg) matches selectedNode name.
        if (selectedNode.name === currentNode.name || _.any((currentNode._source || []).concat(currentNode._target || []), function(s){ return s.name === selectedNode.name; })) {
            if (currentNode.nodeType === 'input' || currentNode.nodeType === 'output') { // An output node may be an input of another node.
                return Node.isInputOfSameStep(currentNode, selectedNode);
            }
            if (currentNode.nodeType === 'input-group') {
                return Node.isInputOfSameStep(currentNode, selectedNode) && Node.isFromSameWorkflowType(currentNode, selectedNode);
            }
        }
        return false;
    }

    static isFromSameWorkflowType(currentNode, selectedNode){
        if (typeof currentNode.meta.workflow === 'string' && typeof selectedNode.meta.workflow === 'string' && selectedNode.meta.workflow === currentNode.meta.workflow){
            return true;
        }
        if (typeof selectedNode.meta.workflow === 'string' && Array.isArray(currentNode._source)){
            if (_.any(currentNode._source, function(s){ return typeof s.workflow === 'string' && s.workflow === selectedNode.meta.workflow; })){
                return true;
            }
        }
        if (typeof currentNode.meta.workflow === 'string' && Array.isArray(selectedNode._source)){
            if (_.any(selectedNode._source, function(s){ return typeof s.workflow === 'string' && s.workflow === currentNode.meta.workflow; })){
                return true;
            }
        }
        return false;
    }

    constructor(props){
        super(props);
        // Own memoized variants. Binding unnecessary most likely.
        this.isInSelectionPath  = memoize(Node.isInSelectionPath.bind(this));
        this.isRelated          = memoize(Node.isRelated.bind(this));
        this.isDisabled         = memoize(this.isDisabled.bind(this));
    }

    /** Scrolls the scrollable element to the current context node, if any. */
    componentDidMount(){
        var { 
            countInActiveContext, lastActiveContextNode,
            node, scrollContainerWrapperElement, columnWidth, columnSpacing
        } = this.props,
            sw = scrollContainerWrapperElement;

        if (
            node.isCurrentContext && sw &&
            (countInActiveContext === 1 || (countInActiveContext > 1 && lastActiveContextNode === node))
        ){
            var scrollLeft = sw.scrollLeft,
                containerWidth = sw.offsetWidth || sw.clientWidth,
                nodeXEnd = node.x + columnWidth + columnSpacing;

            if (nodeXEnd > (containerWidth + scrollLeft)){
                sw.scrollLeft = (nodeXEnd - containerWidth);
            }
        }
    }

    isDisabled(node, isNodeDisabled){
        if (typeof isNodeDisabled === 'function'){
            return isNodeDisabled(node);
        }
        if (typeof isNodeDisabled === 'boolean'){
            return isNodeDisabled;
        }
        return false;
    }

    render(){
        var { node, isNodeDisabled, className, columnWidth, renderNodeElement, selectedNode } = this.props,
            disabled         = typeof node.disabled !== 'undefined' ? node.disabled : this.isDisabled(node, isNodeDisabled),
            isCurrentContext = typeof node.isCurrentContext !== 'undefined' ? node.isCurrentContext : null,
            classNameList    = ["node", "node-type-" + node.nodeType],
            selected         = (!disabled && Node.isSelected(node, selectedNode)) || false,
            related          = (!disabled && this.isRelated(node, selectedNode)) || false,
            inSelectionPath  = selected || (!disabled && this.isInSelectionPath(node, selectedNode)) || false;

        if      (disabled)                        classNameList.push('disabled');
        if      (isCurrentContext)                classNameList.push('current-context');
        if      (typeof className === 'function') classNameList.push(className(node));
        else if (typeof className === 'string'  ) classNameList.push(className);

        var visibleNodeProps = _.extend(
            _.omit(this.props, 'children', 'onMouseEnter', 'onMouseLeave', 'onClick', 'className', 'nodeElement'),
            { disabled, selected, related, isCurrentContext, inSelectionPath }
        );

        return (
            <div className={classNameList.join(' ')} data-node-key={node.id || node.name}
                data-node-type={node.nodeType} data-node-global={node.meta && node.meta.global === true}
                data-node-selected={selected} data-node-in-selection-path={inSelectionPath}
                data-node-related={related} data-node-type-detail={node.ioType && node.ioType.toLowerCase()}
                data-node-column={node.column} style={{
                    'top'       : node.y,
                    'left'      : node.x,
                    'width'     : columnWidth || 100,
                    'zIndex'    : 2 + (node.indexInColumn || 0)
                }}>
                <div className="inner" children={renderNodeElement(node, visibleNodeProps)}
                    {..._.pick(this.props, 'onMouseEnter', 'onMouseLeave')} onClick={disabled ? null : this.props.onClick} />
            </div>
        );
    }

}
