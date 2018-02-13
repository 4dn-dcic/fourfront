'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import queryString from 'query-string';
import { Popover, Button } from 'react-bootstrap';
import { console, object, ajax } from'./../util';
import * as globals from './../globals';
import StaticPage from './StaticPage';


export default class JointAnalysisReportsPage extends React.Component {


    static defaultProps = {
        'self_results_url'          : '/browse/?experiments_in_set.biosample.biosource_summary=H1-hESC+%28Tier+1%29&experiments_in_set.biosample.biosource_summary=HFFc6+%28Tier+1%29&experimentset_type=replicate&type=ExperimentSetReplicate&status!=deleted&limit=all'
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.loadSearchQueryResults = this.loadSearchQueryResults.bind(this);
        this.state = {
            'mounted'               : false,
            'self_results'          : null
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

            // For testing
            if (this.props.href.indexOf('localhost') > -1 && req_url.indexOf('http') === -1) {
                req_url = 'https://data.4dnucleome.org' + req_url;
            }

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

        var groupingProperties = ['experiment_category', 'experiment_type'];

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
                            groupingProperties={groupingProperties}
                            columnGrouping='cell_type'
                            duplicateHeaders={false}
                            columnSubGrouping='experiment_category'
                            results={resultList4DN}
                            encode_results_url={this.props.encode_results_url}
                            self_results_url={this.props.self_results_url}
                            self_planned_results_url={this.props.self_planned_results_url}
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
                            encode_results_url={this.props.encode_results_url}
                            self_results_url={this.props.self_results_url}
                            self_planned_results_url={this.props.self_planned_results_url}
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
globals.content_views.register(JointAnalysisReportsPage, 'Joint-analysis-reportsPage');
