'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { console } from './../../util';
import { requestAnimationFrame } from './../utilities';
import _ from 'underscore';
import { Fade } from 'react-bootstrap';
import { traceNodePathAndRun } from './parsing-functions';


export class DefaultNodeElement extends React.Component {

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

    static isRelated(currentNode, selectedNode) {

        if (!selectedNode) return false;

        if (Node.isFromSameWorkflowType(currentNode, selectedNode)) return true;

        if (selectedNode.name && currentNode.name) {
            if (selectedNode.name === currentNode.name || _.any((currentNode.meta.source || []).concat(currentNode.meta.target || []), function(s){ return s.name === selectedNode.name; })) {
                // Make sure target.step == selectedNode.inputOf.name
                var i;
                if (currentNode.nodeType === 'input' || currentNode.nodeType === 'output'){
                    if (((Array.isArray(selectedNode.inputOf) && selectedNode.inputOf[0] && selectedNode.inputOf[0].name) || 'a') === ((Array.isArray(currentNode.inputOf) && currentNode.inputOf[0] && currentNode.inputOf[0].name) || 'b')) return true;
                    if (Array.isArray(selectedNode.inputOf) && Array.isArray(currentNode.meta.target)){
                        for (i = 0; i < currentNode.meta.target.length; i++){
                            if (selectedNode.inputOf[0] && currentNode.meta.target[i].step === selectedNode.inputOf[0].name) {
                                return true;
                            }
                        }
                    }
                    // Check related workflow
                    

                }
                if (currentNode.nodeType === 'output'){
                    if (((selectedNode.outputOf && selectedNode.outputOf.name) || 'a') === ((currentNode.outputOf && currentNode.outputOf.name) || 'b')) return true;
                    if (selectedNode.outputOf !== 'undefined' && Array.isArray(currentNode.meta.source)){
                        for (i = 0; i < currentNode.meta.source.length; i++){
                            if (typeof selectedNode.outputOf !== 'undefined' && currentNode.meta.source[i].step === selectedNode.outputOf.name) {
                                return true;
                            }
                        }
                    }
                }
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
        /*
        if (Array.isArray(currentNode.meta.source) && Array.isArray(selectedNode.meta.source)){
            if (
                _.intersection(
                    _.pluck(_.filter(currentNode.meta.source, function(s){ return (typeof s.workflow === 'string'); }), 'workflow'),
                    _.pluck(_.filter(selectedNode.meta.source, function(s){ return (typeof s.workflow === 'string'); }), 'workflow')
                ).length > 0
            ) return true;
        }
        */
    }

    constructor(props){
        super(props);
        this.updateNodeElementData = this.updateNodeElementData.bind(this);
        this.render = this.render.bind(this);
        this.isSelected = this.isSelected.bind(this);
    }

    componentDidMount(){
        if (
            this.props.isCurrentContext
            && (this.props.countInActiveContext === 1 || (this.props.countInActiveContext > 1 && this.props.lastActiveContextNode === this.props.node))
            && this.props.scrollContainerWrapperElement
        ){
            var scrollWrapper = this.props.scrollContainerWrapperElement;
            var scrollLeft = scrollWrapper.scrollLeft;
            var containerWidth = scrollWrapper.offsetWidth || scrollWrapper.clientWidth;

            var nodeXEnd = this.props.node.x + this.props.columnWidth + this.props.columnSpacing;

            if (nodeXEnd > (containerWidth + scrollLeft)){
                scrollWrapper.scrollLeft = (nodeXEnd - containerWidth);
            }
        }
        this.updateNodeElementData();
    }

    componentDidUpdate(prevProps){
        if (this.props.node !== prevProps.node){
            this.updateNodeElementData();
        }
    }

    updateNodeElementData(props = this.props){
        if (this.refs && this.refs.nodeOuterElem){
            this.refs.nodeOuterElem.nodeData = {
                'node' : props.node,
                'reactInstance' : this
            };
        }
    }

    isSelected(){ return Node.isSelected(this.props.node, this.props.selectedNode); }
    isRelated() { return Node.isRelated(this.props.node, this.props.selectedNode); }

    isInSelectionPath(){
        if (!this.props.selectedNode) return false;
        return Node.isInSelectionPath(this.props.node, this.props.selectedNode);
    }

    render(){
        var node             = this.props.node,
            disabled         = typeof node.disabled !== 'undefined' ? node.disabled : null,
            isCurrentContext = typeof node.isCurrentContext !== 'undefined' ? node.isCurrentContext : null,
            classNameList    = ["node", "node-type-" + node.nodeType];

        if (disabled === null && typeof this.props.isNodeDisabled === 'function'){
            disabled = this.props.isNodeDisabled(node);
        }

        if (isCurrentContext === null && typeof this.props.isNodeCurrentContext === 'function'){
            isCurrentContext = this.props.isNodeCurrentContext(node);
        }

        var selected = this.isSelected() || false;
        var related = this.isRelated() || false;
        var inSelectionPath = selected || this.isInSelectionPath();

        if      (disabled)                                   classNameList.push('disabled');
        if      (isCurrentContext)                           classNameList.push('current-context');
        if      (typeof this.props.className === 'function') classNameList.push(this.props.className(node));
        else if (typeof this.props.className === 'string'  ) classNameList.push(this.props.className);

        var visibleNodeProps = _.extend(
            _.omit(this.props, 'children', 'onMouseEnter', 'onMouseLeave', 'onClick', 'className', 'nodeElement'),
            { disabled, selected, related, isCurrentContext, inSelectionPath }
        );

        return (
            <div
                className={classNameList.join(' ')}
                data-node-key={node.id || node.name}
                data-node-type={node.nodeType}
                data-node-global={node.meta && node.meta.global === true}
                data-node-selected={selected}
                data-node-in-selection-path={inSelectionPath}
                data-node-related={related}
                data-node-type-detail={node.ioType && node.ioType.toLowerCase()}
                data-node-column={node.column}
                style={{
                    'top' : node.y,
                    'left' : node.x,
                    'width' : this.props.columnWidth || 100,
                    'zIndex' : 2 + (node.indexInColumn || 0)
                }}
                ref="nodeOuterElem"
            >
                <div className="inner" children={this.props.renderNodeElement(node, visibleNodeProps)}
                    onMouseEnter={this.props.onMouseEnter} onMouseLeave={this.props.onMouseLeave} onClick={disabled ? null : this.props.onClick} />
            </div>
        );
    }

}
