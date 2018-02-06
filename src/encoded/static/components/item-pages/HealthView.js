'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import { Button } from 'react-bootstrap';
import { content_views } from './../globals';
import { ajax, console, object, Filters, JWT, DateUtility, layout, navigate } from './../util';
import { ItemPageTitle, ItemDetailList } from './components';
import ReactTooltip from 'react-tooltip';
import * as vizUtil from './../viz/utilities';
import * as d3 from 'd3';
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
            'db_es_compare' : "loading...",
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
        this.getCounts();
    }

    getCounts(){
        this.setState({
            'db_es_total' : "loading...",
            'db_es_compare' : "loading...",
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
                <h3 className="text-400 mb-2 mt-3">Configuration</h3>
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

                <Button className="refresh-counts-button pull-right mt-2" onClick={this.getCounts}><i className="icon icon-refresh"/>&nbsp; Refresh Counts</Button>
                <h3 className="text-400 mb-2 mt-3">Database Counts</h3>

                <ItemDetailList excludedKeys={ItemDetailList.Detail.defaultProps.excludedKeys.concat(['content'])} hideButtons context={_.pick(this.state, 'db_es_total', 'db_es_compare')} schemas={this.props.schemas} keyTitleDescriptionMap={{
                    'db_es_total' : {
                        title : "DB and ES Counts",
                        description : "Total counts of items in database and elasticsearch."
                    },
                    'db_es_compare' : {
                        title : "DB and ES Counts by Type",
                        description : "Counts of items in database and elasticsearch for each doc_type index."
                    }
                }} />

                <layout.WindowResizeUpdateTrigger>
                    <layout.WidthProvider>
                        <HealthChart mounted={this.state.mounted} height={600} />
                    </layout.WidthProvider>
                </layout.WindowResizeUpdateTrigger>

            </div>
        );
    }
}

content_views.register(HealthView, 'Health');

class HealthChart extends React.Component {

    static defaultProps = {
        'mounted' : false,
    }

    constructor(props){
        super(props);
        this.state = {
            'loaded' : false,
            'data' : null
        };
    }

    componentDidMount(){
        this.load();
    }

    componentDidUpdate(pastProps, pastState){
        if (this.state.loaded) {
            this.drawTreeMap();
            if (pastProps.width && this.props.width && this.props.width !== pastProps.width){
                this.transitionSize();
            }
        }
    }

    load(){
        ajax.load('/bar_plot_aggregations/type=Item&field=@type&field=status&type!=OntologyTerm/?field=@type&field=status', (r)=>{ // Exclude ontology terms
            this.setState({
                data : r,
                loaded : true
            });
        });
    }

    transitionSize(){
        var svg = this.refs && this.refs.svg && d3.select(this.refs.svg);
        svg.selectAll('g').transition()
            .duration(750)
            .attr('transform', function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
            .select("rect")
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; });
    }

    drawTreeMap(){
        var { width, height, mounted } = this.props;

        var svg = this.refs && this.refs.svg && d3.select(this.refs.svg);

        var fader = function(color) { return d3.interpolateRgb(color, "#fff")(0.2); };
        var colorFallback = d3.scaleOrdinal(d3.schemeCategory20.map(fader));

        function colorStatus(origColor, status){
            var d3Color;
            if (['deleted'].indexOf(status) > -1){
                d3Color = d3.color(origColor);
                return d3Color.darker(1);
            }
            if (['upload failed'].indexOf(status) > -1){
                return d3.interpolateRgb(origColor, "rgb(222, 82, 83)")(0.6);
            }
            if (['released to lab', 'released to project', 'in review by lab', 'in review by project'].indexOf(status) > -1){
                d3Color = d3.color(origColor);
                return d3Color.darker(0.5);
            }
            if (['uploaded', 'released', 'current'].indexOf(status) > -1){
                d3Color = d3.color(origColor);
                return d3Color.brighter(0.25);
            }
            return origColor;
        }

        var d3Data = vizUtil.transformBarPlotAggregationsToD3CompatibleHierarchy(this.state.data);

        var treemap = d3.treemap()
            .tile(d3.treemapResquarify)
            .size([width, height])
            .round(true)
            .paddingInner(1);

        var root = d3.hierarchy(d3Data)
            .eachBefore(function(d) {d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
            .sum(function(d){ return d.size; })
            .sort(function(a, b) { return b.height - a.height || b.value - a.value; });

        treemap(root);

        var cell = svg.selectAll("g")
            .data(root.leaves())
            .enter().append("g")
            .attr('class', 'treemap-rect-elem')
            .attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
            .attr("data-tip", function(d){ return '<span class="text-500">' + d.parent.data.name + "</span><br/>" + d.data.size + ' Items<br/>Status: ' + d.data.name; })
            .attr("data-html", function(d){ return true; })
            .on("click", function(d) {
                navigate('/search/?type=' + d.parent.data.name + '&status=' + d.data.name);
            })
            .attr("data-effect", function(d){ return 'float'; });

        cell.append("rect")
            .attr("id", function(d) { return d.data.id; })
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; })
            .attr("fill", function(d) { return colorStatus(colorFallback(d.parent.data.name), d.data.name); });

        cell.append("clipPath")
            .attr("id", function(d) { return "clip-" + d.data.id; })
            .append("use")
            .attr("xlink:href", function(d) { return "#" + d.data.id; });

        cell.append("text")
            .attr("clip-path", function(d) { return "url(#clip-" + d.data.id + ")"; })
            .attr('class', 'title-text')
            .selectAll("tspan")
            .data(function(d) { return d.parent.data.name.split(/(?=[A-Z][^A-Z])/g); })
            .enter().append("tspan")
            .attr("x", 4)
            .attr("y", function(d, i) { return 13 + i * 10; })
            .text(function(d) { return d; });

        ReactTooltip.rebuild();
    }

    render(){
        var { width, height, mounted } = this.props;

        if (!mounted || !this.state.loaded || !this.state.data) return null;

        return (
            <div>
                <h5 className="text-400 mt-2 pull-right mb-0"><em>Excluding OntologyTerm</em></h5>
                <h3 className="text-400 mb-2 mt-3">Types in ElasticSearch</h3>
                <style dangerouslySetInnerHTML={{
                    __html : (
                        '.treemap-rect-elem { cursor: pointer; }' +
                        '.treemap-rect-elem .title-text { fill: rgba(0,0,0,0.5); font-size: 0.75rem; }' +
                        '.treemap-rect-elem:hover .title-text { fill: #000; transform: scale(1.2); }'
                    )
                }}/>
                <svg width={width} height={height} ref="svg"/>
            </div>
        );

    }

}
