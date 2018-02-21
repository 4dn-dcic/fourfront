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
import SearchView from './../browse/SearchView';


export default class JointAnalysisReportsPage extends React.Component {

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.loadSearchResults = this.loadSearchResults.bind(this);
        this.state = {
            'mounted': false,
            'reportData': null
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
        this.loadSearchResults();
    }

    loadSearchResults(){
        var report_url = '/search/?type=Report&sort=-date_created';
        ajax.promise(report_url).then(response => {
            if (response['@graph'] && response['facets']){
                this.setState({'reportData': response});
            }else{
                this.setState({'reportData': null});
            }
        });
    }

    render() {

        if (this.state.reportData === null){
            return (
                <StaticPage.Wrapper>
                     <div className="text-center mt-5 mb-5" style={{ fontSize: '2rem', opacity: 0.5 }}><i className="mt-3 icon icon-spin icon-circle-o-notch"/></div>
                </StaticPage.Wrapper>
            );
        }

        console.log('RESULTS', this.state);

        return (
            <StaticPage.Wrapper>
                <div className="row">
                    <SearchView {...this.props} context={this.state.reportData}/>
                </div>
            </StaticPage.Wrapper>
        );
    }

}
globals.content_views.register(JointAnalysisReportsPage, 'Joint-analysis-reportsPage');
