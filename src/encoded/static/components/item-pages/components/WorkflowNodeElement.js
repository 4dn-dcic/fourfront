'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { console, Schemas } from './../../util';
import _ from 'underscore';



export class WorkflowNodeElement extends React.Component {

    static propTypes = {
        'node' : PropTypes.object.isRequired,
        'title': PropTypes.string.isRequired,
        'disabled' : PropTypes.bool,
        'selected' : PropTypes.bool,
        'related'  : PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
        'columnWidth' : PropTypes.number
    }

    doesRunDataFileExist(){
        var node = this.props.node;
        return (node.meta && node.meta.run_data && node.meta.run_data.file && typeof node.meta.run_data.file.display_title === 'string');
    }

    doesRunDataValueExist(){
        var node = this.props.node;
        return (node.meta && node.meta.run_data && node.meta.run_data.value && (typeof node.meta.run_data.value === 'string' || typeof node.meta.run_data.value === 'number'));
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
            this.props.titleString +
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

    containerStyle(){
        if (this.props.node.type === 'input' || this.props.node.type === 'output'){
            return {
                width : (this.props.columnWidth || 100)
            };
        }
    }

    aboveNodeTitle(){

        var elemProps = {
            'style' : { 'maxWidth' : this.props.columnWidth },
            'className' : "text-ellipsis-container above-node-title"
        };

        if (this.doesRunDataFileExist()){
            elemProps.className += ' mono-text';
            return <div {...elemProps}>{ this.props.title }</div>;
        }

        if (this.doesRunDataValueExist()){
            elemProps.className += ' mono-text';
            return <div {...elemProps}>{ this.props.title }</div>;
        }

        var node = this.props.node;
        if (
            node.type === 'step' && node.meta.uuid &&
            Array.isArray(node.meta.analysis_step_types) &&
            node.meta.analysis_step_types.length > 0
        ){
            return <div {...elemProps}>{  node.meta.analysis_step_types.map(Schemas.Term.capitalize).join(', ') }</div>;
        }

        return null;

    }

    belowNodeTitle(){
        var elemProps = {
            'style'     : { 'maxWidth' : this.props.columnWidth },
            'className' : "text-ellipsis-container below-node-title"
        };

        var node = this.props.node;

        if (node.meta && typeof node.meta.argument_format === 'string') {
            return <div {...elemProps}><span className="lighter"><span className="text-500">Format: </span>{ node.meta.argument_format }</span></div>;
        }

        if (node.type === 'step' && node.meta && node.meta.software_used && node.meta.software_used.title){
            if (typeof node.meta.software_used.name === 'string' && typeof node.meta.software_used.version === 'string'){
                return <div {...elemProps}>{ node.meta.software_used.name } <span className="lighter">v{ node.meta.software_used.version }</span></div>;
            }
            return <div {...elemProps}>{ node.meta.software_used.title }</div>;
        }

        return null;
    }

    nodeTitle(){
        if (this.doesRunDataFileExist()){
            return <span className="node-name">{ this.icon() }{ this.props.node.meta.run_data.file.accession || this.props.node.meta.run_data.file.display_title }</span>;
        }
        if (this.doesRunDataValueExist()){
            return <span className="node-name mono-text">{ this.icon() }{ this.props.node.meta.run_data.value }</span>;
        }
        return <span className="node-name mono-text">{ this.icon() }{ this.props.title }</span>;
    }
    
    render(){
        return (
            <div
                className="node-visible-element"
                data-tip={this.tooltip()}
                data-place="top"
                data-html
                style={this.containerStyle()}
            >
                { this.nodeTitle() }
                { this.belowNodeTitle() }
                { this.aboveNodeTitle() }
            </div>
        );
    }
}