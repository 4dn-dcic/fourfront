'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import {  Collapse } from 'react-bootstrap';
import { console, object, ajax, JWT } from'./../util';
import * as globals from './../globals';
import StaticPage from './StaticPage';


export default class ReleaseUpdates extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            'mounted': false,
            'updateData': null,
            'updateTag': null,
            'updateParam': null
        };
        this.componentDidMount = this.componentDidMount.bind(this);
        this.loadUpdates = this.loadUpdates.bind(this);
        this.viewUpdates = this.viewUpdates.bind(this);
    }

    componentDidMount(){
        var thisUrl = url.parse(this.props.href, true);
        var updateTag = thisUrl.query['update_tag'] || null;
        var updateParam = thisUrl.query['parameters'] || null;
        var isAdmin = _.contains(JWT.getUserGroups(), 'admin');
        this.setState({
            'mounted' : true,
            'updateTag': updateTag,
            'updateParam': updateParam,
            'title': null,
            'isAdmin': isAdmin
        });
        this.loadUpdates(updateTag, updateParam);
    }


    loadUpdates(updateTag = null, updateParam = null){
        var useTag = updateTag || this.state.updateTag || '*';
        var useParam = updateParam || this.state.updateParam;
        // enforce date ranges through the query string
        var qString = 'update_tag:' + useTag;
        if (useParam){
            qString += ' AND parameters:' + useParam;
        }
        var update_url = '/search/?type=DataReleaseUpdate&sort=-date_created&q=' + encodeURIComponent(qString);
        this.setState({'updateData': null});
        ajax.promise(update_url).then(response => {
            if (response['@graph'] && response['facets']){
                var stateToSet = this.state;
                stateToSet['updateData'] = response['@graph'];
                if(useTag && useTag !== '*'){
                    // assume all dates are the consistent for updates with the same tag
                    var startDate = response['@graph'][0]['start_date'];
                    var endDate = response['@graph'][0]['end_date'];
                    var title = 'From   ' + startDate + '   to   ' + endDate;
                    stateToSet['title'] = title;
                }
                this.setState(stateToSet);
            }else{
                this.setState({'updateData': []});
            }
        });
    }

    viewUpdates(){
        if(this.state.updateData === null){
            return(
                <div className="text-center mt-5 mb-5" style={{ fontSize: '2rem', opacity: 0.5 }}>
                    <i className="mt-3 icon icon-spin icon-circle-o-notch"/>
                </div>
            );
        }else if(this.state.updateData.length == 0){
            return(
                <div style={{'textAlign': 'center'}}>
                    <h5>No results.</h5>
                </div>
            );
        }else{
            return(
                <div className="item-page-container">
                    {this.state.updateData.map((update) => 
                        <SingleUpdate
                            {...this.props}
                            id={update.uuid}
                            key={update.uuid}
                            isAdmin={this.state.isAdmin}
                            updateData={update}
                        />
                    )}
                </div>
            );
        }
    }

    render() {
        var title = null;
        if (this.state.title){
            title = <h3 style={{'marginTop':'0px', 'fontWeight': 250}}>{this.state.title}</h3>;
        }
        return (
            <StaticPage.Wrapper>
                { title }
                <hr/>
                {this.viewUpdates()}
            </StaticPage.Wrapper>
        );
    }

}
globals.content_views.register(ReleaseUpdates, 'Release-updatesPage');


class SingleUpdate extends React.Component {
    static propTypes = {
        'onFinishOpen' : PropTypes.func,
        'onStartOpen' : PropTypes.func,
        'onFinishClose' : PropTypes.func,
        'onStartClose' : PropTypes.func
    }

    constructor(props){
        super(props);
        this.state = {
            'comments': this.props.updateData.comments || '',
            'open': false
        };
        this.toggle = _.throttle(this.toggle.bind(this), 500);
        this.buildItem = this.buildItem.bind(this);
    }

    toggle(){
        this.setState({ 'open' : !this.state.open });
    }

    buildItem(item){
        // catch errors where there are no experiments in a set
        // this should not happen, but can occur with test data...
        if (item.primary_id.experiments_in_set.length == 0){
            return null;
        }
        return(
            <div key={item.primary_id.uuid} className="overview-blocks row mb-1">
                <div className="col-sm-12">
                    <div className="inner" style={{ 'borderTop' : '1px solid rgba(0,0,0,0.15)' }}>
                        <h5>Replicate set</h5>
                        <div>
                            <a href={item.primary_id['@id']}>{item.primary_id.display_title}</a>
                        </div>
                    </div>
                </div>
                <div className="col-xs-12 col-sm-6 col-md-4">
                    <div className="inner">
                        <h5>Experiment type</h5>
                        <div>{item.primary_id.experiments_in_set[0].experiment_type}</div>
                    </div>
                </div>
                <div className="col-xs-12 col-sm-6 col-md-4">
                    <div className="inner">
                        <h5>Biosource</h5>
                        <div>{item.primary_id.experiments_in_set[0].biosample.biosource_summary}</div>
                    </div>
                </div>
                <div className="col-xs-12 col-sm-6 col-md-4">
                    <div className="inner">
                        <h5>Category</h5>
                        <div>{item.primary_id.experiments_in_set[0].experiment_categorizer.field + ': ' + item.primary_id.experiments_in_set[0].experiment_categorizer.value}</div>
                    </div>
                </div>
                <div className="col-sm-12 ">
                    <div className="inner">
                        <h5>Item causing update</h5>
                        <div>
                            <a href={item.secondary_id['@id']}>{item.secondary_id.display_title}</a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    render(){
        var editLink = null;
        if(this.props.isAdmin){
            editLink = <a href={this.props.updateData['@id'] + '#!edit'}>Edit</a>;
        }
        var styleObj = {
            'borderColor' : 'transparent'
        };
        if (this.props.updateData.severity === 1){
            styleObj.backgroundColor = '#fcf8e3';
        } else if (this.props.updateData.severity === 2){
            styleObj.backgroundColor = '#f2dede';
        } else if (this.props.updateData.severity === 3){
            styleObj.backgroundColor = '#f5a894';
        } else {
            styleObj.backgroundColor = "#dff0d8";
        }
        var summaryStr = '(' + this.props.updateData.update_items.length + ') ' + this.props.updateData.summary;
        return(
            <div className={"overview-blocks-header with-background mb-2" + (this.state.open ? ' is-open' : ' is-closed')} style={styleObj}>
                <h4 className="tab-section-title clickable with-accent" onClick={this.toggle}>
                    <span><i className={"expand-icon icon icon-" + (this.state.open ? 'minus' : 'plus')} data-tip={this.state.open ? 'Collapse' : 'Expand'}/>{ summaryStr } <i className={"icon icon-angle-right" + (this.state.open ? ' icon-rotate-90' : '')}/></span>
                </h4>
                <Collapse in={this.state.open} onEnter={this.props.onStartOpen} onEntered={this.props.onFinishOpen} onExit={this.props.onStartClose} onExited={this.props.onFinishClose}>
                    <div className="inner">
                        <hr className="tab-section-title-horiz-divider" style={{ borderColor : 'rgba(0,0,0,0.25)' }}/>
                        <div>
                            <div className="row mt-07 mb-07">
                                <div className="col-sm-10">{this.props.updateData.comments || "No comments."}</div>
                                <div className="col-sm-2 text-right">{editLink}</div>
                            </div>
                            {this.props.updateData.update_items.map((item) => this.buildItem(item))}
                        </div>
                    </div>
                </Collapse>
            </div>
        );
    }
}
