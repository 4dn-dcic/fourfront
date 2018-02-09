'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, object, ajax } from'./../util';
import * as plansData from './../testdata/stacked-block-matrix-list';
import * as globals from './../globals';
import StaticPage from './StaticPage';
import { StackedBlockVisual, sumPropertyFromList } from './components';





const FALLBACK_NAME_FOR_UNDEFINED = 'None';

const TITLE_MAP = {
    '_common_name' : ' ',
    'experiment_type' : "Experiment Type",
    'data_source' : 'Available through',
    'lab_name' : 'Lab',
    'experiment_category' : "Category",
    'state' : 'Submission Status'
};

const STATUS_STATE_TITLE_MAP = {
    'Submitted'     : ['released', 'current'],
    'In Submission' : ['in review by lab', 'in review by project', 'released to project', 'released to lab', 'submission in progress'],
    //'planned'       : ['to be uploaded by workflow', 'planned'],
    'Out of date'   : ['archived', 'revoked'],
    'Deleted'       : ['deleted']
}


export default class JointAnalysisPlansPage extends React.Component {

    static standardizeEncodeResult(result){
        var cellType = result.biosample_term_name ||FALLBACK_NAME_FOR_UNDEFINED;
        var experimentType = result.assay_term_name ||FALLBACK_NAME_FOR_UNDEFINED;
        var experimentCategory = _.uniq(result.assay_slims || []);
        if (experimentCategory.length > 1){
            console.warn('We have 2+ experiment_types (experiments_in_set.experiment_type) for ', result);
        }
        experimentCategory = experimentCategory[0] || experimentCategory;

        console.log('X', result.status);
        return _.extend({}, result, {
            'cell_type'             : cellType,
            'experiment_category'   : experimentCategory,
            'experiment_type'       : experimentType,
            'data_source'           : 'ENCODE',
            'short_description'     : result.description || null,
            'lab_name'              : (result.lab && result.lab.title) || FALLBACK_NAME_FOR_UNDEFINED,
            'state'                 : (_.find(_.pairs(STATUS_STATE_TITLE_MAP), function(pair){ return pair[1].indexOf(result.status) > -1; }) || ["None"])[0]
        });
    }

    static standardize4DNResult(result){
        var cellType = _.uniq(_.flatten(object.getNestedProperty(result, 'experiments_in_set.biosample.biosource.cell_line.display_title')));
        if (cellType.length > 1){
            console.warn('We have 2+ cellTypes (experiments_in_set.biosample.biosource.cell_line.display_title) for ', result);
        }
        cellType = cellType[0] || FALLBACK_NAME_FOR_UNDEFINED;

        var experimentType =  _.uniq(_.flatten(object.getNestedProperty(result, 'experiments_in_set.experiment_type')));
        if (experimentType.length > 1){
            console.warn('We have 2+ experiment_types (experiments_in_set.experiment_type) for ', result);
        }
        experimentType = experimentType[0] || FALLBACK_NAME_FOR_UNDEFINED;

        //var experiment_titles = _.uniq(_.flatten(object.getNestedProperty(result, 'experiments_in_set.display_title')));
        var experiment_titles = _.map(result.experiments_in_set || [], function(exp){
            return exp.display_title.replace(' - ' + exp.accession, '');
        });

        experiment_titles = _.uniq(experiment_titles);
        if (experiment_titles.length > 1){
            console.warn('We have 2+ experiment titles (experiments_in_set.display_title, minus accession) for ', result);
        }

        return _.extend({}, result, {
            'cell_type'             : cellType,
            'experiment_type'       : experimentType,
            'experiment_category'   : experimentType,
            'data_source'           : '4DN',
            'short_description'     : experiment_titles[0] || null,
            'lab_name'              : (result.lab && result.lab.display_title) || FALLBACK_NAME_FOR_UNDEFINED,
            'state'                 : (_.find(_.pairs(STATUS_STATE_TITLE_MAP), function(pair){ return pair[1].indexOf(result.status) > -1; }) || ["None"])[0]
        });
    }

