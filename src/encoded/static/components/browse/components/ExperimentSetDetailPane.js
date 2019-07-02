'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { Collapse } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/Collapse';
import { FlexibleDescriptionBox } from '@hms-dbmi-bgm/shared-portal-components/src/components/ui/FlexibleDescriptionBox';
import { object, layout } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';

import { RawFilesStackedTable, ProcessedFilesStackedTable, renderFileTypeSummaryColumn } from './file-tables';
import { expFxn } from './../../util';
import { SelectedFilesController } from './SelectedFilesController';

export class ExperimentSetDetailPane extends React.PureComponent {

    /**
     * Gets all file UUIDs from an ExperimentSet.
     *
     * @param {{ 'experiments' : { 'files' : { 'uuid': string }[], 'processed_files' : { 'uuid': string }[] }[], 'processed_files' : { 'uuid' : string }[] }} expSet - An ExperimentSet JSON object with files which have UUIDs embedded.
     */
    static allFileIDs(expSet){ return _.pluck(  expFxn.allFilesFromExperimentSet(expSet)  , 'uuid'); }

    static propTypes = {
        'selectAllFilesInitially' : PropTypes.bool,
        'result' : PropTypes.object.isRequired,
        'containerWidth' : PropTypes.number,
        'paddingWidth' : PropTypes.number,
        'windowWidth' : PropTypes.number.isRequired,
        'href' : PropTypes.string.isRequired,
        'minimumWidth' : PropTypes.number
    };

    static defaultProps = {
        'selectAllFilesInitially' : false,
        'paddingWidth' : 0,
        'minimumWidth' : 725
    };

    constructor(props){
        super(props);
        this.toggleProcessedFilesOpen = _.throttle(this.toggleStateProperty.bind(this, 'processedFilesOpen'), 500, { 'trailing' : false });
        this.toggleRawFilesOpen = _.throttle(this.toggleStateProperty.bind(this, 'rawFilesOpen'), 500, { 'trailing' : false });
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
        this.setState(function(currState){
            var nextState = {};
            nextState[property] = !currState[property];
            return nextState;
        });
    }

    renderRawFilesSection(paddingWidth){
        const { containerWidth, result, href, minimumWidth } = this.props;
        const rawFilesCount = expFxn.fileCountFromExperimentSet(result, false, false);

        if (rawFilesCount === 0) return null;

        return (
            <div className="raw-files-table-section">
                <h4 className="pane-section-title" onClick={this.toggleRawFilesOpen}>
                    <i className={"toggle-open-icon icon icon-fw icon-" + (this.state.rawFilesOpen ? 'minus' : 'plus')} />
                    <i className="icon icon-fw icon-leaf"/> <span className="text-400">{ rawFilesCount }</span> Raw Files
                </h4>
                <Collapse in={this.state.rawFilesOpen}>
                    <div>
                        <RawFilesStackedTable {...SelectedFilesController.pick(this.props)}
                            columnHeaders={[
                                { columnClass: 'file-detail', title: 'File Type', render: renderFileTypeSummaryColumn },
                                { columnClass: 'file-detail', title: 'File Size', initialWidth: 80, field : "file_size" }
                            ]}
                            experimentSet={result} href={href}
                            width={containerWidth ? (Math.max(containerWidth - paddingWidth, minimumWidth) /* account for padding of pane */) : null}
                            fadeIn={false} collapseLongLists />
                    </div>
                </Collapse>
            </div>
        );
    }

    renderProcessedFilesSection(paddingWidth){
        const { containerWidth, result, href, minimumWidth } = this.props;
        const processedFiles = expFxn.allProcessedFilesFromExperimentSet(result);

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
                        <ProcessedFilesStackedTable {...SelectedFilesController.pick(this.props)}
                            files={processedFiles} fadeIn={false} collapseLongLists href={href}
                            width={containerWidth ? (Math.max(containerWidth - paddingWidth, minimumWidth) /* account for padding of pane */) : null} />
                    </div>
                </Collapse>
            </div>
        );
    }

    render(){
        const { paddingWidthMap, paddingWidth, containerWidth, windowWidth, result } = this.props;
        let usePadWidth = paddingWidth || 0;

        if (paddingWidthMap){
            var rgs = layout.responsiveGridState(windowWidth);
            usePadWidth = paddingWidthMap[rgs] || paddingWidth;
        }

        return (
            <div className="experiment-set-info-wrapper">
                <div className="expset-addinfo">
                    <div className="row">
                        <div className="col-md-6 addinfo-description-section">
                            {/* <label className="text-500 description-label">Description</label> */}
                            <FlexibleDescriptionBox
                                windowWidth={windowWidth}
                                description={ result.description }
                                fitTo="self"
                                textClassName="text-normal"
                                dimensions={null}
                                linesOfText={2}
                            />
                        </div>
                        <div className="col-md-6 addinfo-properties-section">
                            <div className="row mb-05 clearfix">
                                <div className="col-xs-4 col-sm-3 text-500">
                                    Lab:
                                </div>
                                <div className="col-xs-8 col-sm-9 expset-addinfo-val">
                                    { object.itemUtil.generateLink(result.lab) || <small><em>None</em></small> }
                                </div>
                            </div>
                            <div className="row mb-05 clearfix">
                                <div className="col-xs-4 col-sm-3 text-500">
                                    Publication:
                                </div>
                                <div className="col-xs-8 col-sm-9 expset-addinfo-val">
                                    { object.itemUtil.generateLink(result.produced_in_pub) || <small><em>None</em></small> }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ overflowX : 'auto', width: containerWidth ? (containerWidth - usePadWidth) : null }} className="files-tables-container">
                    { this.renderRawFilesSection(usePadWidth) }
                    { this.renderProcessedFilesSection(usePadWidth) }
                </div>
            </div>
        );
    }

}

