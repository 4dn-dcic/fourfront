'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, layout, navigate, ajax } from'./../util';
import * as globals from './../globals';
import StaticPage from './StaticPage';


export default class StatisticsPageView extends StaticPage {

    render(){
        return (
            <StaticPage.Wrapper>
                <StatisticsViewController>
                    <StatisticsChartsView />
                </StatisticsViewController>
            </StaticPage.Wrapper>
        );
    }

}



/**
 * Requests URIs defined in CHART_SEARCH_URIS, saves responses to own state, then passes down responses into child component(s).
 */
export class StatisticsViewController extends React.PureComponent {

    static CHART_SEARCH_URIS = {
        'File'                      : '/search/?type=File&experiments.display_title!=No%20value&limit=0',
        'ExperimentSetReplicate'    : '/search/?type=ExperimentSetReplicate&award.project=4DN&limit=0'
    };

    constructor(props){
        super(props);
        this.performSearchRequests  = this.performSearchRequests.bind(this);
        this.stateToChildProps      = this.stateToChildProps.bind(this);
        this.state = _.extend(
            { 'mounted' : false, 'loadingStatus' : 'loading' },
            _.object(_.map(_.keys(StatisticsViewController.CHART_SEARCH_URIS), function(k){ return ['resp' + k,null]; }))
        );
    }

    componentDidMount(){
        var nextState = { 'mounted' : true };
        this.performSearchRequests();
        this.setState(nextState);
    }

    performSearchRequests(chartUris = StatisticsViewController.CHART_SEARCH_URIS){ // TODO: Perhaps make search uris a prop.

        var resultStateToSet = {};

        var chartUrisAsPairs = _.pairs(chartUris),
            failureCallback = function(){
                this.setState({ 'loadingStatus' : 'failed' });
            }.bind(this),
            uponAllRequestsCompleteCallback = function(state = resultStateToSet){
                this.setState(_.extend({ 'loadingStatus' : 'complete' }, state));
            }.bind(this),
            uponSingleRequestsCompleteCallback = function(key, uri, resp){
                if ((resp && resp.code === 404) || _.keys(resp.aggregations).length === 0){
                    failureCallback();
                    return;
                }
                resultStateToSet['resp' + key] = resp;
                uponAllRequestsCompleteCallback(resultStateToSet);
            };

        if (chartUrisAsPairs.length > 1) {
            uponAllRequestsCompleteCallback = _.after(chartUrisAsPairs.length, uponAllRequestsCompleteCallback);
        }

        _.forEach(_.pairs(chartUris), ([key, uri]) => {
            ajax.load(uri, uponSingleRequestsCompleteCallback.bind(this, key, uri), 'GET', failureCallback);
        });

    }

    stateToChildProps(state = this.state){
        return _.object(_.filter(_.pairs(state), (pair)=>{
            // Which key:value pairs to pass to children.                
            if (pair[0] === 'mounted' || pair[0] === 'loadingStatus') return true;
            if (!state.mounted || state.loadingStatus !== 'complete') return false; // Don't pass responses in until finished.
            return true;
        }));
    }

    render(){
        if (Array.isArray(this.props.children)){
            return React.Children.map(this.props.children, (c)=>{
                return React.cloneElement(c, this.stateToChildProps(this.state));
            });
        } else {
            return React.cloneElement(this.props.children, this.stateToChildProps(this.state));
        }
    }

}



export class StatisticsChartsView extends React.PureComponent {

    loadingIcon(){
        return (
            <div className="mt-5 mb-5 text-center">
                <i className="icon icon-fw icon-spin icon-circle-o-notch icon-2x" style={{ opacity : 0.5 }}/>
                <h5 className="text-400">Loading Data</h5>
            </div>
        );
    }

    errorIcon(){
        return (
            <div className="mt-5 mb-5 text-center">
                <i className="icon icon-fw icon-times icon-2x"/>
                <h5 className="text-400">Loading failed. Please try again later.</h5>
            </div>
        );
    }

    render(){
        var { loadingStatus, mounted } = this.props;
        if (!mounted || loadingStatus === 'loading')    return this.loadingIcon();
        if (loadingStatus === 'failed')                 return this.errorIcon();
        return (
            <div>Test</div>
        );
    }

}


globals.content_views.register(StatisticsPageView, 'StatisticsPage');