    static defaultProps = {
        'self_results_url'          : '/browse/?experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experimentset_type=replicate&type=ExperimentSetReplicate&status!=deleted&limit=all',
        'encode_results_url'        : 'https://www.encodeproject.org/search/?type=Experiment&biosample_term_name=H1-hESC&limit=all&field=assay_slims&field=biosample_term_name&field=assay_term_name&field=description&field=lab&field=status',
        'self_planned_results_url'  : null
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.loadSearchQueryResults = this.loadSearchQueryResults.bind(this);
        this.state = {
            'mounted'               : false,
            'self_planned_results'  : null,
            'self_results'          : null,
            'encode_results'        : null
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
        this.loadSearchQueryResults();
    }

    loadSearchQueryResults(){

        function commonCallback(source_name, result){
            var updatedState = {};
            updatedState[source_name] = result['@graph'] || [];
            if (source_name === 'encode_results') {
                updatedState[source_name] = _.map(updatedState[source_name], JointAnalysisPlansPage.standardizeEncodeResult);
            } else if (source_name === 'self_results'){
                updatedState[source_name] = _.map(updatedState[source_name], JointAnalysisPlansPage.standardize4DNResult);
            }
            this.setState(updatedState);
        }

        function commonFallback(source_name, result){
            var updatedState = {};
            updatedState[source_name] = false;
            this.setState(updatedState);
        }

        _.forEach(['self_planned_results', 'self_results', 'encode_results'], (source_name)=>{
            var req_url = this.props[source_name + '_url'];

            if (typeof req_url !== 'string' || !req_url) return;

            if (source_name === 'encode_results' || req_url.slice(0, 4) === 'http'){ // Exclude 'Authorization' header for requests to different domains (not allowed).
                ajax.load(req_url, commonCallback.bind(this, source_name), 'GET', commonFallback.bind(this, source_name), null, {}, ['Authorization', 'Content-Type']);
            } else {
                ajax.load(req_url, commonCallback.bind(this, source_name), 'GET', commonFallback.bind(this, source_name));
            }

        });
    }

    legend(){
        var context = this.props.context;
        if (Array.isArray(context.content) && context.content.length > 0 && context.content[0].name === 'joint-analysis-data-plans#legend'){
            // We expect first Item, if any, to be Legend.
            var legendSection = context.content[0];
            return (
                <div className="col-xs-12">
                    <div className="static-section-entry" id="legend">
                        <div className="fourDN-content" dangerouslySetInnerHTML={{__html: legendSection.content }}/>
                    </div>
                </div>
            );
        }
    }

    render() {

        var isLoading = _.any(_.pairs(_.pick(this.state, 'self_planned_results', 'self_results', 'encode_results')), (pair)=>   pair[1] === null && this.props[pair[0] + '_url'] !== null   );

        if (isLoading){
            return (
                <StaticPage.Wrapper>
                     <div className="text-center mt-5 mb-5" style={{ fontSize: '2rem', opacity: 0.5 }}><i className="mt-3 icon icon-spin icon-circle-o-notch"/></div>
                </StaticPage.Wrapper>
            );
        }

        console.log('RESULTS', this.state);

        var resultList4DN = ((Array.isArray(this.state.self_planned_results) && this.state.self_planned_results) || []).concat(
            ((Array.isArray(this.state.self_results) && this.state.self_results) || [])
        );

        var resultListEncode = this.state.encode_results;

        return ( 
            <StaticPage.Wrapper>
                <div className="row">
                    { this.legend() }
                    <div className="col-xs-12 col-md-6">
                        <h4 className="mt-2 mb-0 text-300">4DN</h4>
                        <VisualBody
                            groupingProperties={['experiment_category', 'experiment_type']}
                            columnGrouping='cell_type'
                            duplicateHeaders={false}
                            columnSubGrouping='experiment_category'
                            results={resultList4DN}
                            //defaultDepthsOpen={[true, false, false]}
                            //keysToInclude={[]}
                        />
                        
                    </div>
                    <div className="col-xs-12 col-md-6">
                    <h4 className="mt-2 mb-0 text-300">ENCODE</h4>
                        <VisualBody
                            groupingProperties={['experiment_category', 'experiment_type']}
                            columnGrouping='cell_type'
                            columnSubGrouping='experiment_category'
                            results={resultListEncode}
                            //defaultDepthsOpen={[false, false, false]}
                            //keysToInclude={[]}
                            collapseToMatrix
                        />
                    </div>
                </div>
            </StaticPage.Wrapper>
        );
    }

}

globals.content_views.register(JointAnalysisPlansPage, 'Joint-analysis-plansPage');


class VisualBody extends React.Component {
    render(){

        var { groupingProperties, columnGrouping, columnSubGrouping, results, keysToInclude, defaultDepthsOpen, duplicateHeaders } = this.props;

        var headerColumnsOrder = [
            'Hi-C',
            'ChIA-PET',
            'Capture-Hi-C',
            'single cell omics',
            'other omics',
            'DNA-FISH',
            'SRM',
            'live cell imaging',
            'other imaging',
            'proteomics'
        ];

        // Filter out properties from objects which we don't want to be shown in tooltip.
        //var keysToInclude = [
        //    'grant_type','center_name', 'lab_name',
        //    'experiment_category', 'experiment_type', 'data_type',
        //    'reference_publication', 'experiments_expected_2017', 'experiments_expected_2020', 'additional_comments', 'in_production_stage_standardized_protocol',
        //];

        var listOfObjectsToVisualize = keysToInclude ? _.map(results, function(o){ return _.pick(o, ...keysToInclude); }) : results;

        return (
            <StackedBlockVisual
                data={listOfObjectsToVisualize}
                titleMap={TITLE_MAP}
                groupingProperties={groupingProperties}
                columnGrouping={columnGrouping}
                headerColumnsOrder={headerColumnsOrder}
                columnSubGrouping={columnSubGrouping}
                defaultDepthsOpen={defaultDepthsOpen}
                duplicateHeaders={duplicateHeaders}
                groupValue={(data, groupingTitle, groupingPropertyTitle)=>{
                    return StackedBlockVisual.Row.flattenChildBlocks(data).length;
                }}
                blockClassName={(data) => {
                    var origClassName = StackedBlockVisual.defaultProps.blockClassName(data);
                    // TODO: Add classname for submission-state.

                    var submissionState = null;

                    if (Array.isArray(data)){
                             if (_.any(data, { 'state' : 'Submitted'        })) submissionState = 'Submitted';
                        else if (_.any(data, { 'state' : 'In Submission'    })) submissionState = 'In Submission';
                        else if (_.any(data, { 'state' : 'Out of date'      })) submissionState = 'Out of date';
                        else if (_.any(data, { 'state' : 'Deleted'          })) submissionState = 'Deleted';
                        else if (_.any(data, { 'state' : 'None'             })) submissionState = 'None';
                    } else {
                        submissionState = data.state;
                    }

                    var submissionStateClassName = submissionState && 'cellType-' + submissionState.replace(/ /g, '-').toLowerCase();

                    return origClassName + ' ' + submissionStateClassName;
                    
                }}
                blockRenderedContents={(data, title, groupingPropertyTitle, blockProps)=>{
                    var defaultOutput = <span>&nbsp;</span>;
                    var experimentsCountExpected = 0;

                    function getCount(num){
                        try {
                            var n = parseInt(num);
                            if (isNaN(n)) return 0;
                            return n;
                        } catch (e){
                            return 0;
                        }
                    }

                    if (Array.isArray(data)) {
                        return data.length;
                    } else if (data) {
                        return 1;
                    }

                    return experimentsCountExpected || defaultOutput;
                }}
                blockTooltipContents={function(data, groupingTitle, groupingPropertyTitle, props){

                    var keysToShow = _.keys(TITLE_MAP);

                    var filteredData = data;
                    if (!Array.isArray(data)){
                        filteredData = _.pick(data, ...keysToShow);
                    } else {
                        filteredData = _.map(data, function(o){ return _.pick(o, ...keysToShow); });
                    }

                    var tips = StackedBlockVisual.defaultProps.blockTooltipContents(filteredData, groupingTitle, groupingPropertyTitle, props);
                    
                    if (Array.isArray(data) && data.length > 1){

                        var moreData = _.reduce(filteredData, function(m, o){
                            for (var i = 0; i < keysToShow.length; i++){
                                if (m[keysToShow[i]] === null){
                                    m[keysToShow[i]] = new Set();
                                }
                                m[keysToShow[i]].add(o[keysToShow[i]]);
                            }
                            return m;
                        }, _.object(_.zip(keysToShow, [].fill.call({ length : keysToShow.length }, null, 0, keysToShow.length))) );

                        _.forEach(_.keys(moreData), function(k){
                            if (k === 'additional_comments'){
                                delete moreData[k]; // Don't show when multiple, too long.
                                return;
                            }
                            moreData[k] = Array.from(moreData[k]);
                            if (moreData[k].length === 0){
                                delete moreData[k];
                            } else if (moreData[k].length > 1){
                                moreData[k] = '<span class="text-300">(' + moreData[k].length + ')</span> ' + moreData[k].join(', ');
                            } else {
                                moreData[k] = moreData[k][0];
                            }
                        });

                        tips += StackedBlockVisual.writeTipPropertiesFromJSONObject(moreData, props);

                    }
                    
                    return tips;

                }}
            />
        );
    }
}

