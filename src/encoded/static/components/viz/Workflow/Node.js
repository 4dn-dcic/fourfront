'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { console } from './../../util';


export default class Node extends React.Component {

    static isSelected(currentNode, selectedNode){
        if (!selectedNode) return false;
        if (selectedNode === currentNode) return true;
        if (selectedNode.id && currentNode.id && selectedNode.id === currentNode.id) return true;
        if (selectedNode.name && currentNode.name && selectedNode.name === currentNode.name) return true;
        //if (
        //    _.isEqual(
        //        _.omit(selectedNode, 'nodesInColumn', 'x', 'y', 'column'),
        //        _.omit(currentNode, 'nodesInColumn', 'x', 'y', 'column')
        //    )
        //) return true;
        return false;
    }

    static propTypes = {
        'title' : PropTypes.func.isRequired
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.icon = this.icon.bind(this);
        this.tooltip = this.tooltip.bind(this);
        this.isSelected = this.isSelected.bind(this);
    }

    innerStyle(){
        if (this.props.node.type === 'input' || this.props.node.type === 'output'){
            return {
                width : (this.props.columnWidth || 100)
            };
        }
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

    tooltip(title = null){
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
            (this.props.title(node, false)) +
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

    isSelected(){
        return Node.isSelected(this.props.node, this.props.selectedNode);
    }

    render(){
        var node        = this.props.node,
            title       = this.props.title(node, true),
            tooltip     = this.tooltip(title),
            disabled    = typeof node.disabled !== 'undefined' ? node.disabled : null,
            className   = "node node-type-" + node.type;

        if (disabled === null && typeof this.props.isNodeDisabled === 'function'){
            disabled = this.props.isNodeDisabled(node);
        }

        if      (disabled)                                   className += ' disabled';
        if      (typeof this.props.className === 'function') className += ' ' + this.props.className(node);
        else if (typeof this.props.className === 'string'  ) className += ' ' + this.props.className; 

        return (
            <div
                className={className}
                data-node-key={node.id || node.name}
                data-node-type={node.type}
                data-node-global={node.isGlobal || null}
                data-node-selected={this.isSelected() || null}
                style={{
                    'top' : node.y,
                    'left' : node.x,
                    'width' : this.props.columnWidth || 100
                }}
            >
                <div
                    className="inner"
                    style={this.innerStyle()}
                    onMouseEnter={this.props.onMouseEnter}
                    onMouseLeave={this.props.onMouseLeave}
                    data-tip={tooltip}
                    data-place="top"
                    data-html
                    onClick={disabled ? null : this.props.onClick}
                >
                    <span className="node-name">{ this.icon() }{ title }</span>
                </div>
            </div>
        );
    }

}
