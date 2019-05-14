'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import queryString from 'query-string';
import { Popover, Button } from 'react-bootstrap';
import { console, object, ajax } from'./../../util';
import { StackedBlockVisual } from './../components';


export class JointAnalysisMatrix extends React.PureComponent {

    static defaultProps = {
        'self_results_url'          : '/browse/?experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29+differentiated+to+definitive+endoderm&experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all',
        'self_results_url_fields'   : [
            'experiments_in_set.experiment_type.display_title', 'lab', 'experiments_in_set.biosample.biosource_summary', 'status', 'lab.display_title',
            'experiments_in_set.experiment_categorizer.value', 'experiments_in_set.experiment_categorizer.field', 'experiments_in_set.display_title',
            'experiments_in_set.accession'
        ],
        'encode_results_url'        : 'https://www.encodeproject.org/search/?type=Experiment&biosample_summary=H1-hESC&biosample_summary=HFFc6&status!=archived&status!=revoked&limit=all',
        'encode_results_url_fields' : ['assay_slims', 'biosample_summary', 'assay_term_name', 'description', 'lab', 'status'],
        'self_planned_results_url'  : null,
        'fallbackNameForBlankField' : "None",
        'statusStateTitleMap'       : {
            'Submitted'                 : ['released', 'current'],
            'Internal Release'          : ['released to project', 'pre-release'],
            'In Submission'             : ['in review by lab', 'in review by project', 'submission in progress', 'released to lab'],
            'Planned'                   : ['to be uploaded by workflow', 'planned'],
            'Out of date'               : ['archived', 'revoked'],
            'Deleted'                   : ['deleted']
        },
        'cellTypeNameMap4DN'        : {
            "H1-hESC (Tier 1) differentiated to definitive endoderm" : "H1-DE",
            "H1-hESC (Tier 1)"          : "H1-hESC",
            "HFFc6 (Tier 1)"            : "HFFc6"
        },
        'groupingPropertiesSearchParamMap' : {
            '4DN'                       : {
                'experiment_category'       : 'experiments_in_set.experiment_type.display_title',
                'experiment_type'           : 'experiments_in_set.experiment_type.display_title',
                'cell_type'                 : 'experiments_in_set.biosample.biosource_summary',
                'sub_cat'                   : 'experiments_in_set.experiment_categorizer.value'
            },
            'ENCODE'                    : {
                'experiment_category'       : 'assay_slims',
                'experiment_type'           : 'assay_term_name',
                'cell_type'                 : 'biosample_term_name'
            }
        },
        'groupingProperties4DN'     : ['experiment_type', 'sub_cat'],
        'groupingPropertiesEncode'  : ['experiment_category', 'experiment_type'],
        'headerColumnsOrder'        : ['H1-hESC', 'H1-DE', 'HFFc6'],
        'titleMap'                  : {
            '_common_name'              : ' ',
            'experiment_type'           : "Experiment Type",
            'data_source'               : 'Available through',
            'lab_name'                  : 'Lab',
            'experiment_category'       : "Category",
            'state'                     : 'Submission Status',
            'cell_type'                 : 'Cell Type',
            'short_description'         : 'Description',
            'award'                     : 'Award',
            'accession'                 : 'Accession',
            'number_of_experiments'     : '# Experiments in Set',
            'submitted_by'              : "Submitter",
            'experimentset_type'        : "Set Type",
        },
        'columnSubGroupingOrder'    : ['Submitted', 'In Submission', 'Planned', 'Not Planned']
    };

    constructor(props){
        super(props);
        this.standardizeEncodeResult = this.standardizeEncodeResult.bind(this);
        this.standardize4DNResult = this.standardize4DNResult.bind(this);
        this.loadSearchQueryResults = this.loadSearchQueryResults.bind(this);
        this.state = {
            'mounted'               : false,
            'self_planned_results'  : null,
            'self_results'          : null,
            'encode_results'        : null
        };
    }

