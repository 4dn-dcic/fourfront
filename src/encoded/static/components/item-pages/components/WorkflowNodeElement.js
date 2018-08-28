'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { console, Schemas, fileUtil, object } from './../../util';
import _ from 'underscore';
import { requestAnimationFrame } from './../../viz/utilities';



export class WorkflowNodeElement extends React.Component {

    static propTypes = {
        'node' : PropTypes.object.isRequired,
        'title': PropTypes.string,
        'disabled' : PropTypes.bool,
        'selected' : PropTypes.bool,
        'related'  : PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
        'columnWidth' : PropTypes.number
    }

    static ioFileTypes = new Set(['data file', 'QC', 'reference file', 'report']);

    static isNodeParameter(node){
        return node.ioType === 'parameter';
    }

    static isNodeFile(node){
        return WorkflowNodeElement.ioFileTypes.has(node.ioType);
    }

    static isNodeGroup(node){
        return ((node.nodeType || '').indexOf('group') > -1);
    }

    static doesRunDataExist(node){
        if (WorkflowNodeElement.isNodeGroup(node)){
            return (
                node.meta && node.meta.run_data && node.meta.run_data.file
                && Array.isArray(node.meta.run_data.file) && node.meta.run_data.file.length > 0 && typeof node.meta.run_data.file[0]['@id'] === 'string'
                /* && typeof node.meta.run_data.file.display_title === 'string'*/
            );
        } else if (WorkflowNodeElement.isNodeParameter(node)){
            return (node.meta && node.meta.run_data && (
                typeof node.meta.run_data.value === 'string' ||
                typeof node.meta.run_data.value === 'number' ||
                typeof node.meta.run_data.value === 'boolean'
            ));
        } else if (WorkflowNodeElement.isNodeFile(node)) { // Uncomment this in-line comment once all Workflows have been upgraded and have 'step.inputs[]|outputs[].meta.type'
            return (
                node.meta && node.meta.run_data && node.meta.run_data.file
                && typeof node.meta.run_data.file['@id'] === 'string'
                /* && typeof node.meta.run_data.file.display_title === 'string'*/
            );
        }
    }

    icon(){
        var node                = this.props.node,
            ioType              = node.ioType,
            nodeMetaType        = (node.meta && node.meta.type) || null,
            fileFormatAsString  = (node.meta && node.meta.file_format && (node.meta.file_format.file_format || node.meta.file_format.display_title)) || null,
            iconClass;

        if (node.nodeType === 'input-group' || node.nodeType === 'output-group'){
            iconClass = 'folder-open';
        } else if (node.nodeType === 'input' || node.nodeType === 'output'){
            // By file_format
            if (fileFormatAsString === 'zip' || fileFormatAsString === 'tar' || fileFormatAsString === 'gz') {
                iconClass = 'file-zip-o';
            }
            // By meta.type & ioType
            else if (typeof ioType === 'undefined'){
                iconClass = 'question';
            } else if (typeof ioType === 'string') {
                if (ioType === 'qc' || ioType === 'QC') {
                    iconClass = 'check-square-o';
                } else if (WorkflowNodeElement.isNodeParameter(node) || ioType.indexOf('int') > -1 || ioType.indexOf('string') > -1){
                    iconClass = 'wrench';
                } else if (WorkflowNodeElement.isNodeFile(node)){
                    iconClass = 'file-text-o';
                } else {
                    iconClass = 'question';
                }
            } else if (Array.isArray(ioType)) { // Deprecated?
                if (
                    ioType[0] === 'File' ||
                    (ioType[0] === 'null' && ioType[1] === 'File')
                ){
                    iconClass = 'file-text-o';
                } else if (
                    (ioType[0] === 'int' || ioType[0] === 'string') ||
                    (ioType[0] === 'null' && (ioType[1] === 'int' || ioType[1] === 'string'))
                ){
                    iconClass = 'wrench';
                }
            }

        } else if (node.nodeType === 'step'){
            iconClass = 'cogs';
        }
        if (!iconClass) return null;
        return <i className={"icon icon-fw icon-" + iconClass}/>;
    }

