'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { console } from './../../util';
import { requestAnimationFrame } from './../utilities';
import _ from 'underscore';
import { Fade } from 'react-bootstrap';



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
                    iconClass = 'cog';
                } else {
                    iconClass = 'question';
                }
            } else if (Array.isArray(formats)) {
                if (
                    formats[0] === 'File' ||
                    (formats[0] === 'null' && formats[1] === 'File')
                ){
                    iconClass = 'file-text-o';
                } else if (
                    (formats[0] === 'int' || formats[0] === 'string') ||
                    (formats[0] === 'null' && (formats[1] === 'int' || formats[1] === 'string'))
                ){
                    iconClass = 'cog';
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
        if (node.type === 'step'){
            output += '<small>Step ' + ((node.column - 1) / 2 + 1) + '</small>';
        } else {
            var nodeType = node.type;
            nodeType = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
            output += '<small>' + nodeType + '</small>';
        }

        // Required
        if (node.required){
            output+= ' <small style="opacity: 0.66;"> - <em>Required</em></small>';
        }

        

        // Title
        output += '<h5 class="text-600 tooltip-title">' +
            (this.props.titleString || node.title || node.name) +
            '</h5>';

        // Argument Type
        if (node.type === 'input' || node.type === 'output'){
            output += '<div><small>';
            
            if (Array.isArray(node.format) && node.format.length > 0){
                var formats = node.format.map(function(f){
                    if (f === 'File'){
                        if (node.meta && node.meta['sbg:fileTypes']){
                            var fileTypes = node.meta['sbg:fileTypes'].split(',').map(function(fType){
                                return '.' + fType.trim();
                            }).join(' | ');
                            return fileTypes;
                        }
                    }
                    return f;
                });
                output += 'Type: ' + formats.join(' | ') + '';
            } else if (typeof node.format === 'string') {
                output += 'Type: ' + node.format;
            } else {
                output += '<em>Unknown Type</em>';
            }
            output += '</small></div>';
        }

        if (node.type === 'input'){
            if (node.meta && node.meta['sbg:toolDefaultValue']){
                output += '<div><small>Default: "' + node.meta['sbg:toolDefaultValue'] + '"</small></div>';
            }
        }

        // Description
        if (typeof node.description === 'string'){
            output += '<div>' + node.description + '</div>';
        }

        return output; 
    }

    style(){
        if (this.props.node.type === 'input' || this.props.node.type === 'output'){
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


export default class Node extends React.Component {

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

    static isRelated(currentNode, selectedNode) {

        if (!selectedNode) return false;

        if (Node.isFromSameWorkflowType(currentNode, selectedNode)) return true;

        if (selectedNode.name && currentNode.name) {
            if (selectedNode.name === currentNode.name || _.any((currentNode.meta.source || []).concat(currentNode.meta.target || []), function(s){ return s.name === selectedNode.name; })) {
                // Make sure target.step == selectedNode.inputOf.name
                var i;
                if (currentNode.type === 'input' || currentNode.type === 'output'){
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
                if (currentNode.type === 'output'){
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
        if (typeof selectedNode.meta.workflow === 'string' && Array.isArray(currentNode.meta.source)){
            if (_.any(currentNode.meta.source, function(s){ return typeof s.workflow === 'string' && s.workflow === selectedNode.meta.workflow; })){
                return true;
            }
        }
        if (typeof currentNode.meta.workflow === 'string' && Array.isArray(selectedNode.meta.source)){
            if (_.any(selectedNode.meta.source, function(s){ return typeof s.workflow === 'string' && s.workflow === currentNode.meta.workflow; })){
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
    }

    isSelected(){ return Node.isSelected(this.props.node, this.props.selectedNode); }
    isRelated() { return Node.isRelated(this.props.node, this.props.selectedNode); }

    render(){
        var node        = this.props.node,
            disabled    = typeof node.disabled !== 'undefined' ? node.disabled : null,
            className   = "node node-type-" + node.type;

        if (disabled === null && typeof this.props.isNodeDisabled === 'function'){
            disabled = this.props.isNodeDisabled(node);
        }

        var selected = this.isSelected() || false;
        var related = this.isRelated() || false;

        if      (disabled)                                   className += ' disabled';
        if      (typeof this.props.className === 'function') className += ' ' + this.props.className(node);
        else if (typeof this.props.className === 'string'  ) className += ' ' + this.props.className;

        if (this.props.isCurrentContext){
            className += ' ' + 'current-context';
        }

        var visibleNodeProps = _.extend(_.omit(this.props, 'children', 'onMouseEnter', 'onMouseLeave', 'onClick', 'className', 'nodeElement'), {
            'disabled' : disabled,
            'selected' : selected,
            'related' : related
        });

        return (
            <div
                className={className}
                data-node-key={node.id || node.name}
                data-node-type={node.type}
                data-node-global={node.isGlobal || null}
                data-node-selected={selected}
                data-node-related={related}
                data-node-type-detail={node.format}
                style={{
                    'top' : node.y,
                    'left' : node.x,
                    'width' : this.props.columnWidth || 100,
                    'zIndex' : 2 + (node.indexInColumn || 0)
                }}
            >
                <div
                    className="inner"
                    onMouseEnter={this.props.onMouseEnter}
                    onMouseLeave={this.props.onMouseLeave}
                    onClick={disabled ? null : this.props.onClick}
                >{ this.props.renderNodeElement(node, visibleNodeProps) }</div>
            </div>
        );
    }

}