    standardizeEncodeResult(result, idx){
        const { fallbackNameForBlankField, statusStateTitleMap } = this.props;

        var cellType            = result.biosample_summary || fallbackNameForBlankField;
        var experimentType      = result.assay_term_name || fallbackNameForBlankField;
        var experimentCategory  = _.uniq(result.assay_slims || []);

        if (experimentCategory.length > 1){
            console.warn('We have 2+ experiment_types (experiments_in_set.experiment_type) for ', result);
        }
        experimentCategory = experimentCategory[0] || experimentCategory;

        return _.extend({}, result, {
            'cell_type'             : cellType,
            'experiment_category'   : experimentCategory,
            'experiment_type'       : experimentType,
            'data_source'           : 'ENCODE',
            'short_description'     : result.description || null,
            'lab_name'              : (result.lab && result.lab.title) || fallbackNameForBlankField,
            'state'                 : (_.find(_.pairs(statusStateTitleMap), function(pair){ return pair[1].indexOf(result.status) > -1; }) || ["None"])[0]
        });
    }

    standardize4DNResult(result, idx){
        const { fallbackNameForBlankField, statusStateTitleMap, cellTypeNameMap4DN, groupingPropertiesSearchParamMap } = this.props;

        var cellType = _.uniq(_.flatten(object.getNestedProperty(result, groupingPropertiesSearchParamMap['4DN'].cell_type)));
        if (cellType.length > 1){
            console.warn('We have 2+ cellTypes (experiments_in_set.biosample.biosource_summary) for ', result);
        }
        cellType = cellType[0] || fallbackNameForBlankField;
        cellType = cellTypeNameMap4DN[cellType] || cellType;

        var experimentType =  _.uniq(_.flatten(object.getNestedProperty(result, 'experiments_in_set.experiment_type.display_title')));
        if (experimentType.length > 1){
            console.warn('We have 2+ experiment_types (experiments_in_set.experiment_type.display_title) for ', result);
        }
        experimentType = experimentType[0] || fallbackNameForBlankField;

        //var experiment_titles = _.uniq(_.flatten(object.getNestedProperty(result, 'experiments_in_set.display_title')));
        var experiment_titles = _.map(result.experiments_in_set || [], function(exp){
            return exp.display_title.replace(' - ' + exp.accession, '');
        });

        experiment_titles = _.uniq(experiment_titles);
        if (experiment_titles.length > 1){
            console.warn('We have 2+ experiment titles (experiments_in_set.display_title, minus accession) for ', result);
        }

        var experiment_categorization_value = _.uniq(_.flatten(object.getNestedProperty(result, 'experiments_in_set.experiment_categorizer.value')));
        var experiment_categorization_title = _.uniq(_.flatten(object.getNestedProperty(result, 'experiments_in_set.experiment_categorizer.field')));

        if (experiment_categorization_value.length > 1){
            console.warn('We have 2+ experiment_categorizer.value for ', result);
        }
        if (experiment_categorization_title.length > 1){
            console.warn('We have 2+ experiment_categorizer.title for ', result);
        }

        experiment_categorization_value = experiment_categorization_value[0] || 'No value';
        experiment_categorization_title = experiment_categorization_title[0] || 'No field';

        return _.extend({}, result, {
            'cell_type'             : cellType,
            'experiment_type'       : experimentType,
            'experiment_category'   : experimentType,
            'data_source'           : '4DN',
            'short_description'     : experiment_titles[0] || null,
            'lab_name'              : (result.lab && result.lab.display_title) || fallbackNameForBlankField,
            'state'                 : (_.find(_.pairs(statusStateTitleMap), function(pair){ return pair[1].indexOf(result.status) > -1; }) || ["None"])[0],
            'sub_cat'               : experiment_categorization_value,
            'sub_cat_title'         : experiment_categorization_title
        });
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
        this.loadSearchQueryResults();
    }

    componentDidUpdate(pastProps){
        const { session } = this.props;
        if (session !== pastProps.session){
            this.loadSearchQueryResults();
        }
    }