    tooltip(){
        var node            = this.props.node,
            output          = '',
            hasRunDataFile  = false;

        // Titles
        // Node Type -specific
        if (node.nodeType === 'step'){
            if (node.meta && node.meta.workflow){
                output += '<small>Workflow Run</small>'; // Workflow Run
            } else {
                output += '<small>Step</small>'; // Reg Step
            }
            // Step Title
            output += '<h5 class="text-600 tooltip-title">' + ((node.meta && node.meta.display_title) || node.title || node.name) + '</h5>';
        }

        if (node.nodeType === 'input-group'){
            output += '<small>Input Argument</small>';
        }

        if (node.nodeType === 'input' || node.nodeType === 'output'){
            var argumentName = node.nodeType;
            argumentName = argumentName.charAt(0).toUpperCase() + argumentName.slice(1);
            hasRunDataFile = WorkflowNodeElement.isNodeFile(node) && WorkflowNodeElement.doesRunDataExist(node);
            var fileTitle = hasRunDataFile && (node.meta.run_data.file.display_title || node.meta.run_data.file.accession);
            if (fileTitle) {
                output += '<small>' + argumentName + ' File</small>';
                output += '<h5 class="text-600 tooltip-title">' + fileTitle + '</h5>';
                output += '<hr class="mt-08 mb-05"/>';
            }
            if (argumentName === 'Input' || argumentName === 'Output'){
                argumentName += ' Argument &nbsp; <span class="text-500 mono-text">' + node.name + '</span>';
            }
            output += '<small class="mb-03 inline-block">' + argumentName + '</small>';
        }

        // If file, and has file-size, add it (idk, why not)
        var fileSize = hasRunDataFile && typeof node.meta.run_data.file.file_size === 'number' && node.meta.run_data.file.file_size;
        if (fileSize){
            output += '<div class="mb-05"><span class="text-300">Size:</span> ' + Schemas.Term.bytesToLargerUnit(node.meta.run_data.file.file_size) + '</div>';
        }

        // Workflow name, if any
        if (node.nodeType === 'step' && node.meta && node.meta.workflow && node.meta.workflow.display_title){ // Workflow
            //title 
            output += '<hr class="mt-08 mb-05"/><div class="mb-05 mt-08"><span class="text-600">Workflow: </span><span class="text-400">' + node.meta.workflow.display_title + '</span></div>';
        }

        // Description
        var description = (
            (typeof node.description === 'string' && node.description)
            || (node.meta && typeof node.meta.description === 'string' && typeof node.meta.description)
            || (node.meta.run_data && node.meta.run_data.meta && node.meta.run_data.meta.description)
            || (node.meta.run_data && node.meta.run_data.file && typeof node.meta.run_data.file === 'object' && node.meta.run_data.file.description)
        );
        if (description){
            output += '<hr class="mt-05 mb-05"/>';
            output += '<small class="mb-05 inline-block">' + description + '</small>';
        }

        return output; 
    }

    containerStyle(){
        if (this.props.node.nodeType === 'input' || this.props.node.nodeType === 'output'){
            return {
                width : (this.props.columnWidth || 100),
                opacity : 0 // We change this to one post-mount.
            };
        }
    }

    aboveNodeTitle(){

        var node                = this.props.node,
            fileFormat          = node.meta && node.meta.file_format, // Is a linkTo FileFormat Item (if not null)
            fileFormatAsString  = fileFormat && (fileFormat.file_format || fileFormat.display_title);

        var elemProps = {
            'style' : { 'maxWidth' : this.props.columnWidth },
            'className' : "text-ellipsis-container above-node-title"
        };

        if (node.nodeType === 'input-group'){
            return <div {...elemProps}>{ this.props.title }</div>;
        }

        // If WorkflowRun & Workflow w/ steps w/ name
        if (node.nodeType === 'step' && node.meta.workflow
            && Array.isArray(node.meta.workflow.steps)
            && node.meta.workflow.steps.length > 0
            && typeof node.meta.workflow.steps[0].name === 'string'
        ){
            //elemProps.className += ' mono-text';
            return <div {...elemProps}>{ _.pluck(node.meta.workflow.steps, 'name').join(', ') }</div>;
        }

        // If Parameter
        if (WorkflowNodeElement.isNodeParameter(node)){
            if (WorkflowNodeElement.doesRunDataExist(node)){
                elemProps.className += ' mono-text';
                return <div {...elemProps}>{ node.name }</div>;
            }
            return <div {...elemProps}>Parameter</div>;
        }

        // If File
        if (WorkflowNodeElement.isNodeFile(node)){
            //if (typeof node.meta.run_data.file.file_format === 'string' && node.meta.run_data.file.file_format !== 'other'){
            //    return <div {...elemProps}>{ node.meta.run_data.file.file_format }</div>;
            //}
            if (fileFormat) return <div {...elemProps}>{ fileFormatAsString }</div>;
            elemProps.className += ' mono-text';
            return <div {...elemProps}>{ this.props.title }</div>;
        }

        if ( // If Analysis Step
            node.nodeType === 'step' && node.meta.uuid &&
            Array.isArray(node.meta.analysis_step_types) &&
            node.meta.analysis_step_types.length > 0
        ){
            return <div {...elemProps}>{  node.meta.analysis_step_types.map(Schemas.Term.capitalize).join(', ') }</div>;
        }

        // If IO Arg w/o file but w/ format
        if ((node.nodeType === 'input' || node.nodeType === 'output') && fileFormat){
            return <div {...elemProps}>{ fileFormatAsString }</div>;
        }

        // Default-ish for IO node
        if (typeof node.ioType === 'string') {
            return <div {...elemProps}>{ Schemas.Term.capitalize(node.ioType) }</div>;
        }

        return null;

    }

