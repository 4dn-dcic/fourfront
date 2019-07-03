'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import queryString from 'query-string';
import { Popover, Button } from 'react-bootstrap';

import { console, object, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { StackedBlockVisual } from './../components';


export class JointAnalysisMatrix extends React.PureComponent {

    static defaultProps = {
        "self_results_url"          : "/browse/?experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29+differentiated+to+definitive+endoderm&experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN&limit=all",
        "self_results_url_fields"   : [
            "experiments_in_set.experiment_type.display_title", "lab", "experiments_in_set.biosample.biosource_summary", "status", "lab.display_title",
            "experiments_in_set.experiment_categorizer.value", "experiments_in_set.experiment_categorizer.field", "experiments_in_set.display_title",
            "experiments_in_set.accession"
        ],
        "encode_results_url"        : "https://www.encodeproject.org/search/?type=Experiment&biosample_summary=H1-hESC&biosample_summary=HFFc6&status!=archived&status!=revoked&limit=all",
        "encode_results_url_fields" : ["assay_slims", "biosample_summary", "assay_term_name", "description", "lab", "status"],
        "self_planned_results_url"  : null,
        "fallbackNameForBlankField" : "None",
        //"statusStateTitleMap"       : {
        //    "Submitted"                 : ["released", "current"],
        //    "Internal Release"          : ["released to project", "pre-release"],
        //    "In Submission"             : ["in review by lab", "in review by project", "submission in progress", "released to lab"],
        //    "Planned"                   : ["to be uploaded by workflow", "planned"],
        //    "Out of date"               : ["archived", "revoked"],
        //    "Deleted"                   : ["deleted"]
        //},
        /** Which state to set/prioritize if multiple expsets per group */
        "statePrioritizationForGroups" : ["Submitted", "Internal Release", "In Submission", "Planned", "Out of date", "Deleted"],
        /* Deprecated & superceded by valueChangeMap but some may still be present im StaticSection (and lack `valueChangeMap`).
        "cellTypeNameMap4DN"        : {
            "H1-hESC (Tier 1) differentiated to definitive endoderm" : "H1-DE",
            "H1-hESC (Tier 1)"          : "H1-hESC",
            "HFFc6 (Tier 1)"            : "HFFc6"
        },
        */
        "valueChangeMap" : {
            "4DN" : {
                "cell_type" : {
                    "H1-hESC (Tier 1) differentiated to definitive endoderm" : "H1-DE",
                    "H1-hESC (Tier 1)" : "H1-hESC",
                    "HFFc6 (Tier 1)" : "HFFc6"
                },
                "state" : {
                    "released" : "Submitted",
                    "current" : "Submitted",
                    "released to project" : "Internal Release",
                    "pre-release" : "Internal Release",
                    "in review by lab" : "In Submission",
                    "in review by project" : "In Submission",
                    "submission in progress" : "In Submission",
                    "released to lab" : "In Submission",
                    "to be uploaded by workflow" : "Planned",
                    "planned" : "Planned",
                    "archived" : "Out of date",
                    "revoked" : "Out of date",
                    "deleted" : "Deleted"
                }
            },
            "ENCODE" : {
                "cell_type" : {
                    "H1" : "H1-hESC"
                },
                "state" : {
                    "released" : "Submitted"
                }
            }
        },
        "fieldChangeMap" : {
            "4DN"                       : {
                "experiment_category"       : "experiments_in_set.experiment_type.display_title",
                "experiment_type"           : "experiments_in_set.experiment_type.display_title",
                "cell_type"                 : "experiments_in_set.biosample.biosource_summary",
                "sub_cat"                   : "experiments_in_set.experiment_categorizer.value",
                "sub_cat_title"             : "experiments_in_set.experiment_categorizer.field",
                "lab_name"                  : "lab.display_title",
                "short_description"         : "experiments_in_set.display_title",
                "state"                     : "status"
            },
            "ENCODE"                    : {
                "experiment_category"       : "assay_slims",
                "experiment_type"           : "assay_term_name",
                "cell_type"                 : "biosample_summary",
                "lab_name"                  : "lab.title",
                "short_description"         : "description",
                "state"                     : "status"
            }
        },
        "groupingProperties4DN"     : ["experiment_type", "sub_cat"],
        "groupingPropertiesEncode"  : ["experiment_category", "experiment_type"],
        "columnGrouping4DN"         : "cell_type",
        "columnGroupingEncode"      : "cell_type",
        "headerPadding"             : 80,
        "headerFor4DN"              : (
            <React.Fragment>
                <h3 className="mt-2 mb-0 text-300">4DN</h3>
                <h5 className="mt-0 text-500" style={{ 'marginBottom' : -20, 'height' : 20, 'position' : 'relative', 'zIndex' : 10 }}>
                    <a href="/browse/?experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29+differentiated+to+definitive+endoderm&experimentset_type=replicate&type=ExperimentSetReplicate&award.project=4DN">Browse all</a> 4DN data-sets
                </h5>
            </React.Fragment>
        ),
        "headerForEncode"           : <h3 className="mt-2 mb-0 text-300">ENCODE</h3>,
        "headerColumnsOrder"        : ["H1-hESC", "H1-DE", "HFFc6"],
        "titleMap"                  : {
            "sub_cat"                   : "AnyStringHereBecauseSubCatTitleIsUsed",
            "experiment_type"           : "Experiment Type",
            "cell_type"                 : "Cell Type",
            "lab_name"                  : "Lab",
            "experiment_category"       : "Category",
            "state"                     : "Submission Status",
            "short_description"         : "Description",
            //"data_source"               : "Available through",
            //"award"                     : "Award",
            //"accession"                 : "Accession",
            //"number_of_experiments"     : "# Experiments in Set",
            //"submitted_by"              : "Submitter",
            //"experimentset_type"        : "Set Type",
        },
        "columnSubGroupingOrder"    : ["Submitted", "In Submission", "Planned", "Not Planned"]
    };

    static convertResult(result, dataSource, fieldChangeMap, valueChangeMap, statusStateTitleMap, fallbackNameForBlankField){

        const convertedResult = _.clone(result);

        if (fieldChangeMap[dataSource]){
            _.forEach(_.pairs(fieldChangeMap[dataSource]), function([ fieldToMapTo, fieldToMapFrom ]){
                let value = object.getNestedProperty(result, fieldToMapFrom, fieldToMapTo);
                if (Array.isArray(value)){ // Only allow single vals.
                    value = _.uniq(_.flatten(value));
                    if (value.length > 1){
                        console.warn("We have 2+ of a grouping value", fieldToMapFrom, value, result);
                    }
                    value = value[0] || fallbackNameForBlankField;
                }
                convertedResult[fieldToMapTo] = value;
            }, {});
        }

        // Change values (e.g. shorten some):
        if (valueChangeMap[dataSource]){
            _.forEach(_.pairs(valueChangeMap[dataSource]), function([field, changeMap]){
                if (typeof convertedResult[field] === "string"){ // If present
                    convertedResult[field] = changeMap[convertedResult[field]] || convertedResult[field];
                }
            });
        }

        // Standardized state from status
        // TODO Use similar by-data-source structure as fieldChangeMap & valueChangeMap
        if (statusStateTitleMap){
            const [ stateTitleToSave ] = _.find(_.pairs(statusStateTitleMap), function([titleToSave, validStatuses]){ return validStatuses.indexOf(result.status) > -1; });
            convertedResult.state = stateTitleToSave || fallbackNameForBlankField;
        }
        // Save data source
        convertedResult.data_source = dataSource;

        return convertedResult;
    }

    constructor(props){
        super(props);
        this.standardizeEncodeResult = this.standardizeEncodeResult.bind(this);
        this.standardize4DNResult = this.standardize4DNResult.bind(this);
        this.loadSearchQueryResults = this.loadSearchQueryResults.bind(this);
        this.state = {
            "mounted"               : false,
            "self_planned_results"  : null,
            "self_results"          : null,
            "encode_results"        : null
        };
    }

    standardizeEncodeResult(result, idx){
        const { fallbackNameForBlankField, statusStateTitleMap, fieldChangeMap, valueChangeMap, groupingPropertiesSearchParamMap } = this.props;
        const fullResult = JointAnalysisMatrix.convertResult(
            result, "ENCODE", (fieldChangeMap || groupingPropertiesSearchParamMap), valueChangeMap, statusStateTitleMap, fallbackNameForBlankField
        );
        return fullResult;
    }

    standardize4DNResult(result, idx){
        const { fallbackNameForBlankField, statusStateTitleMap, fieldChangeMap : propFieldChangeMap, valueChangeMap, groupingPropertiesSearchParamMap, cellTypeNameMap4DN } = this.props;
        const fieldChangeMap = propFieldChangeMap || groupingPropertiesSearchParamMap; // prop name `groupingPropertiesSearchParamMap` has been deprecated.

        const fullResult = JointAnalysisMatrix.convertResult(
            result, "4DN", fieldChangeMap, valueChangeMap, statusStateTitleMap, fallbackNameForBlankField
        );

        // (Deprecated) Harcoded rule for cellType
        if (cellTypeNameMap4DN && typeof fullResult.cell_type !== "undefined"){
            fullResult.cell_type = cellTypeNameMap4DN[fullResult.cell_type] || fullResult.cell_type;
        }

        // Remove accessions from short description(s).
        if (fieldChangeMap["4DN"].short_description && fieldChangeMap["4DN"].short_description === "experiments_in_set.display_title"){
            let experiment_titles = _.map(result.experiments_in_set || [], function(exp){
                return exp.display_title.replace(" - " + exp.accession, "");
            });
            experiment_titles = _.uniq(experiment_titles);
            if (experiment_titles.length > 1){
                console.warn("We have 2+ experiment titles (experiments_in_set.display_title, minus accession) for ", result);
            }
            _.extend(fullResult, { "short_description" : experiment_titles[0] || null });
        }

        // Remove sub_cat_title & sub_cat (special case) if are "Default" & "None"
        if (fullResult.sub_cat === fallbackNameForBlankField && fullResult.sub_cat_title === "Default"){
            delete fullResult.sub_cat;
            delete fullResult.sub_cat_title;
        }

        return fullResult;
    }

    componentDidMount(){
        this.setState({ "mounted" : true });
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
            updatedState[source_name] = result["@graph"] || [];
            if (source_name === "encode_results") {
                updatedState[source_name] = _.map(updatedState[source_name], this.standardizeEncodeResult);
            } else if (source_name === "self_results"){
                updatedState[source_name] = _.map(updatedState[source_name], this.standardize4DNResult);
            }
            this.setState(updatedState);
        };

        const commonFallback = (source_name, result) => {
            var updatedState = {};
            updatedState[source_name] = false;
            this.setState(updatedState);
        };

        const dataSetNames = ["self_planned_results", "self_results", "encode_results"];

        this.setState(
            _.object(_.map(dataSetNames, function(n){ return [n, null]; })), // (Re)Set all result states to 'null'
            () => {
                _.forEach(dataSetNames, (source_name)=>{
                    // eslint-disable-next-line react/destructuring-assignment
                    let req_url = this.props[source_name + '_url'];
                    // eslint-disable-next-line react/destructuring-assignment
                    const req_url_fields = this.props[source_name + '_url_fields'];

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
        const {
            groupingProperties4DN, groupingPropertiesEncode, self_results_url, fieldChangeMap, groupingPropertiesSearchParamMap,
            valueChangeMap : propValueChangeMap, cellTypeNameMap4DN, columnGrouping4DN, columnGroupingEncode,
            headerFor4DN, headerForEncode
        } = this.props;
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

        const valueChangeMap = propValueChangeMap || { "4DN" : { "cellType" : cellTypeNameMap4DN }, "ENCODE" : {} };

        return (
            <div className="static-section joint-analysis-matrix">
                <div className="row">
                    <div className={"col-xs-12 col-md-" + (encode_results ? '6' : '12')}>
                        { headerFor4DN }
                        <VisualBody
                            {..._.pick(this.props, 'self_planned_results_url', 'self_results_url', 'headerColumnsOrder',
                                'titleMap', 'statePrioritizationForGroups', 'fallbackNameForBlankField', 'headerPadding')}
                            groupingProperties={groupingProperties4DN}
                            fieldChangeMap={fieldChangeMap || groupingPropertiesSearchParamMap}
                            valueChangeMap={valueChangeMap}
                            columnGrouping={columnGrouping4DN}
                            duplicateHeaders={false}
                            columnSubGrouping="state"
                            results={resultList4DN}
                            //defaultDepthsOpen={[true, false, false]}
                            //keysToInclude={[]}
                        />
                    </div>
                    { encode_results ?
                        <div className="col-xs-12 col-md-6">
                            { headerForEncode }
                            <VisualBody
                                {..._.pick(this.props, 'encode_results_url', 'headerColumnsOrder', 'titleMap',
                                    'statePrioritizationForGroups', 'fallbackNameForBlankField', 'headerPadding')}
                                groupingProperties={groupingPropertiesEncode}
                                fieldChangeMap={fieldChangeMap || groupingPropertiesSearchParamMap}
                                valueChangeMap={valueChangeMap}
                                columnGrouping={columnGroupingEncode}
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

    static blockRenderedContents(data){
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
        this.blockPopover = this.blockPopover.bind(this);
        this.blockClassName = this.blockClassName.bind(this);
    }

    blockClassName(data){
        const { statePrioritizationForGroups, fallbackNameForBlankField } = this.props;
        const origClassName = StackedBlockVisual.defaultProps.blockClassName(data);
        let submissionState = null;

        if (Array.isArray(data)){
            var stateToTest, i;
            for (i = 0; i < statePrioritizationForGroups.length; i++){
                stateToTest = statePrioritizationForGroups[i];
                if ( _.any(data, { 'state' : stateToTest }) ){
                    submissionState = stateToTest;
                    break;
                }
            }
            if (submissionState === null){
                submissionState = (data[0] && data[0].state) || fallbackNameForBlankField;
            }
        } else {
            submissionState = data.state;
        }

        const submissionStateClassName = submissionState && 'cellType-' + submissionState.replace(/ /g, '-').toLowerCase();
        return origClassName + ' ' + submissionStateClassName + ' hoverable clickable';
    }

    /**
     * @param {*} data An ExperimentSet or list of ExperimentSet, represented by a block/tile.
     * @param {Object} props Props passed in from the StackedBlockVisual Component instance.
     */
    blockPopover(data, blockProps, parentGrouping){
        const { self_results_url, encode_results_url, fieldChangeMap, valueChangeMap, titleMap, groupingProperties, columnGrouping } = this.props;
        const { depth } = blockProps;
        const isGroup = (Array.isArray(data) && data.length > 1) || false;
        let aggrData;

        if (!isGroup && Array.isArray(data)){
            data = data[0];
        }

        if (isGroup){
            const keysToInclude = _.uniq(_.keys(titleMap).concat(['sub_cat', 'sub_cat_title', 'data_source', columnGrouping]).concat(groupingProperties));
            aggrData = StackedBlockVisual.aggregateObjectFromList(
                data, keysToInclude, ['sub_cat_title'] // We use this property as an object key (string) so skip parsing to React JSX list;
            );

            // Custom parsing down into string -- remove 'Default' from list and ensure is saved as string.
            if (Array.isArray(aggrData.sub_cat_title)){
                aggrData.sub_cat_title = _.without(_.uniq(aggrData.sub_cat_title), 'Default');
                if (aggrData.sub_cat_title.length !== 1){ // If multiple or if none.
                    aggrData.sub_cat_title = 'Assay Details';
                } else {
                    aggrData.sub_cat_title = aggrData.sub_cat_title[0];
                }
            }
        } else {
            aggrData = data;
            if (aggrData.sub_cat_title && aggrData.sub_cat_title === "Default"){ // Or maybe remove entirely? <- handled in standardize4DNResult()
                aggrData.sub_cat_title = 'Assay Details';
            }
        }

        const groupingPropertyCurrent = groupingProperties[depth] || null;
        const groupingPropertyCurrentTitle = (
            groupingPropertyCurrent === 'sub_cat' ? aggrData['sub_cat_title'] // <- Special case
                : (groupingPropertyCurrent && titleMap[groupingPropertyCurrent]) || groupingPropertyCurrent || null
        );
        const groupingPropertyCurrentValue = aggrData[groupingPropertyCurrent];

        // Generate title area which shows current grouping vals.
        const yAxisGroupingTitle = (columnGrouping && titleMap[columnGrouping]) || columnGrouping || null;
        const yAxisGroupingValue = (isGroup ? data[0][columnGrouping] : data[columnGrouping]) || null;
        const popoverTitle = (
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

        const data_source = aggrData.data_source;

        function makeSearchButton(){
            const currentFilteringProperties = groupingProperties.slice(0, depth + 1).concat([columnGrouping]);
            const currentFilteringPropertiesVals = _.object(
                _.map(currentFilteringProperties, function(property){
                    const facetField = fieldChangeMap[data_source][property];
                    let facetTerm = aggrData[property];
                    if (valueChangeMap && valueChangeMap[data_source] && valueChangeMap[data_source][property]){
                        // Convert back to in-database value for use in the search query.
                        const reversedValChangeMapForCurrSource = _.invert(valueChangeMap[data_source][property]);
                        facetTerm = reversedValChangeMapForCurrSource[facetTerm] || facetTerm;
                    }
                    return [ facetField, facetTerm ];
                })
            );

            const initialHref = data_source === 'ENCODE' ? encode_results_url : self_results_url;
            const hrefParts = url.parse(initialHref, true);
            const hrefQuery = _.clone(hrefParts.query);
            delete hrefQuery.limit;
            delete hrefQuery.field;
            _.extend(hrefQuery, currentFilteringPropertiesVals);
            hrefParts.search = '?' + queryString.stringify(hrefQuery);
            const linkHref = url.format(hrefParts);

            return (
                <Button href={linkHref} target="_blank" bsStyle="primary" className="btn-block mt-1">View Experiment Sets</Button>
            );
        }

        function makeSingleItemButton(){
            let path = object.itemUtil.atId(data);
            if (data_source === 'ENCODE') path = 'https://encodeproject.org' + path; // Else will be abs path relative to current domain.
            return (
                <Button href={path} target="_blank" bsStyle="primary" className="btn-block mt-1">View Experiment Set</Button>
            );
        }

        // We will render only values shown in titleMap _minus_ groupingProperties & columnGrouping
        const keysToShow = _.without(_.keys(titleMap), columnGrouping, ...groupingProperties);
        const keyValsToShow = _.pick(aggrData, ...keysToShow);

        // 'sub_cat' and 'sub_cat_title' are special case where we want sub_cat_title as key and sub_cat as value.
        if (
            (typeof titleMap.sub_cat !== 'undefined' || typeof titleMap.sub_cat_title !== 'undefined') &&
            (aggrData.sub_cat && aggrData.sub_cat !== 'No value' && aggrData.sub_cat_title)
        ){
            keyValsToShow[aggrData.sub_cat_title] = aggrData.sub_cat;
            delete keyValsToShow.sub_cat;
            delete keyValsToShow.sub_cat_title;
        }

        return (
            <Popover id="jap-popover" title={popoverTitle} style={{ maxWidth : 540, width: '100%' }}>
                { isGroup ?
                    <div className="inner">
                        <h5 className="text-400 mt-08 mb-15 text-center"><b>{ data.length }</b> Experiment Sets</h5>
                        <hr className="mt-0 mb-1"/>
                        { StackedBlockVisual.generatePopoverRowsFromJSON(keyValsToShow, this.props) }
                        { makeSearchButton() }
                    </div>
                    :
                    <div className="inner">
                        { StackedBlockVisual.generatePopoverRowsFromJSON(keyValsToShow, this.props) }
                        { makeSingleItemButton() }
                    </div>
                }
            </Popover>
        );

    }

    render(){
        const { results } = this.props;
        return (
            <StackedBlockVisual data={results} checkCollapsibility
                {..._.pick(this.props, 'groupingProperties', 'columnGrouping', 'titleMap', 'headerPadding',
                    'columnSubGrouping', 'defaultDepthsOpen', 'duplicateHeaders', 'headerColumnsOrder', 'columnSubGroupingOrder')}
                blockPopover={this.blockPopover}
                blockClassName={this.blockClassName}
                blockRenderedContents={VisualBody.blockRenderedContents}
            />
        );
    }
}

