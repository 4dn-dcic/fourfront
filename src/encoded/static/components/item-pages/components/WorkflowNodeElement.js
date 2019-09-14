'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object, valueTransforms } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { expFxn } from './../../util';
import { ViewMetricButton } from './WorkflowDetailPane/FileDetailBodyMetricsView';


/** TODO codify what we want shown here and cleanup code - breakup into separate functional components */

export class WorkflowNodeElement extends React.PureComponent {

    static propTypes = {
        'node' : PropTypes.object.isRequired,
        'title': PropTypes.string,
        'disabled' : PropTypes.bool,
        'selected' : PropTypes.bool,
        'related'  : PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
        'columnWidth' : PropTypes.number
    };

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

    static isNodeQCMetric(node){
        if (node.ioType === 'qc') return true;
        if (node.ioType === 'report') return true;
        if (node.meta && node.meta.type === 'QC') return true;
        if (node.meta && node.meta.type === 'report') return true;
        if (node.meta && node.meta.run_data && node.meta.run_data.type === 'quality_metric') return true;
        return false;
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

    static getFileFormat(node){
        /** @see https://medium.com/@JasonCust/fun-with-destructuring-assignments-ba5717c8d7e **/
        const {
            meta : {
                file_format: metaFileFormat = null,
                run_data: nodeRunData = null
            }
        } = node;
        const { file : { file_format : fileFileFormat = null } = {} } = (nodeRunData || {});
        if (object.itemUtil.isAnItem(fileFileFormat)) {
            // The file_format attached to file itself (if any) is most accurate.
            return fileFileFormat;
        } else if (object.itemUtil.isAnItem(metaFileFormat)) {
            // This might be inaccurate if multiple files of different formats are in an array for same input/output argument.
            // Is only option available for when viewing a Workflow Item (vs WorkflowRun, Provenance Graph)
            return metaFileFormat;
        }
        return null;
    }

    static getFileFormatString(node){
        const fileFormatItem = WorkflowNodeElement.getFileFormat(node);

        if (!fileFormatItem) {

            const fileFormatStrDeprecated = (node.meta && typeof node.meta.file_format === 'string' && node.meta.file_format) || null;
            if (fileFormatStrDeprecated){
                return fileFormatStrDeprecated;
            }

            // Some extra glitter to show lack of defined file_format.
            // Assuming is Workflow visualization with no run data or file_format definition pre-defined.
            return "Any file format";
        }
        return (fileFormatItem && (fileFormatItem.file_format || fileFormatItem.display_title)) || null;
    }

    icon(){
        const { node } = this.props;
        const { ioType, nodeType } = node;
        const fileFormatAsString = WorkflowNodeElement.getFileFormatString(node);
        let iconClass;

        if (nodeType === 'input-group' || nodeType === 'output-group'){
            iconClass = 'folder-open fas';
        } else if (nodeType === 'input' || nodeType === 'output'){
            // By file_format
            if (fileFormatAsString === 'zip' || fileFormatAsString === 'tar' || fileFormatAsString === 'gz') {
                iconClass = 'file-zip far';
            }
            // By meta.type & ioType
            else if (typeof ioType === 'undefined'){
                iconClass = 'question fas';
            } else if (typeof ioType === 'string') {
                if (WorkflowNodeElement.isNodeQCMetric(node)) {
                    iconClass = 'check-square far';
                } else if (WorkflowNodeElement.isNodeParameter(node) || ioType.indexOf('int') > -1 || ioType.indexOf('string') > -1){
                    iconClass = 'wrench fas';
                } else if (WorkflowNodeElement.isNodeFile(node)){
                    iconClass = 'file-text far';
                } else {
                    iconClass = 'question fas';
                }
            } else if (Array.isArray(ioType)) { // Deprecated?
                if (
                    ioType[0] === 'File' ||
                    (ioType[0] === 'null' && ioType[1] === 'File')
                ){
                    iconClass = 'file-text far';
                } else if (
                    (ioType[0] === 'int' || ioType[0] === 'string') ||
                    (ioType[0] === 'null' && (ioType[1] === 'int' || ioType[1] === 'string'))
                ){
                    iconClass = 'wrench fas';
                }
            }

        } else if (nodeType === 'step'){
            iconClass = 'cogs fas';
        }
        if (!iconClass) {
            iconClass = 'question fas';
        }
        return <i className={"icon icon-fw icon-" + iconClass}/>;
    }

    tooltip(){
        const { node } = this.props;
        const { nodeType, meta, name } = node;
        let output = '';
        let hasRunDataFile = false;

        // Titles
        // Node Type -specific
        if (nodeType === 'step'){
            if (meta && meta.workflow){
                output += '<small>Workflow Run</small>'; // Workflow Run
            } else {
                output += '<small>Step</small>'; // Reg Step
            }
            // Step Title
            output += '<h5 class="text-600 tooltip-title">' + ((meta && (meta.display_title || meta.name)) || name) + '</h5>';
        }

        if (nodeType === 'input-group'){
            output += '<small>Input Argument</small>';
        }

        if (nodeType === 'input' || nodeType === 'output'){
            let argumentName = nodeType;
            argumentName = argumentName.charAt(0).toUpperCase() + argumentName.slice(1);
            hasRunDataFile = WorkflowNodeElement.isNodeFile(node) && WorkflowNodeElement.doesRunDataExist(node);
            const fileTitle = hasRunDataFile && (meta.run_data.file.display_title || meta.run_data.file.accession);
            if (fileTitle) {
                output += '<small>' + argumentName + ' File</small>';
                output += '<h5 class="text-600 tooltip-title">' + fileTitle + '</h5>';
                output += '<hr class="mt-08 mb-05"/>';
            }
            if (argumentName === 'Input' || argumentName === 'Output'){
                argumentName += ' Argument &nbsp; <span class="text-500 mono-text">' + name + '</span>';
            }
            output += '<small class="mb-03 inline-block">' + argumentName + '</small>';
        }

        // If file, and has file-size, add it (idk, why not)
        const fileSize = hasRunDataFile && typeof meta.run_data.file.file_size === 'number' && meta.run_data.file.file_size;
        if (fileSize){
            output += '<div class="mb-05"><span class="text-300">Size:</span> ' + valueTransforms.bytesToLargerUnit(meta.run_data.file.file_size) + '</div>';
        }

        // Workflow name, if any
        if (nodeType === 'step' && meta && meta.workflow && meta.workflow.display_title){ // Workflow
            //title
            output += '<hr class="mt-08 mb-05"/><div class="mb-05 mt-08"><span class="text-600">Workflow: </span><span class="text-400">' + node.meta.workflow.display_title + '</span></div>';
        }

        // Description
        const description = (
            (typeof node.description === 'string' && node.description)
            || (meta && typeof meta.description === 'string' && meta.description)
            || (meta.run_data && meta.run_data.meta && meta.run_data.meta.description)
            || (meta.run_data && meta.run_data.file && typeof meta.run_data.file === 'object' && meta.run_data.file.description)
        );
        if (description){
            output += '<hr class="mt-05 mb-05"/>';
            output += '<small class="mb-05 inline-block">' + description + '</small>';
        }

        return output;
    }

    aboveNodeTitle(){
        const { node, title, columnWidth } = this.props;
        const fileFormatAsString = WorkflowNodeElement.getFileFormatString(node);
        const elemProps = {
            'style'         : { 'maxWidth' : columnWidth },
            'className'     : "text-ellipsis-container above-node-title",
            'key'           : 'above-node-title'
        };

        if (node.nodeType === 'input-group'){
            return <div {...elemProps}>{ title }</div>;
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
            if (fileFormatAsString) {
                return <div {...elemProps}>{ fileFormatAsString }</div>;
            }
            elemProps.className += ' mono-text';
            return <div {...elemProps}>{ title }</div>;
        }

        // If Analysis Step (---  this case is unused since node.meta.workflow.steps is used up above?)
        if (node.nodeType === 'step' && node.meta.uuid){
            if (node.meta.uuid && Array.isArray(node.meta.analysis_step_types) && node.meta.analysis_step_types.length > 0){
                return <div {...elemProps}>{  _.map(node.meta.analysis_step_types, valueTransforms.capitalize).join(', ') }</div>;
            }
            if (node.meta.workflow && Array.isArray(node.meta.workflow.experiment_types) && node.meta.workflow.experiment_types.length > 0){
                // Currently these are strings but might change to linkTo Item in near future(s).
                // TODO: Remove this block once is never string
                if (typeof node.meta.workflow.experiment_types[0] === 'string'){
                    return <div {...elemProps}>{  _.map(node.meta.workflow.experiment_types, valueTransforms.capitalize).join(', ') }</div>;
                }
                return <div {...elemProps}>{ _.map(node.meta.workflow.experiment_types, expFxn.getExperimentTypeStr).join(', ') }</div>;
            }
        }

        // If IO Arg w/o file but w/ format
        if ((node.nodeType === 'input' || node.nodeType === 'output') && fileFormatAsString){
            return <div {...elemProps}>{ fileFormatAsString }</div>;
        }

        // QC Report
        if (node.ioType === 'qc') {
            return <div {...elemProps}>Quality Control Metric</div>;
        }

        // Default-ish for IO node
        if (typeof node.ioType === 'string') {
            return <div {...elemProps}>{ valueTransforms.capitalize(node.ioType) }</div>;
        }

        return null;

    }

    belowNodeTitle(){
        const { node, columnWidth } = this.props;
        const elemProps = {
            'style'     : { 'maxWidth' : columnWidth },
            'className' : "text-ellipsis-container below-node-title",
            'key'       : 'below-node-title'
        };

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
                return (
                    <React.Fragment key={object.itemUtil.atId(s) || i}>
                        { i > 0 ? ', ' : null }
                        { s.name } <span className="lighter">v{ s.version }</span>
                    </React.Fragment>
                );
            }
            return (
                <React.Fragment key={object.itemUtil.atId(s) || i}>
                    { i > 0 ? ', ' : null }
                    { s.title || s.display_title }
                </React.Fragment>
            );
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
        const { node } = this.props;
        const {
            nodeType,
            ioType,
            name,
            title = null,
            meta : {
                workflow,
                run_data
            } = {}
        } = node;

        if (nodeType === 'input-group'){
            var files = node.meta.run_data.file;
            if (Array.isArray(files)){
                var len = files.length - 1;
                return (
                    <div className="node-name">
                        { this.icon() }
                        <b>{ files.length - 1 }</b> similar file{ len === 1 ? '' : 's' }
                    </div>
                );
            }
        }

        if (nodeType === 'step' && workflow && typeof workflow === 'object' && workflow.display_title){
            return <div className="node-name">{ this.icon() }{ workflow.display_title }</div>;
        }

        if (WorkflowNodeElement.isNodeFile(node) && WorkflowNodeElement.doesRunDataExist(node)){
            const { file : { accession, display_title } } = run_data;
            return (
                <div className={"node-name" + (accession ? ' mono-text' : '')}>
                    { this.icon() }
                    { typeof file === 'string' ? ioType : accession || display_title }
                </div>
            );
        }

        if (WorkflowNodeElement.isNodeParameter(node) && WorkflowNodeElement.doesRunDataExist(node)){
            return <div className="node-name mono-text">{ this.icon() }{ run_data.value }</div>;
        }

        // Fallback / Default - use node.name
        return <div className="node-name">{ this.icon() }{ title || name }</div>;
    }