    belowNodeTitle(){
        var elemProps = {
            'style'     : { 'maxWidth' : this.props.columnWidth },
            'className' : "text-ellipsis-container below-node-title"
        };

        var node = this.props.node;

        /*
        if (node.meta && typeof node.meta.argument_type === 'string') {
            return <div {...elemProps}><span className="lighter">{ node.meta.argument_type }</span></div>;
        }
        */
        /*
        if (node.meta && typeof node.meta.argument_format === 'string') {
            return <div {...elemProps}><span className="lighter"><span className="text-500">Format: </span>{ node.meta.argument_format }</span></div>;
        }
        */

        // STEPS -  SOFTWARE USED
        function softwareTitle(s, i){
            if (typeof s.name === 'string' && typeof s.version === 'string'){
                return [ i > 0 ? ', ' : null , s.name, ' ', <span className="lighter">v{ s.version }</span>];
            }
            return [i > 0 ? ', ' : null, s.title || s.display_title];
        }

        if (node.nodeType === 'step' && node.meta && Array.isArray(node.meta.software_used) && node.meta.software_used.length > 0 && node.meta.software_used[0].title){
            return <div {...elemProps}>{ _.map(node.meta.software_used, softwareTitle) }</div>;
        }


        if (WorkflowNodeElement.isNodeFile(node) && WorkflowNodeElement.doesRunDataExist(node)){
            var belowTitle;
            if (node.meta && node.meta.file_type){
                belowTitle = node.meta.file_type;
            } else if (node.meta && node.meta.run_data && node.meta.run_data.file && typeof node.meta.run_data.file === 'object' && node.meta.run_data.file.file_type){
                belowTitle = node.meta.run_data.file.file_type;
            } else {
                belowTitle = <small className="mono-text" style={{ 'bottom' : -15, 'color' : '#888' }}>{ node.name }</small>;
            }
            return <div {...elemProps}>{ belowTitle }</div>;
        }

        return null;
    }

    nodeTitle(){
        var node = this.props.node;

        if (node.nodeType === 'input-group'){
            var files = node.meta.run_data.file;
            if (Array.isArray(files)){
                var len = files.length - 1;
                return <span className="node-name">
                    { this.icon() }
                    <b>{ files.length - 1 }</b> similar file{ len === 1 ? '' : 's' }
                </span>;
            }
        }

        if (node.nodeType === 'step' && node.meta && node.meta.workflow && typeof node.meta.workflow === 'object' && node.meta.workflow.display_title && typeof node.meta.workflow.display_title === 'string'){
            return <span className="node-name">{ this.icon() }{ node.meta.workflow.display_title }</span>;
        }

        if (WorkflowNodeElement.isNodeFile(node) && WorkflowNodeElement.doesRunDataExist(node)){
            var file = node.meta.run_data.file;
            return <span className={"node-name" + (file.accession ? ' mono-text' : '')}>
                { this.icon() }
                { typeof file === 'string' ? node.ioType : file.accession || file.display_title }
            </span>;
        }

        if (WorkflowNodeElement.isNodeParameter(node) && WorkflowNodeElement.doesRunDataExist(node)){
            return <span className="node-name mono-text">{ this.icon() }{ node.meta.run_data.value }</span>;
        }

        // Fallback / Default - use node.name
        return <span className="node-name">{ this.icon() }{ node.title || node.name }</span>;
    }
    
    render(){
        var nodeTitle = <div className="innermost" data-tip={this.tooltip()} data-place="top" data-html>{ this.nodeTitle() }</div>;

        return (
            <div className="node-visible-element" style={this.containerStyle()} ref={(r)=>{
                if (r){
                    requestAnimationFrame(()=>{
                        r.style.opacity = "1";
                    });
                }
            }}>
                { nodeTitle }
                { this.belowNodeTitle() }
                { this.aboveNodeTitle() }
            </div>
        );
    }
}