    loadSearchQueryResults(){

        const commonCallback = (source_name, result) => {
            var updatedState = {};
            updatedState[source_name] = result['@graph'] || [];
            if (source_name === 'encode_results') {
                updatedState[source_name] = _.map(updatedState[source_name], this.standardizeEncodeResult);
            } else if (source_name === 'self_results'){
                updatedState[source_name] = _.map(updatedState[source_name], this.standardize4DNResult);
            }
            this.setState(updatedState);
        };

        const commonFallback = (source_name, result) => {
            var updatedState = {};
            updatedState[source_name] = false;
            this.setState(updatedState);
        };

        var dataSetNames = ['self_planned_results', 'self_results', 'encode_results'];

        this.setState(
            _.object(_.map(dataSetNames, function(n){ return [n, null]; })), // Reset all result states to 'null'
            () => {
                _.forEach(dataSetNames, (source_name)=>{
                    var req_url = this.props[source_name + '_url'],
                        req_url_fields = this.props[source_name + '_url_fields'];

                    if (typeof req_url !== 'string' || !req_url) return;

                    // For testing
                    if (window && window.location.href.indexOf('localhost') > -1 && req_url.indexOf('http') === -1) {
                        req_url = 'https://data.4dnucleome.org' + req_url;
                    }

                    if (Array.isArray(req_url_fields) && req_url_fields.length > 0){
                        _.forEach(req_url_fields, function(f){
                            req_url += '&field=' + encodeURIComponent(f);
                        });
                    }

                    if (source_name === 'encode_results' || req_url.slice(0, 4) === 'http'){ // Exclude 'Authorization' header for requests to different domains (not allowed).
                        ajax.load(req_url, (r) => commonCallback(source_name, r), 'GET', (r) => commonFallback(source_name, r), null, {}, ['Authorization', 'Content-Type']);
                    } else {
                        ajax.load(req_url, (r) => commonCallback(source_name, r), 'GET', (r) => commonFallback(source_name, r));
                    }

                });
            }
        );
    }

    render() {
        const { groupingProperties4DN, groupingPropertiesEncode, self_results_url } = this.props;
        const { self_planned_results, self_results, encode_results } = this.state;

        const isLoading = _.any(
            _.pairs(_.pick(this.state, 'self_planned_results', 'self_results', 'encode_results')),
            // eslint-disable-next-line react/destructuring-assignment
            ([key, resultsForKey]) => resultsForKey === null && this.props[key + '_url'] !== null
        );

        if (isLoading){
            return (
                <div>
                    <div className="text-center mt-5 mb-5" style={{ fontSize: '2rem', opacity: 0.5 }}><i className="mt-3 icon icon-spin icon-circle-o-notch"/></div>
                </div>
            );
        }

        const resultList4DN = ((Array.isArray(self_planned_results) && self_planned_results) || []).concat(
            ((Array.isArray(self_results) && self_results) || [])
        );

        return (
            <div className="static-section joint-analysis-matrix">
                <div className="row">
                    <div className={"col-xs-12 col-md-" + (encode_results ? '6' : '12')}>
                        <h3 className="mt-2 mb-0 text-300">4DN</h3>
                        <h5 className="mt-0 text-500" style={{ 'marginBottom' : -20, 'height' : 20, 'position' : 'relative', 'zIndex' : 10 }}>
                            <a href={self_results_url.replace('&limit=all', '')}>Browse all</a> 4DN data-sets
                        </h5>
                        <VisualBody
                            {..._.pick(this.props, 'groupingPropertiesSearchParamMap', 'cellTypeNameMap4DN', 'self_planned_results_url',
                                'self_results_url', 'headerColumnsOrder', 'titleMap')}
                            groupingProperties={groupingProperties4DN}
                            columnGrouping="cell_type"
                            duplicateHeaders={false}
                            columnSubGrouping="state"
                            results={resultList4DN}
                            //defaultDepthsOpen={[true, false, false]}
                            //keysToInclude={[]}
                        />
                    </div>
                    { encode_results ?
                        <div className="col-xs-12 col-md-6">
                            <h3 className="mt-2 mb-0 text-300">ENCODE</h3>
                            <VisualBody
                                {..._.pick(this.props, 'groupingPropertiesSearchParamMap', 'encode_results_url', 'headerColumnsOrder', 'titleMap')}
                                groupingProperties={groupingPropertiesEncode}
                                columnGrouping="cell_type"
                                columnSubGrouping="state"
                                results={encode_results}
                                duplicateHeaders={false}
                                //defaultDepthsOpen={[false, false, false]}
                                //keysToInclude={[]}
                            />
                        </div>
                        : null }
                </div>
            </div>
        );
    }

}


