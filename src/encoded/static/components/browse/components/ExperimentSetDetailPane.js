'use strict';

import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import ExperimentsTable from './../../experiments-table';
import { FlexibleDescriptionBox } from './../../item-pages/components';
import { expFxn } from './../../util';
import { defaultColumnBlockRenderFxn, sanitizeOutputValue } from './table-commons';


export class ExperimentSetDetailPane extends React.Component {

    static allFileIDs(expSet: Object){ return _.pluck(  expFxn.allFilesFromExperimentSet(expSet)  , 'uuid'); }

    static propTypes = {
        'expSetFilters' : PropTypes.object,
        'selectAllFilesInitially' : PropTypes.bool,
        'result' : PropTypes.object.isRequired,
        'containerWidth' : PropTypes.number,
        'additionalDetailFields' : PropTypes.object,
        'paddingWidth' : PropTypes.number
    }

    static defaultProps = {
        'selectAllFilesInitially' : false,
        'paddingWidth' : 47,
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
                        <div className="col-md-6 addinfo-description-section">
                            <label className="text-500 description-label">Description</label>
                            <FlexibleDescriptionBox
                                description={ expSet.description }
                                fitTo="self"
                                textClassName="text-medium"
                                dimensions={null}
                            />
                        </div>
                        <div className="col-md-6 addinfo-properties-section">
                        { _.keys(addInfo).map(function(title){
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
                <div style={{ overflowX : 'auto', width: this.props.containerWidth ? (this.props.containerWidth - this.props.paddingWidth) : null }}>
                <ExperimentsTable
                    key='experiments-table'
                    columnHeaders={[
                        { columnClass: 'file-detail', title : 'File Type'},
                        { columnClass: 'file-detail', title : 'File Info'}
                    ]}
                    experimentSetAccession={expSet.accession || null}
                    experimentArray={expSet.experiments_in_set}
                    replicateExpsArray={expSet.replicate_exps}
                    experimentSetType={expSet.experimentset_type}
                    width={this.props.containerWidth ? (Math.max(this.props.containerWidth - this.props.paddingWidth, 500) /* account for padding of pane */) : null}
                    fadeIn={false}
                    selectedFiles={this.props.selectedFiles}
                    selectFile={this.props.selectFile}
                    unselectFile={this.props.unselectFile}
                />
                </div>
            </div>
        );
    }

}