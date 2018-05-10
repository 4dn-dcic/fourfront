'use strict';

import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { Collapse } from 'react-bootstrap';
import { RawFilesStackedTable, ProcessedFilesStackedTable } from './file-tables';
import { FlexibleDescriptionBox } from './../../item-pages/components';
import { expFxn, layout } from './../../util';
import { defaultColumnBlockRenderFxn, sanitizeOutputValue } from './table-commons';


export class ExperimentSetDetailPane extends React.Component {

    static allFileIDs(expSet: Object){ return _.pluck(  expFxn.allFilesFromExperimentSet(expSet)  , 'uuid'); }

    static propTypes = {
        'selectAllFilesInitially' : PropTypes.bool,
        'result' : PropTypes.object.isRequired,
        'containerWidth' : PropTypes.number,
        'additionalDetailFields' : PropTypes.object,
        'paddingWidth' : PropTypes.number
    }

    static defaultProps = {
        'selectAllFilesInitially' : false,
        'paddingWidth' : 0,
        'additionalDetailFields' : {
            'Lab': 'lab',
            'Publication': 'produced_in_pub',
        }
    }

    constructor(props){
        super(props);
        this.toggle = _.throttle(this.toggle.bind(this), 500, { 'trailing' : false });
        this.state = {
            'rawFilesOpen' : false,
            'processedFilesOpen' : false
        };
    }
    
    /*
    componentDidUpdate(pastProps, pastState){
        if ((pastState.rawFilesOpen !== this.state.rawFilesOpen) || (pastState.processedFilesOpen !== this.state.processedFilesOpen)){
            if (typeof this.props.toggleExpandCallback === 'function'){
                setTimeout(this.props.toggleExpandCallback, 500); // Delay to allow <Collapse> height transition to finish.
            }
        }
    }
    */

    toggle(property){
        var state = {};
        state[property] = !this.state[property];
        this.setState(state);
    }

    render(){
        var expSet = this.props.result;
        var addInfo = this.props.additionalDetailFields;
        var addInfoKeys = _.keys(addInfo);

        var paddingWidth = this.props.paddingWidth || 0;
        if (this.props.paddingWidthMap){
            var rgs = layout.responsiveGridState();
            paddingWidth = this.props.paddingWidthMap[rgs] || paddingWidth;
        }

        var processedFiles = expFxn.allProcessedFilesFromExperimentSet(expSet);
        var rawFilesCount = expFxn.fileCountFromExperimentSet(expSet, false, false);

        return (
            <div className="experiment-set-info-wrapper">
                <div className="expset-addinfo">
                    <div className="row">
                        <div className="col-md-6 addinfo-description-section">
                            {/* <label className="text-500 description-label">Description</label> */}
                            <FlexibleDescriptionBox
                                description={ expSet.description }
                                fitTo="self"
                                textClassName="text-normal"
                                dimensions={null}
                                linesOfText={Math.max(1, addInfoKeys.length)}
                            />
                        </div>
                        <div className="col-md-6 addinfo-properties-section">
                        { addInfoKeys.map(function(title){
                            var value = sanitizeOutputValue(defaultColumnBlockRenderFxn(expSet, { 'field' : addInfo[title] }, null, 0)); // Uses object.getNestedProperty, pretty prints JSX. Replaces value probe stuff.
                            return (
                                <div className="row expset-addinfo-row clearfix" key={title}>
                                    <div className="col-xs-4 col-sm-3 expset-addinfo-key">
                                        { title }:
                                    </div>
                                    <div className="col-xs-8 col-sm-9 expset-addinfo-val">
                                        { value || <small><em>None</em></small> }
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>
                <div style={{ overflowX : 'auto', width: this.props.containerWidth ? (this.props.containerWidth - paddingWidth) : null }} className="files-tables-container">
                    <div className="raw-files-table-section">
                        <h4 className="pane-section-title" onClick={this.toggle.bind(this, 'rawFilesOpen')}>
                            <i className={"toggle-open-icon icon icon-fw icon-" + (this.state.rawFilesOpen ? 'minus' : 'plus')} />
                            <i className="icon icon-fw icon-leaf"/> <span className="text-400">{ rawFilesCount }</span> Raw files
                        </h4>
                        <Collapse in={this.state.rawFilesOpen}>
                            <div>
                                <RawFilesStackedTable
                                    key='experiments-table'
                                    columnHeaders={[
                                        { columnClass: 'file-detail', title: 'File Type'},
                                        { columnClass: 'file-detail', title: 'File Size', initialWidth: 80, field : "file_size" }
                                    ]}
                                    experimentSetAccession={expSet.accession || null}
                                    experimentArray={expSet.experiments_in_set}
                                    replicateExpsArray={expSet.replicate_exps}
                                    experimentSetType={expSet.experimentset_type}
                                    width={this.props.containerWidth ? (Math.max(this.props.containerWidth - paddingWidth, 665) /* account for padding of pane */) : null}
                                    fadeIn={false}
                                    selectedFiles={this.props.selectedFiles}
                                    selectFile={this.props.selectFile}
                                    unselectFile={this.props.unselectFile}
                                    collapseLongLists
                                />
                            </div>
                        </Collapse>
                    </div>
                    { Array.isArray(processedFiles) && processedFiles.length > 0 ?
                    <div className="processed-files-table-section">
                        <h4 className="pane-section-title" onClick={this.toggle.bind(this, 'processedFilesOpen')}>
                            <i className={"toggle-open-icon icon icon-fw icon-" + (this.state.processedFilesOpen ? 'minus' : 'plus')} />
                            <i className="icon icon-fw icon-microchip"/> <span className="text-400">{ processedFiles.length }</span> Processed Files
                        </h4>
                        <Collapse in={this.state.processedFilesOpen}>
                            <div>
                                <ProcessedFilesStackedTable
                                    experimentSetAccession={expSet.accession || null}
                                    files={processedFiles}
                                    width={this.props.containerWidth ? (Math.max(this.props.containerWidth - paddingWidth, 665) /* account for padding of pane */) : null}
                                    fadeIn={false}
                                    selectedFiles={this.props.selectedFiles}
                                    selectFile={this.props.selectFile}
                                    unselectFile={this.props.unselectFile}
                                    collapseLongLists
                                />
                            </div>
                        </Collapse>
                    </div>
                    : null }
                </div>
            </div>
        );
    }

}

