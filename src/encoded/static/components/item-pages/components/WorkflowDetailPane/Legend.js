'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';

class LegendItem extends React.Component {

    render(){
        var { title, className, tooltip } = this.props;
        return (
            <div className="legend-item">
                <span className="inline-block" data-tip={tooltip || null} data-place="right" data-html>
                    <div className={"color-patch " + className}/> { title }
                </span>
            </div>
        );
    }
}

export class Legend extends React.Component {

    static defaultProps = {
        'items' : {
            'Input File'                : {
                className: 'node-type-global-input',
                tooltip : 'File input into a workflow.'
            },
            'Output File'               : {
                className: 'node-type-global-output',
                tooltip : 'File generated from a workflow.'
            },
            //'Workflow Step'     : { className: 'node-type-step' },
            'Group of Similar Files'    : {
                className: 'node-type-global-group',
                tooltip : 'Grouping of similar files, e.g. those which are generated from different runs of the same <em>workflow</em>.'
            },
            'Input Reference File'      : {
                className: 'node-type-input-file-reference',
                tooltip : 'Reference file input into a workflow.'
            },
            'Input Parameter'           : {
                className: 'node-type-parameter',
                tooltip : 'Parameter which input into a workflow.'
            },
            'Intermediate File'         : {
                className:'node-type-io-default',
                tooltip : 'File that was generated in the Workflow but perhaps not saved or important.'
            },
            //'Unsaved File'              : { className: 'node-disabled' },
            'Current Context'           : {
                className: 'node-type-global-context',
                tooltip : 'Files which are contextual to the Item you\'re viewing, e.g. terminal processed files from an Experiment Set.'
            }
        },
        'title' : 'Graph Legend'
    };

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    render(){
        return (
            <div className="workflow-legend-container overflow-hidden mt-1">
                <div className="inner">
                    { this.props.title?
                        <div>
                            <h4 className="text-300">{ this.props.title }</h4>
                            <hr className="mb-1 mt-1"/>
                        </div>
                    : null}
                    { _.map(_.pairs(this.props.items), (p)=> <LegendItem {...p[1]} title={p[0]} key={p[0]} /> ) }
                </div>
            </div>
        );
    }
}
