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
        this.toggleProcessedFilesOpen = _.throttle(this.toggleStateProperty.bind(this, 'processedFilesOpen'), { 'trailing' : false });
        this.toggleRawFilesOpen = _.throttle(this.toggleStateProperty.bind(this, 'rawFilesOpen'), { 'trailing' : false });
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

    toggleStateProperty(property){
        var state = {};
        state[property] = !this.state[property];
        this.setState(state);
    }

    renderRawFilesSection(paddingWidth){
        var { containerWidth } = this.props;
        var expSet = this.props.result,
            rawFilesCount = expFxn.fileCountFromExperimentSet(expSet, false, false);

        if (rawFilesCount === 0) return null;

        return (
            <div className="raw-files-table-section">
                <h4 className="pane-section-title" onClick={this.toggleRawFilesOpen}>
                    <i className={"toggle-open-icon icon icon-fw icon-" + (this.state.rawFilesOpen ? 'minus' : 'plus')} />
                    <i className="icon icon-fw icon-leaf"/> <span className="text-400">{ rawFilesCount }</span> Raw files
                </h4>
                <Collapse in={this.state.rawFilesOpen}>
                    <div>
                        <RawFilesStackedTable {..._.pick(this.props, 'selectedFiles', 'unselectFile', 'selectFile', 'selectedFilesUniqueCount')}
                            columnHeaders={[
                                { columnClass: 'file-detail', title: 'File Type'},
                                { columnClass: 'file-detail', title: 'File Size', initialWidth: 80, field : "file_size" }
                            ]}
                            experimentSetAccession={expSet.accession || null} experimentArray={expSet.experiments_in_set}
                            replicateExpsArray={expSet.replicate_exps} experimentSetType={expSet.experimentset_type}
                            width={containerWidth ? (Math.max(containerWidth - paddingWidth, 665) /* account for padding of pane */) : null}
                            fadeIn={false} collapseLongLists />
                    </div>
                </Collapse>
            </div>
        );
    }

    renderProcessedFilesSection(paddingWidth){
        var { containerWidth } = this.props;
        var expSet = this.props.result,
            processedFiles = expFxn.allProcessedFilesFromExperimentSet(expSet);

        if (!Array.isArray(processedFiles) || processedFiles.length === 0){
            return null;
        }
        return (
            <div className="processed-files-table-section">
                <h4 className="pane-section-title" onClick={this.toggleProcessedFilesOpen}>
                    <i className={"toggle-open-icon icon icon-fw icon-" + (this.state.processedFilesOpen ? 'minus' : 'plus')} />
                    <i className="icon icon-fw icon-microchip"/> <span className="text-400">{ processedFiles.length }</span> Processed Files
                </h4>
                <Collapse in={this.state.processedFilesOpen}>
                    <div>
                        <ProcessedFilesStackedTable {..._.pick(this.props, 'selectedFiles', 'unselectFile', 'selectFile', 'selectedFilesUniqueCount')}
                            experimentSetAccession={expSet.accession || null} files={processedFiles}
                            width={containerWidth ? (Math.max(containerWidth - paddingWidth, 665) /* account for padding of pane */) : null}
                            fadeIn={false} collapseLongLists />
                    </div>
                </Collapse>
            </div>
        );
    }

    render(){
        var { additionalDetailFields, paddingWidthMap, containerWidth } = this.props,
            expSet = this.props.result,
            addInfoKeys = _.keys(additionalDetailFields),
            paddingWidth = this.props.paddingWidth || 0;
    
        if (paddingWidthMap){
            var rgs = layout.responsiveGridState();
            paddingWidth = paddingWidthMap[rgs] || paddingWidth;
        }

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
                        { _.map(addInfoKeys, function(title){
                            var value = sanitizeOutputValue(defaultColumnBlockRenderFxn(expSet, { 'field' : additionalDetailFields[title] }, null, 0)); // Uses object.getNestedProperty, pretty prints JSX. Replaces value probe stuff.
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
                <div style={{ overflowX : 'auto', width: containerWidth ? (containerWidth - paddingWidth) : null }} className="files-tables-container">
                    { this.renderRawFilesSection(paddingWidth) }
                    { this.renderProcessedFilesSection(paddingWidth) }
                </div>
            </div>
        );
    }

}

