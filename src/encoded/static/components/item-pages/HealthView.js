'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import { Button } from 'react-bootstrap';
import { content_views } from './../globals';
import { ajax, console, object, Filters, JWT, DateUtility } from './../util';
import { ItemPageTitle, ItemDetailList } from './components';
import _ from 'underscore';
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
        this.componentDidMount = this.componentDidMount.bind(this);
        this.getCounts = _.throttle(this.getCounts.bind(this), 1000);
        this.state = {
            'db_es_total' : "loading...",
            'db_es_compare' : "loading..."
        };
    }

    componentDidMount(){
        this.getCounts();
    }

    getCounts(){
        this.setState({
            'db_es_total' : "loading...",
            'db_es_compare' : "loading..."
        }, ()=>{
            ajax.load('/counts?format=json', (resp)=>{
                this.setState({
                    'db_es_total' : resp.db_es_total,
                    'db_es_compare': resp.db_es_compare,
                });
            }, 'GET', (resp)=>{
                this.setState({
                    'error' : resp.error || resp.message,
                    'db_es_total' : null,
                    'db_es_compare': null
                });
            });
        });
    }

    render() {
        var context = this.props.context;
        var title = typeof context.title == "string" ? context.title : url.parse(this.props.href).path;
        return (
            <div className="view-item">
                <hr/>
                <h3 className="text-400 mb-2">Configuration</h3>
                {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                <ItemDetailList excludedKeys={ItemDetailList.Detail.defaultProps.excludedKeys.concat(['content'])} hideButtons context={context} schemas={this.props.schemas} keyTitleDescriptionMap={{
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
                    'elasticsearch' : {
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
                <Button className="refresh-counts-button pull-right" onClick={this.getCounts}><i className="icon icon-refresh"/>&nbsp; Refresh Counts</Button>
                <h3 className="text-400 mb-2">Database Counts</h3>

                <ItemDetailList excludedKeys={ItemDetailList.Detail.defaultProps.excludedKeys.concat(['content'])} hideButtons context={this.state} schemas={this.props.schemas} keyTitleDescriptionMap={{
                    'db_es_total' : {
                        title : "DB and ES Counts",
                        description : "Total counts of items in database and elasticsearch."
                    },
                    'db_es_compare' : {
                        title : "DB and ES Counts by Type",
                        description : "Counts of items in database and elasticsearch for each doc_type index."
                    }
                }} />
            </div>
        );
    }
}

content_views.register(HealthView, 'Health');