class VisualBody extends React.PureComponent {

    static groupValue(data, groupingTitle, groupingPropertyTitle){
        return StackedBlockVisual.Row.flattenChildBlocks(data).length;
    }

    static blockClassName(data, groupingTitle, groupingPropertyTitle, props, parentGrouping){
        var origClassName = StackedBlockVisual.defaultProps.blockClassName(data),
            submissionState = null;

        if (Array.isArray(data)){
            if      (_.any(data, { 'state' : 'Submitted'        })) submissionState = 'Submitted';
            else if (_.any(data, { 'state' : 'Internal Release' })) submissionState = 'Internal Release';
            else if (_.any(data, { 'state' : 'In Submission'    })) submissionState = 'In Submission';
            else if (_.any(data, { 'state' : 'Planned'          })) submissionState = 'Planned';
            else if (_.any(data, { 'state' : 'Out of date'      })) submissionState = 'Out of date';
            else if (_.any(data, { 'state' : 'Deleted'          })) submissionState = 'Deleted';
            else if (_.any(data, { 'state' : 'None'             })) submissionState = 'None';
        } else {
            submissionState = data.state;
        }

        var submissionStateClassName = submissionState && 'cellType-' + submissionState.replace(/ /g, '-').toLowerCase();
        return origClassName + ' ' + submissionStateClassName + ' hoverable clickable';
    }

    static blockRenderedContents(data, title, groupingPropertyTitle, blockProps){
        var count = 0;
        if (Array.isArray(data)) {
            count = data.length;
        } else if (data) {
            count = 1;
        }
        if (count > 100){
            return <span style={{ 'fontSize' : '0.95rem', 'position' : 'relative', 'top' : -1 }}>{ count }</span>;
        }
        return <span>{ count }</span>;
    }

    constructor(props){
        super(props);

        // Requires non-static `this.props.encode_results_url` & `this.props.self_results_url`.
        this.blockPopover = this.blockPopover.bind(this);
    }

