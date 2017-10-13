'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { object, layout } from './../../../util';

import { Legend } from './Legend';
import { FileDetailBody } from './FileDetailBody';
import { ParameterDetailBody } from './ParameterDetailBody';
import { StepDetailBody } from './StepDetailBody';
import { WFRStepDetailBody } from './WFRStepDetailBody';


/**
 * This is the entry-point to the somewhat big-ish WorkflowDetailPane component.
 * It handles (meta-)data specific to the 4DN portal.
 * 
 * It requires at minimum a 'selectedNode' prop, from which it reads 'selectedNode.meta' and shows stuff like a FileDetailBody if there's a file associated with the node.
 * 
 * @class WorkflowDetailPane
 * @extends {React.Component}
 * @prop {./../../../viz/Workflow/parsing-functions.Node} selectedNode - Currently-selected node as passed in callback /viz/Workflow/Graph props.renderDetailPane( {Node} selectedNode, {Object} graphProps )
 */

export class WorkflowDetailPane extends React.Component {
    
    static Legend = Legend

    static propTypes = {
        'selectedNode' : PropTypes.oneOfType([ PropTypes.object, PropTypes.oneOf([null]) ])
    }

    static defaultProps = {
        'minHeight' : 800,
        'selectedNode' : null,
        'keyTitleDescriptionMap' : {
            '@id' : {
                'title' : 'Link'
            }
        }
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.route = this.route.bind(this);
    }

    /**
     * This function acts as a router to different types of DetailPane views, depending on Node type.
     */
    route(){
        var node = this.props.selectedNode;

        if (node){

            var commonDetailProps = {
                'key' : 'body',
                'node' : node,
                'schemas' : this.props.schemas,
                'minHeight' : this.props.minHeight,
                'keyTitleDescriptionMap' : this.props.keyTitleDescriptionMap
            };
            
            if (node.meta && node.meta.run_data && node.meta.run_data.file && node.meta.run_data.file){
                // File
                return (
                    <layout.WindowResizeUpdateTrigger>
                        <FileDetailBody
                            {...commonDetailProps}
                            file={node.meta.run_data.file}
                        />
                    </layout.WindowResizeUpdateTrigger>
                );
            }
            if (node.meta && node.meta.run_data && (typeof node.meta.run_data.value === 'number' || typeof node.meta.run_data.value === 'string')){
                // Parameter
                return <ParameterDetailBody {...commonDetailProps} />;
            }
            if (node.type === 'step' && node.meta && typeof node.meta === 'object'){
                // Step - WorkflowRun or Basic

                var nodeTypeVisible = null;
                if ((node.meta && node.meta['@type']) && (node.meta['@type'].indexOf('WorkflowRun') > -1 || node.meta['@type'].indexOf('Workflow'))){
                    nodeTypeVisible = 'Workflow Run';
                } else if ((node.meta && node.meta['@type']) && node.meta['@type'].indexOf('Workflow')) {
                    nodeTypeVisible = 'Workflow';
                } else {
                    nodeTypeVisible = 'Analysis Step';
                }

                var stepProps = _.extend({
                    'step' : node.meta,
                    'typeTitle' : nodeTypeVisible,
                    'context' : this.props.context
                }, commonDetailProps);

                // Check if we have an @id, and if it is of workflow-run-*.
                var related_item_at_id = object.atIdFromObject(node.meta);
                if (related_item_at_id && ((Array.isArray(node.meta['@type']) && node.meta['@type'].indexOf('WorkflowRun') > -1) || related_item_at_id.slice(0,14) === '/workflow-runs')){
                    return <WFRStepDetailBody {...stepProps} />;
                }
                return (
                    <StepDetailBody {...stepProps} />
                );
            }

        }

        // Default / no node
        if (this.props.legendItems){
            return <Legend items={this.props.legendItems} />;
        }

        return (
            <h5 className="text-400 text-center" style={{ paddingTop : 7 }}>
                <small>Select a node above for more detail.</small>
            </h5>
        );
    }

    render(){
        console.log('SELECTED NODE', this.props.selectedNode);

        return (
            <div className="detail-pane" style={{ minHeight : this.props.minHeight }}>
                <div className="detail-pane-body">{ this.route() }</div>
            </div>
        );
    }

}