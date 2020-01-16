'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { Collapse } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Collapse';
import { FlexibleDescriptionBox } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/FlexibleDescriptionBox';
import { object, layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

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
        'minimumWidth' : PropTypes.number,
        'initialStateCache' : PropTypes.object,
        'updateFileSectionStateCache' : PropTypes.func
    };

    static defaultProps = {
        'selectAllFilesInitially' : false,
        'paddingWidth' : 0,
        'minimumWidth' : 725,
        'initialStateCache' : {}
    };

    constructor(props){
        super(props);
        this.toggleProcessedFilesOpen = _.throttle(this.toggleStateProperty.bind(this, 'processedFilesOpen'), 600, { 'trailing' : false });
        this.toggleRawFilesOpen = _.throttle(this.toggleStateProperty.bind(this, 'rawFilesOpen'), 600, { 'trailing' : false });
        const id = object.itemUtil.atId(props.result);
        const initialState = props.initialStateCache[id];
        this.state = initialState || {
            'rawFilesOpen' : false,
            'processedFilesOpen' : false
        };
    }

    componentWillUnmount(){
        const { result, updateFileSectionStateCache } = this.props;

        if (typeof updateFileSectionStateCache !== "function") {
            return;
        }

        const { rawFilesOpen, processedFilesOpen } = this.state;
        const id = object.itemUtil.atId(result);
        updateFileSectionStateCache(id, (rawFilesOpen || processedFilesOpen) ? { rawFilesOpen, processedFilesOpen } : null);
    }

    toggleStateProperty(property){
        this.setState(function(currState){
            const nextState = {};
            nextState[property] = !currState[property];
            return nextState;
        }, ()=>{
            setTimeout(()=>{
                const { setDetailHeightFromPane } = this.props;
                if (typeof setDetailHeightFromPane === "function") {
                    setDetailHeightFromPane();
                }
            }, 500);
        });
    }

    render(){
        const { paddingWidthMap, paddingWidth, containerWidth, windowWidth, result, minimumWidth, href } = this.props;
        const { processedFilesOpen, rawFilesOpen } = this.state;

        let usePadWidth = paddingWidth || 0;
        if (paddingWidthMap){
            usePadWidth = paddingWidthMap[layout.responsiveGridState(windowWidth)] || paddingWidth;
        }
        const commonFileSectionProps = {
            ...SelectedFilesController.pick(this.props),
            containerWidth, result, href, minimumWidth, paddingWidth: usePadWidth
        };

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
                                <div className="col-4 col-sm-3 text-500">
                                    Lab:
                                </div>
                                <div className="col-8 col-sm-9 expset-addinfo-val">
                                    { object.itemUtil.generateLink(result.lab) || <small><em>None</em></small> }
                                </div>
                            </div>
                            <div className="row mb-05 clearfix">
                                <div className="col-4 col-sm-3 text-500">
                                    Publication:
                                </div>
                                <div className="col-8 col-sm-9 expset-addinfo-val">
                                    { object.itemUtil.generateLink(result.produced_in_pub) || <small><em>None</em></small> }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ overflowX : 'auto', width: containerWidth ? (containerWidth - usePadWidth) : null }} className="files-tables-container">
                    <RawFilesSection {...commonFileSectionProps} open={rawFilesOpen} onToggle={this.toggleRawFilesOpen} />
                    <ProcessedFilesSection {...commonFileSectionProps} open={processedFilesOpen} onToggle={this.toggleProcessedFilesOpen} />
                </div>
            </div>
        );
    }

}

const RawFilesSection = React.memo(function RawFilesSection(props){
    const { containerWidth, result, href, minimumWidth, paddingWidth, open = false, onToggle } = props;

    // For debugging stacked tables
    //const useResult = require('./../../testdata/experiment_set/replicate_4DNESH4MYRID');

    const rawFilesCount = expFxn.fileCountFromExperimentSet(result, false, false);

    if (rawFilesCount === 0) return null;

    return (
        <div className="raw-files-table-section">
            <h4 className="pane-section-title" onClick={onToggle}>
                <i className={"toggle-open-icon icon icon-fw fas icon-" + (open ? 'minus' : 'plus')} />
                <i className="icon icon-fw icon-leaf fas"/> <span className="text-400">{ rawFilesCount }</span> Raw Files
            </h4>
            <Collapse in={open}>
                <div>
                    <RawFilesStackedTable {...SelectedFilesController.pick(props)}
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

});

const ProcessedFilesSection = React.memo(function ProcessedFilesSection(props){
    const { containerWidth, result, href, minimumWidth, paddingWidth, open = false, onToggle } = props;
    const processedFiles = expFxn.allProcessedFilesFromExperimentSet(result);

    if (!Array.isArray(processedFiles) || processedFiles.length === 0){
        return null;
    }

    return (
        <div className="processed-files-table-section">
            <h4 className="pane-section-title" onClick={onToggle}>
                <i className={"toggle-open-icon icon icon-fw fas icon-" + (open ? 'minus' : 'plus')} />
                <i className="icon icon-fw icon-microchip fas"/> <span className="text-400">{ processedFiles.length }</span> Processed Files
            </h4>
            <Collapse in={open}>
                <div>
                    <ProcessedFilesStackedTable {...SelectedFilesController.pick(props)}
                        files={processedFiles} fadeIn={false} collapseLongLists href={href}
                        width={containerWidth ? (Math.max(containerWidth - paddingWidth, minimumWidth) /* account for padding of pane */) : null} />
                </div>
            </Collapse>
        </div>
    );
});

