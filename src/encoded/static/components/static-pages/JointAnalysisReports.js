'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import queryString from 'query-string';
import { Button } from 'react-bootstrap';
import { console, object, ajax } from'./../util';
import * as globals from './../globals';
import StaticPage from './StaticPage';
import moment from 'moment';


export default class JointAnalysisReportsPage extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            'mounted': false,
            'reportData': null,
            'upperDate': null,
            'lowerDate': null
        };
        this.componentDidMount = this.componentDidMount.bind(this);
        this.loadReports = this.loadReports.bind(this);
        this.viewReports = this.viewReports.bind(this);
        this.buildReport = this.buildReport.bind(this);
    }

    componentDidMount(){
        // getting starting date ranges from url. default: a week ago to today
        var toDate = moment().format('YYYY-MM-DD');
        var fromDate = moment().subtract(7,'d').format('YYYY-MM-DD');
        var thisUrl = new URL(this.props.href);
        var urlTo = thisUrl.searchParams.get('to');
        var urlFrom = thisUrl.searchParams.get('from');
        if(urlTo && moment(urlTo, 'YYYY-MM-DD', true).isValid()){
            toDate = urlTo;
        }
        if(urlFrom && moment(urlFrom, 'YYYY-MM-DD', true).isValid()){
            fromDate = urlFrom;
        }
        this.setState({
            'mounted' : true,
            'upperDate': toDate,
            'lowerDate': fromDate
        });
        this.loadReports(fromDate, toDate);
    }



    loadReports(forceLower = null, forceUpper = null){
        var upper = forceUpper || this.state.upperDate;
        var lower = forceLower || this.state.lowerDate;
        // enforce date ranges through the query string
        var qString = 'new_data_bound:<=' + upper + ' AND old_data_bound:>=' + lower;
        var report_url = '/search/?type=Report&sort=-date_created&q=' + qString;
        this.setState({'reportData': null});
        ajax.promise(report_url).then(response => {
            if (response['@graph'] && response['facets']){
                this.setState({'reportData': response['@graph']});
            }else{
                this.setState({'reportData': []});
            }
        });
    }

    viewReports(){
        if(this.state.reportData === null){
            return(
                 <div className="text-center mt-5 mb-5" style={{ fontSize: '2rem', opacity: 0.5 }}>
                    <i className="mt-3 icon icon-spin icon-circle-o-notch"/>
                </div>
            );
        }else if(this.state.reportData.length == 0){
            return(
                <div className="row" style={{'textAlign': 'center'}}>
                    <h5>No results.</h5>
                </div>
            );
        }else{
            return(
                <div className="row">
                    {this.state.reportData.map((report) => this.buildReport(report))}
                </div>
            );
        }
    }

    buildReport(report){
        return(
            <SingleReport
                {...this.props}
                id={report.uuid}
                reportData={report}
            />
        );
    }

    handleChange(name, value){
        var stateToSet = this.state;
        stateToSet[name] = value;
        this.setState(stateToSet);
    }

    render() {

        if (this.state.reportData === null){
            return (
                <StaticPage.Wrapper>

                </StaticPage.Wrapper>
            );
        }

        console.log('RESULTS', this.state);

        return (
            <StaticPage.Wrapper>
                <div className="row" style={{"paddingBottom":"10px", "borderBottom": "1px solid #ccc", "marginBottom": "10px"}}>
                    <DateSelectors
                        {...this.props}
                        upperDate={this.state.upperDate}
                        lowerDate={this.state.lowerDate}
                        handleChange={this.handleChange.bind(this)}
                        loadReports={this.loadReports.bind(this)}
                        hasData={this.state.reportData !== null}
                    />
                </div>
                {this.viewReports()}
            </StaticPage.Wrapper>
        );
    }

}
globals.content_views.register(JointAnalysisReportsPage, 'Joint-analysis-reportsPage');


class DateSelectors extends React.Component {
    constructor(props){
        super(props);
        this.submitDates = this.submitDates.bind(this);
        this.checkValidity = this.checkValidity.bind(this);
    }

    checkValidity(){
        // right now all this does is check if lowerDate <= upperDate and if we have data
        var isAfter = moment(this.props.upperDate).isAfter(this.props.lowerDate);
        var isSame = moment(this.props.upperDate).isSame(this.props.lowerDate);
        return this.props.hasData && (isAfter || isSame);
    }

    submitDates(e){
        e.preventDefault();
        this.props.loadReports();
    }

    render(){
        var valid = this.checkValidity();
        return(
            <div className="col-sm-8 col-xs-12">
                <div className="row" style={{"textAlign":"center"}}>
                    <div className="col-sm-2 col-xs-12">
                        <h5>From</h5>
                    </div>
                    <div className="col-sm-3 col-xs-4">
                        <DateInput
                            name="lowerDate"
                            value={this.props.lowerDate}
                            handleChange={this.props.handleChange}
                        />
                    </div>
                    <div className="col-sm-2 col-xs-4">
                        <h5>to</h5>
                    </div>
                    <div className="col-sm-3 col-xs-4">
                        <DateInput
                            name="upperDate"
                            value={this.props.upperDate}
                            handleChange={this.props.handleChange}
                        />
                    </div>
                    <div className="col-sm-2 col-xs-4">
                        <Button bsStyle="success" disabled={valid === false} onClick={this.submitDates}>
                            Submit
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
}

class DateInput extends React.Component {
    constructor(props){
        super(props);
    }

    handleChange(e){
        this.props.handleChange(this.props.name, e.target.value);
    }

    render(){
        var currDate = moment().format('YYYY-MM-DD');
        return(
            <div>
                <input
                    id={this.props.name}
                    name={this.props.name}
                    value={this.props.value}
                    type="date"
                    min="2017-01-01"
                    max={currDate}
                    required
                    onChange={this.handleChange.bind(this)}
                />
            </div>
        );
    }
}

class SingleReport extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            'comments': this.props.reportData.comments || ''
        };
    }

    componentDidMount(){

    }

    render(){
        return(
            <div>
                <div>{this.props.reportData.summary}</div>
                <div>{this.state.comments}</div>
            </div>
        );
    }
}
