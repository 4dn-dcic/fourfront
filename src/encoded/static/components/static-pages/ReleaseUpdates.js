'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import {  Collapse, Table } from 'react-bootstrap';
import { console, object, ajax, JWT } from'./../util';
import * as globals from './../globals';
import StaticPage from './StaticPage';


export default class ReleaseUpdates extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            'mounted': false,
            'sectionData':null,
            'updateData': null,
            'updateTag': null,
            'updateParam': null
        };
        this.componentDidMount = this.componentDidMount.bind(this);
        this.loadSection = this.loadSection.bind(this);
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
            'isAdmin': isAdmin
        });
        this.loadSection(updateTag);
        this.loadUpdates(updateTag, updateParam);
    }


    loadSection(updateTag = null){
        // sectionData is an object with 'content' and 'id'
        var useTag = updateTag || this.state.updateTag || '*';
        if (useTag){
            var section_url = '/static-sections/release-updates.' + useTag;
            ajax.promise(section_url).then(response => {
                if (response['name'] && response['content']){
                    var section_data = {
                        'content': response['content'],
                        '@id': response['@id']
                    };
                    this.setState({'sectionData': section_data});
                }else{
                    this.setState({'sectionData': null});
                }
            });
        }
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
            if (response['@graph'] && response['@graph'].length > 0){
                this.setState({'updateData': response['@graph']});
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
        var subtitle = null;
        if (this.state.sectionData){
            var editLink = null;
            if(this.state.isAdmin){
                editLink = <a href={this.state.sectionData['@id'] + '#!edit'}>Edit</a>;
            }
            subtitle = (<div className="row">
                            <div className="col-sm-11" dangerouslySetInnerHTML={{__html: this.state.sectionData['content']}}></div>
                            <div className="col-sm-1 text-right">{editLink}</div>
                       </div>);
        }
        return (
            <StaticPage.Wrapper>
                {subtitle}
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
        this.buildSecondary = this.buildSecondary.bind(this);
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
            <tr key={item.primary_id.uuid} >
                <td><a href={item.primary_id['@id']}>{item.primary_id.display_title}</a></td>
                <td>{item.primary_id.experiments_in_set[0].experiment_type}</td>
                <td>{item.primary_id.experiments_in_set[0].biosample.biosource_summary}</td>
                <td>
                    {item.primary_id.experiments_in_set[0].experiment_categorizer.value === null ? null :  item.primary_id.experiments_in_set[0].experiment_categorizer.field + ': ' + item.primary_id.experiments_in_set[0].experiment_categorizer.value}
                </td>
                <td>
                    {this.buildSecondary(item.primary_id['@id'], item.secondary_ids)}
                </td>
            </tr>
        );
    }

    buildSecondary(set_id, secondary_list){
        // create a div that contains a list of secondary @ids or
        // nothing if the only secondary id == set_id (primary)
        if (secondary_list.length == 1 && set_id === secondary_list[0]['@id']){
            return null;
        }else{
            return secondary_list.map((item) => <div key={item['@id']}><a  href={item['@id']}>{item.display_title}</a></div>);
        }
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
        return(
            <div className={"overview-blocks-header with-background mb-1" + (this.state.open ? ' is-open' : ' is-closed')} style={styleObj}>
                <h5 className="release-section-title clickable with-accent" onClick={this.toggle}>
                    <span><i className={"expand-icon icon icon-" + (this.state.open ? 'minus' : 'plus')} data-tip={this.state.open ? 'Collapse' : 'Expand'}/>{ this.props.updateData.summary } <i className={"icon icon-angle-right" + (this.state.open ? ' icon-rotate-90' : '')}/></span>
                </h5>
                <Collapse in={this.state.open} onEnter={this.props.onStartOpen} onEntered={this.props.onFinishOpen} onExit={this.props.onStartClose} onExited={this.props.onFinishClose}>
                    <div className="inner">
                        <hr className="tab-section-title-horiz-divider" style={{ borderColor : 'rgba(0,0,0,0.25)' }}/>
                        <div>
                            <div className="row mt-07 mb-07">
                                <div className="col-sm-11">{this.props.updateData.comments || "No comments."}</div>
                                <div className="col-sm-1 text-right">{editLink}</div>
                            </div>
                            <Table className="mb-1" striped bordered condensed>
                                <thead>
                                    <tr>
                                        <th>Replicate set</th>
                                        <th>Experiment type</th>
                                        <th>Biosource</th>
                                        <th>Assay details</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {this.props.updateData.update_items.map((item) => this.buildItem(item))}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                </Collapse>
            </div>
        );
    }
}