    /**
     * Return a JSX element to be shown at top of right of file node
     * to indicate that a quality metric is present on said file.
     *
     * We can return a <a href={object.itemUtil.atId(qc)}>...</a> element, but
     * seems having a link on node would be bit unexpected if clicked accidentally.
     */
    qcMarker(){
        const { node, selected } = this.props;

        if (!WorkflowNodeElement.isNodeFile(node) || !WorkflowNodeElement.doesRunDataExist(node)){
            return null;
        }

        const {
            meta : { run_data : { file } }
        } = node;

        const qc = file && file.quality_metric;
        if (!qc) return null;

        const qcStatus = qc.overall_quality_status && qc.overall_quality_status.toLowerCase();
        const markerProps = {
            'className' : "qc-present-node-marker",
            'data-tip'  : "This file has a quality control metric associated with it.",
            'children'  : "QC",
            'key'       : 'qc-marker'
        };

        if (qcStatus){
            if (qcStatus === 'pass')       markerProps.className += ' status-passing';
            else if (qcStatus === 'warn')  markerProps.className += ' status-warning';
            else if (qcStatus === 'error') markerProps.className += ' status-error';
        }

        if (selected && qc.url){
            markerProps.className += ' clickable';
            return <a href={qc.url} target="_blank" rel="noreferrer noopener" {...markerProps} onClick={function(e){
                e.preventDefault();
                e.stopPropagation();
                ViewMetricButton.openChildWindow(qc.url);
            }} />;
        }

        return <div {...markerProps} />;
    }

    render(){
        return (
            <div className="node-visible-element" key="outer">
                <div className="innermost" data-tip={this.tooltip()} data-place="top" data-html key="node-title">
                    { this.nodeTitle() }
                </div>
                { this.qcMarker() }
                { this.belowNodeTitle() }
                { this.aboveNodeTitle() }
            </div>
        );
    }
}