    /**
     * @param {*} data An ExperimentSet or list of ExperimentSet, represented by a block/tile.
     * @param {*} groupingTitle Title of current group.
     * @param {*} groupingPropertyTitle Title of property which sets are grouped.
     * @param {Object} props Props passed in from the StackedBlockVisual Component instance.
     */
    blockPopover(data, groupingTitle, groupingPropertyTitle, props){
        var { self_results_url, encode_results_url, groupingPropertiesSearchParamMap, cellTypeNameMap4DN, titleMap } = this.props,
            isGroup = (Array.isArray(data) && data.length > 1) || false,
            aggrData;

        if (!isGroup && Array.isArray(data) && data.length > 0) {
            data = data[0];
        }

        if (isGroup){
            aggrData = StackedBlockVisual.aggregateObjectFromList(
                data,
                _.keys(titleMap).concat(['sub_cat', 'sub_cat_title']),
                ['sub_cat_title'] // We use this property as an object key (string) so skip parsing to React JSX list;
            );
            // Custom parsing down into string -- remove 'Default' from list and ensure is saved as string.
            if (Array.isArray(aggrData.sub_cat_title)){
                aggrData.sub_cat_title = _.without(aggrData.sub_cat_title, 'Default');
                if (aggrData.sub_cat_title.length > 1){
                    aggrData.sub_cat_title = 'Assay Details';
                } else {
                    aggrData.sub_cat_title = aggrData.sub_cat_title[0];
                }
            }
        }

        var groupingPropertyCurrent = props.groupingProperties[props.depth] || null,
            groupingPropertyCurrentTitle = groupingPropertyCurrent === 'sub_cat' ? (aggrData || data)['sub_cat_title'] : (groupingPropertyCurrent && titleMap[groupingPropertyCurrent]) || null,
            groupingPropertyCurrentValue = (aggrData || data)[groupingPropertyCurrent];

        var yAxisGrouping = props.columnGrouping || null,
            yAxisGroupingTitle = (yAxisGrouping && titleMap[yAxisGrouping]) || null,
            yAxisGroupingValue = (isGroup ? data[0][yAxisGrouping] : data[yAxisGrouping]) || null,
            popoverTitle = (
                <div className="clearfix matrix-popover-title">
                    <div className="x-axis-title pull-left">
                        <div className="text-300">{groupingPropertyCurrentTitle}</div>
                        <div className="text-400">{groupingPropertyCurrentValue}</div>
                    </div>
                    <div className="mid-icon pull-left">
                        <i className="icon icon-times"/>
                    </div>
                    <div className="y-axis-title pull-left">
                        <div className="text-300">{yAxisGroupingTitle}</div>
                        <div className="text-400">{yAxisGroupingValue}</div>
                    </div>
                </div>
            );

        var currentFilteringProperties = props.groupingProperties.slice(0, props.depth + 1); // TODO use to generate search link

        currentFilteringProperties.push(props.columnGrouping);

        var data_source = (aggrData || data).data_source;
        var initialHref = data_source === 'ENCODE' ? encode_results_url : self_results_url;
        var reversed_cell_type_map = _.invert(cellTypeNameMap4DN);

        var currentFilteringPropertiesVals = _.object(
            _.map(currentFilteringProperties, function(property){
                var facetField = groupingPropertiesSearchParamMap[data_source][property], facetTerm = (aggrData || data)[property];
                if (property === 'cell_type' && data_source === '4DN') facetTerm = reversed_cell_type_map[facetTerm] || facetTerm;
                return [ facetField, facetTerm ];
            })
        );

        function makeSearchButton(){
            var hrefParts = url.parse(initialHref, true);
            var hrefQuery = _.clone(hrefParts.query);
            delete hrefQuery.limit;
            delete hrefQuery.field;
            _.extend(hrefQuery, currentFilteringPropertiesVals);
            hrefParts.search = '?' + queryString.stringify(hrefQuery);
            var linkHref = url.format(hrefParts);

            return (
                <Button href={linkHref} target="_blank" bsStyle="primary" className="btn-block mt-1">View Experiment Sets</Button>
            );
        }

        function makeSingleItemButton(){
            var path = object.itemUtil.atId(data);
            if (data.data_source === 'ENCODE') path = 'https://encodeproject.org' + path;
            return (
                <Button href={path} target="_blank" bsStyle="primary" className="btn-block mt-1">View Experiment Set</Button>
            );
        }

        var keyValsToShow = _.pick(aggrData || data, 'lab_name', 'category');

        if ( (aggrData || data).sub_cat && (aggrData || data).sub_cat !== 'No value' && (aggrData || data).sub_cat_title ) {
            keyValsToShow[(aggrData || data).sub_cat_title] = (aggrData || data).sub_cat;
        }

        return (
            <Popover id="jap-popover" title={popoverTitle} style={{ maxWidth : 540, width: '100%' }}>
                { isGroup ?
                    <div className="inner">
                        <h5 className="text-400 mt-08 mb-15 text-center"><b>{ data.length }</b> Experiment Sets</h5>
                        <hr className="mt-0 mb-1"/>
                        { StackedBlockVisual.generatePopoverRowsFromJSON(keyValsToShow, props) }
                        { makeSearchButton() }
                    </div>
                    :
                    <div className="inner">
                        { StackedBlockVisual.generatePopoverRowsFromJSON(keyValsToShow, props) }
                        { makeSingleItemButton() }
                    </div>
                }
            </Popover>
        );

    }

    render(){
        const { results } = this.props;
        return (
            <StackedBlockVisual data={results} groupValue={VisualBody.groupValue} checkCollapsibility
                {..._.pick(this.props, 'groupingProperties', 'columnGrouping', 'titleMap',
                    'columnSubGrouping', 'defaultDepthsOpen', 'duplicateHeaders', 'headerColumnsOrder', 'columnSubGroupingOrder')}
                blockPopover={this.blockPopover}
                blockClassName={VisualBody.blockClassName}
                blockRenderedContents={VisualBody.blockRenderedContents}
                blockTooltipContents={null}
            />
        );
    }
}

