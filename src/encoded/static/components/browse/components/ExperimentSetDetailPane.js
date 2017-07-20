'use strict';

import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import ExperimentsTable from './../../experiments-table';
import { FlexibleDescriptionBox } from './../../item-pages/components';
import { expFxn } from './../../util';
import { SearchResultTable, defaultColumnBlockRenderFxn } from './SearchResultTable';


export class ExperimentSetDetailPane extends React.Component {

    /**
     * Combine file pairs and unpaired files into one array. 
     * Length will be file_pairs.length + unpaired_files.length, e.g. files other than first file in a pair are not counted.
     * Can always _.flatten() this or map out first file per pair.
     * 
     * @param {Object} expSet - Experiment Set
     * @returns {Array.<Array>} e.g. [ [filePairEnd1, filePairEnd2], [...], fileUnpaired1, fileUnpaired2, ... ]
     */
    static pairsAndFiles(expSet: Object){
        return expFxn.listAllFilePairs(expSet.experiments_in_set).concat(
            expFxn.listAllUnpairedFiles(expSet.experiments_in_set)
        );
    }

    static allFiles(expSet: Object){
        return _.reduce(ExperimentSetDetailPane.pairsAndFiles(expSet), function(m, f){
            if (Array.isArray(f)){
                return m.concat(f);
            } else {
                m.push(f);
                return m;
            }
        }, []);
    }

    static allFileIDs(expSet: Object){ return _.pluck(ExperimentSetDetailPane.allFiles(expSet), 'uuid'); }

    static propTypes = {
        'expSetFilters' : PropTypes.object.isRequired,
        'selectAllFilesInitially' : PropTypes.bool,
        'result' : PropTypes.object.isRequired,
        'containerWidth' : PropTypes.number.isRequired,
        'additionalDetailFields' : PropTypes.object.isRequired
    }

    static defaultProps = {
        'selectAllFilesInitially' : false,
        'additionalDetailFields' : {
            'Lab': 'lab.title',
            'Treatments':'experiments_in_set.biosample.treatments_summary',
            'Modifications':'experiments_in_set.biosample.modifications_summary'
        }
    }

    render(){
        var expSet = this.props.result;
        var addInfo = this.props.additionalDetailFields;

        return (
            <div className="experiment-set-info-wrapper">
                <div className="expset-addinfo">
                    <div className="row">
                        <div className="col-sm-6 addinfo-description-section">
                            <label className="text-500 description-label">Description</label>
                            <FlexibleDescriptionBox
                                description={ expSet.description }
                                fitTo="self"
                                textClassName="text-medium"
                                dimensions={null}
                            />
                        </div>
                        <div className="col-sm-6 addinfo-properties-section">
                        { _.keys(addInfo).map(function(title){
                            var value = SearchResultTable.sanitizeOutputValue(defaultColumnBlockRenderFxn(expSet, { 'field' : addInfo[title] }, null, 0)); // Uses object.getNestedProperty, pretty prints JSX. Replaces value probe stuff.
                            return (
                                <div className="row expset-addinfo-row clearfix" key={title}>
                                    <div className="col-xs-4 col-sm-3 expset-addinfo-key">
                                        { title }:
                                    </div>
                                    <div className="col-xs-8 col-sm-9 expset-addinfo-val">
                                        { value || <small><em>N/A</em></small> }
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>
                <ExperimentsTable
                    key='experiments-table'
                    columnHeaders={[
                        { columnClass: 'file-detail', title : 'File Type'},
                        { columnClass: 'file-detail', title : 'File Info'}
                    ]}
                    experimentArray={expSet.experiments_in_set}
                    replicateExpsArray={expSet.replicate_exps}
                    experimentSetType={expSet.experimentset_type}
                    width={this.props.containerWidth - (47 + 0) /* account for padding of pane */}
                    fadeIn={false}
                    selectedFiles={this.props.selectedFiles}
                    selectFile={this.props.selectFile}
                    unselectFile={this.props.unselectFile}
                />
            </div>
        );
    }

}