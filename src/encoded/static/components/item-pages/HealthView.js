'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import { content_views } from './../globals';
import { ajax, console, object, Filters, JWT } from './../util';
import { ItemPageTitle, ItemDetailList } from './components';
import _ from 'underscore';
import { Button } from 'react-bootstrap';
import JSONTree from 'react-json-tree';

/**
 * Fallback content_view for pages which are not specifically 'Items.
 * Renders out JSON.
 *
 * @export
 * @class Item
 * @extends {React.Component}
 */
export class HealthView extends React.Component {

    static propTypes = {
        'href' : PropTypes.string
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        var context = this.props.context;
        var title = typeof context.title == "string" ? context.title : url.parse(this.props.href).path;
        return (
            <div className="view-item">
                <hr/>
                {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                <ItemDetailList context={context} schemas={this.props.schemas} hideButtons={true} keyTitleDescriptionMap={{
                    'blob_bucket' : {
                        title : "Blob Bucket",
                        description : "Name of S3 bucket used for blob data."
                    },
                    'content' : {
                        title : "Extra Information"
                    },
                    'database' : {
                        title : "Database Location",
                        description : "URI used to connect to the back-end PgSQL DB."
                    },
                    'elasticserach' : {
                        title : "ElasticSearch Location",
                        description : "URI used to connect to the back-end ES instance."
                    },
                    'db_es_total' : {
                        title : "DB and ES Counts",
                        description : "Total counts of items in database and elasticsearch."
                    },
                    'db_es_compare' : {
                        title : "DB and ES Counts by Type",
                        description : "Counts of items in database and elasticsearch for each doc_type index."
                    },
                    'file_upload_bucket' : {
                        title : "File Upload Bucket",
                        description : "Where uploaded files are stored."
                    },
                    'load_data' : {
                        title : "Data Loaded",
                        description : "Data which was loaded into database on initialization or boot."
                    },
                    'ontology_updated' : {
                        title : 'Last Ontology Update',
                        description : "Last time ontologies were updated."
                    },
                    'system_bucket' : {
                        title : 'System Bucket',
                        description : "Name of S3 Bucket used for system data."
                    },
                    'aggregations' : {
                        title : 'Aggregations',
                        description : "Aggregations of ES-indexed data."
                    }
                }} />
                <AdminPanel />
            </div>
        );
    }
}

content_views.register(HealthView, 'Health');

class AdminPanel extends React.Component {

    constructor(props){
        super(props);
        this.loadFoursight = _.throttle(this.loadFoursight, 500);
        this.state = {
            'foursight_data': null
        };
    }

    componentDidMount(){
        this.loadFoursight();
    }

    loadFoursight = () => {
        // Fetch foursight checks
        var url = 'https://m1kj6dypu3.execute-api.us-east-1.amazonaws.com/api/latest/webprod/all';
        var callbackFxn = function(payload) {
            console.log('--Foursight-->', payload);
            this.setState({'foursight_data': payload});
        }.bind(this);
        ajax.load(url, callbackFxn);
    }

    onClickRunIndexing(){
        if (typeof window !== 'undefined' && typeof window.alert === 'function'){
            window.alert('TODO: Create an admin-protected endpoint called /commands/{command-name} that will map to commands out of /bin/ directory w/ pre-defined command-line args. For things like indexing, endpoint should probably first check if is already indexing. Should return descriptive-ish response.');
        }
    }

    buildCheckEntry = (check) => {
        return(
            <FoursightCheck data={check}/>
        );
    }

    render(){
        var userDetails = JWT.getUserDetails();
        if (!userDetails || !userDetails.groups || !Array.isArray(userDetails.groups) || (userDetails.groups.indexOf('admin') === -1)) return null;
        return (
            <div className="admin-panel">
                <h3 className="text-300 mt-3">Foursight</h3>
                <Button onClick={this.loadFoursight}>Refresh</Button>
                <hr className="mt-05 mb-1"/>
                {/*<Button onClick={this.onClickRunIndexing}>Index Things</Button>*/}
                {
                    this.state.foursight_data !== null ?
                    this.state.foursight_data.checks.map((check) =>
                    this.buildCheckEntry(check))
                    :
                    <i className="icon icon-spin icon-circle-o-notch"></i>
                }
            </div>
        );
    }
}

class FoursightCheck extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            'brief_open': false,
            'full_open': false
        };
    }

    toggleBrief = (e) => {
        e.preventDefault();
        this.setState({'brief_open': !this.state.brief_open, 'full_open': false});
    }

    toggleFull = (e) => {
        e.preventDefault();
        this.setState({'brief_open': false, 'full_open': !this.state.full_open});
    }

    render(){
        var data = this.props.data;
        var boxStyle = {
            'border': '1px solid #ccc',
            'marginBottom': '5px',
            'paddingBottom': '10px',
            'borderRadius': '8px'
        };
        var commonStyle = {
            'margin': '5px 5px 0px 5px',
        };
        var statStyle = {
            'marginLeft': '10px'
        };
        if (data.status === 'PASS'){
            boxStyle.backgroundColor = '#dff0d8';
            statStyle.color = '#3c763d';
        } else if (data.status == 'WARN') {
            boxStyle.backgroundColor = '#fcf8e3';
            statStyle.color = '#8a6d3b';
        } else if (data.status == 'FAIL') {
            boxStyle.backgroundColor = '#f2dede';
            statStyle.color = '#a94442';
        } else {
            boxStyle.backgroundColor = '#ddd';
            statStyle.color = '#000';
        }
        var output = null;
        if (this.state.brief_open && data.brief_output){
            output = data.brief_output;
        }else if (this.state.full_open && data.full_output){
            output = data.full_output;
        }
        return(
            <div style={boxStyle}>
                <h4 className="text-300" style={{'marginLeft': '5px'}}>
                    <span>{data.title}</span>
                    <span style={statStyle}>{data.status}</span>
                </h4>
                <div style={commonStyle}>{data.description}</div>
                <div style={commonStyle}>
                    {data.brief_output ?
                        <Button style={{'marginRight': '5px'}} bsSize="xsmall" onClick={this.toggleBrief}>
                            {this.state.brief_open ? 'Close' : 'Brief output'}
                        </Button>
                        :
                        null}
                    {data.full_output ?
                        <Button bsSize="xsmall" onClick={this.toggleFull}>
                            {this.state.full_open ? 'Close' : 'Full output'}
                        </Button>
                        :
                        null}
                </div>
                {output ?
                    object.isValidJSON(output) ?
                        <div style={commonStyle} className="json-tree-wrapper">
                            <JSONTree data={output} />
                        </div>
                        :
                        <div style={commonStyle}>
                            {output}
                        </div>
                    :
                    null
                }
            </div>
        );
    }
}
