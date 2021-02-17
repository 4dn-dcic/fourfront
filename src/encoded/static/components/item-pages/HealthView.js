'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import { select as d3Select } from 'd3-selection';
import { color as d3Color } from 'd3-color';
import { interpolateRgb } from 'd3-interpolate';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { treemap as d3Treemap, treemapResquarify, hierarchy as d3Hierarchy } from 'd3-hierarchy';
import _ from 'underscore';

import { ajax, layout, navigate, JWT, memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemDetailList } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/ItemDetailList';
import { Term } from './../util/Schemas';
import { default as installedPackageLockJson } from './../../../../../package-lock.json';

/**
 * Fallback content_view for pages which are not specifically 'Items.
 * Renders out JSON.
 *
 * @export
 * @class Item
 * @extends {React.Component}
 */
export default class HealthView extends React.PureComponent {

    static notFinishedIndexing(db_es_total){
        return db_es_total && (db_es_total.indexOf('< DB has') > -1 || db_es_total.indexOf('loading') > -1) ? true : false;
    }

    static termTransformFxn(field, term){
        if (field === "foursight" && term && term.slice(0,4) === "http") {
            return <a href={term} target="_blank" rel="noopener noreferrer">{ term }</a>;
        }
        return Term.toName(field, term, true);
    }

    static propTypes = {
        'href' : PropTypes.string
    };

    static defaultProps = {
        "excludedKeys" : [ ...ItemDetailList.Detail.defaultProps.excludedKeys, 'content' ],
        "keyTitleDescriptionMapConfig" : {
            'aggregations' : {
                title : 'Aggregations',
                description : "Aggregations of ES-indexed data."
            },
            'beanstalk_app_version': {
                title : "Beanstalk App Version",
                description : "Unique descriptive identifier for this app's ElasticBeanstalk source bundle."
            },
            'beanstalk_env' : {
                title : "Beanstalk Environment",
                description : "Which Elastic Beanstalk environment this instance running on."
            },
            'blob_bucket' : {
                title : "Blob Bucket",
                description : "Name of blob storage bucket used for blob data."
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
            'file_upload_bucket' : {
                title : "File Upload Bucket",
                description : "Where uploaded files are stored."
            },
            'foursight' : {
                title : "Foursight",
                description : "URI of corresponding Foursight page."
            },
            'indexer' : {
                title : "Indexer",
                description : "Whether this server processes indexing requests at all."
            },
            'index_server' : {
                title : "Index Server",
                description : "Whether this server is only for indexing."
            },
            'load_data' : {
                title : "Loaded Data",
                description : "Data which was loaded into database on initialization or boot."
            },
            'namespace': {
                title : "Namespace",
                description : "The ElasticSearch namespace to use. This is often the same as the Beanstalk Environment, but don't rely on that."
            },
            'ontology_updated' : {
                title : 'Ontology Last Updated',
                description : "Last time ontologies were updated."
            },
            'processed_file_bucket' : {
                title: "Processed File Bucket",
                description : "Blob storage bucket name of processed files."
            },
            'project_version': {
                title : "Project Version",
                description : "Software version for this portal's software."
            },
            'spc_version': {
                title : "Shared Portal Components Version",
                description : "Software version of shared-portal-components package being used."
            },
            'snovault_version': {
                title : "Snovault Version",
                description : "Software version of dcicsnovault being used."
            },
            'system_bucket' : {
                title : 'System Bucket',
                description : "Name of blob storage bucket used for system data."
            },
            'uptime': {
                title : 'Uptime',
                description : "How long this server has been running."
            },
            'utils_version': {
                title : "Utils Version",
                description : "Software version of dcicutils being used."
            },
        },
        "keyTitleDescriptionMapCounts" : {
            'db_es_total' : {
                title : "DB and ES Counts",
                description : "Total counts of items in database and elasticsearch."
            },
            'db_es_compare' : {
                title : "DB and ES Counts by Type",
                description : "Counts of items in database and elasticsearch for each doc_type index."
            }
        }
    };

    constructor(props){
        super(props);
        this.getCounts = _.throttle(this.getCounts.bind(this), 1000);
        this.state = {
            'db_es_total' : null,
            'db_es_compare' : null,
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    /** We only allow this to be called manually, and if are admin, to minimize load on ES */
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
        const { context: propContext, schemas, session, windowWidth, href, keyTitleDescriptionMapConfig, keyTitleDescriptionMapCounts, excludedKeys } = this.props;
        const {
            db_es_compare = null,
            db_es_total = null,
            mounted = false
        } = this.state;
        const { title: ctxTitle, description } = propContext;
        const notYetLoaded = (db_es_compare === null && db_es_total === null);
        const title = typeof ctxTitle === "string" ? ctxTitle : memoizedUrlParse(href).path;
        const width = layout.gridContainerWidth(windowWidth);
        //extend context to include shared-portal-components version
        const { dependencies: { '@hms-dbmi-bgm/shared-portal-components': { version: spcVersion, from: spcFrom } = {} } } = installedPackageLockJson;
        let spcVersionUsed;
        if (spcFrom && spcFrom.indexOf('#') > -1) { //e.g. github:4dn-dcic/shared-portal-components#0.0.2.70
            [spcVersionUsed] = spcFrom.split('#').splice(-1);
        }
        const context = _.extend({ spc_version: spcVersionUsed || spcVersion || '-' }, propContext);

        return (
            <div className="view-item container" id="content">
                <hr/>
                <h3 className="text-400 mb-2 mt-3">Configuration</h3>

                { typeof description == "string" ? <p className="description">{ description }</p> : null }

                <ItemDetailList {...{ excludedKeys, context }} hideButtons keyTitleDescriptionMap={keyTitleDescriptionMapConfig}
                    termTransformFxn={HealthView.termTransformFxn} />

                <DatabaseCountsInfo {...{ notYetLoaded, excludedKeys, schemas, db_es_compare, db_es_total, session, mounted, context, width, keyTitleDescriptionMapCounts }}
                    getCounts={this.getCounts} />

            </div>
        );
    }
}

const DatabaseCountsInfo = React.memo(function DatabaseCountsInfo(props){
    const { notYetLoaded, excludedKeys, schemas, db_es_compare, db_es_total, session, mounted, context, width, getCounts, keyTitleDescriptionMapCounts } = props;
    const userGroups = (session && JWT.getUserGroups()) || null;

    if (!userGroups || userGroups.indexOf("admin") === -1) {
        return null;
    }

    if (notYetLoaded) {
        return (
            <button type="button" className="btn btn-block btn-lg btn-outline-dark refresh-counts-button btn-block mt-2"
                onClick={getCounts}>
                <i className="icon icon-fw fas icon-sync mr-08"/>Get Database Counts
            </button>
        );
    }

    let btnTitle = null;

    if (db_es_total === 'loading...') {
        btnTitle = (
            <React.Fragment>
                <i className="icon icon-fw fas icon-sync icon-spin mr-08"/>
                Fetching Database Counts
            </React.Fragment>
        );
    } else {
        btnTitle = (
            <React.Fragment>
                <i className="icon icon-fw fas icon-sync mr-08"/>
                Refresh Counts
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <h3 className="text-400 mb-2 mt-3">Database Counts</h3>

            <button type="button" className="btn btn-outline-dark refresh-counts-button btn-block mt-2"
                onClick={getCounts} disabled={db_es_total === 'loading...'}>
                { btnTitle }
            </button>

            <ItemDetailList {...{ excludedKeys, schemas }} context={{ db_es_compare, db_es_total }} hideButtons keyTitleDescriptionMap={keyTitleDescriptionMapCounts} />

            <HealthChart {...{ db_es_compare, mounted, session, context, width }} height={600} />
        </React.Fragment>
    );
});

/**
 * This is a React wrapper around a D3 visualization.
 * It is not super performant but is used on a single page, so should be OK / low-priority.
 */
class HealthChart extends React.PureComponent {

    static es_compare_to_d3_hierarchy(es_compare){
        if (!es_compare || typeof es_compare !== 'object') return null;
        return {
            'name' : 'Indexing Status',
            'children' : _.filter(_.map(_.pairs(es_compare), function([ itemType, compareString ]){
                if (itemType === 'ontology_term') return null;
                const dbCount = parseInt(compareString.slice(4));
                const esCount = parseInt(compareString.slice(11 + (dbCount + '').length));
                return {
                    'name': itemType,
                    'children': [
                        { 'name': 'Indexed', 'size': esCount },
                        { 'name': 'Left to Index', 'size': dbCount - esCount }
                    ]
                };
            }))
        };
    }

    static defaultProps = {
        'mounted' : false,
    };

    constructor(props){
        super(props);
        this.svgRef = React.createRef();
    }

    componentDidUpdate(pastProps, pastState){
        this.drawTreeMap();
        this.transitionSize();
        setTimeout(function(){ ReactTooltip.rebuild(); }, 1000);
    }

    transition(d3Selection){
        d3Selection.transition()
            .duration(750)
            .attr('transform', function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
            .select("rect")
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; });
    }

    transitionSize(){
        const { mounted } = this.props;
        if (!mounted) return null;
        const svg = this.svgRef && this.svgRef.current && d3Select(this.svgRef.current);
        svg.selectAll('g').transition()
            .duration(750)
            .attr('transform', function(d) {
                return "translate(" + d.x0 + "," + d.y0 + ")";
            })
            .attr("data-tip", function(d){
                return '<span class="text-500">' + d.parent.data.name + "</span><br/>" + d.data.size + ' Items (' + (parseInt((d.data.size / (d.parent.value || 1)) * 10000) / 100) + '%)<br/>Status: ' + d.data.name;
            })
            .select("rect")
            .attr("width", function(d) {
                return d.x1 - d.x0;
            })
            .attr("height", function(d) {
                return d.y1 - d.y0;
            });
    }

    drawTreeMap(){
        const { width, height, mounted, db_es_compare } = this.props;
        const dataToShow = HealthChart.es_compare_to_d3_hierarchy(db_es_compare);

        if (!dataToShow || !mounted) return null;

        const svg = this.svgRef && this.svgRef.current && d3Select(this.svgRef.current);
        function fader(color) {
            return interpolateRgb(color, "#fff")(0.2);
        }

        const colorFallback = scaleOrdinal(schemeCategory10.map(fader));

        function colorStatus(origColor, status){
            let d3ColorUsed;
            if (['deleted', 'Left to Index'].indexOf(status) > -1){
                d3ColorUsed = d3Color(origColor);
                return d3ColorUsed.darker(1);
            }
            if (['upload failed'].indexOf(status) > -1){
                return interpolateRgb(origColor, "rgb(222, 82, 83)")(0.6);
            }
            if (['released to lab', 'released to project', 'in review by lab', 'in review by project'].indexOf(status) > -1){
                d3ColorUsed = d3Color(origColor);
                return d3ColorUsed.darker(0.5);
            }
            if (['uploaded', 'released', 'current'].indexOf(status) > -1){
                d3ColorUsed = d3Color(origColor);
                return d3ColorUsed.brighter(0.25);
            }
            return origColor;
        }

        const treemap = d3Treemap()
            .tile(treemapResquarify)
            .size([width, height])
            .round(true)
            .paddingInner(1);

        const root = d3Hierarchy(dataToShow)
            .eachBefore(function(d) {d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
            .sum(function(d){ return d.size; })
            .sort(function(a, b) { return b.height - a.height || b.value - a.value; });

        treemap(root);

        const cell = svg.selectAll("g").data(root.leaves(), function(n){
            return n.data.id;
        });

        cell.exit().remove();

        const enteringCells = cell.enter();

        const enteringCellGroups = enteringCells.append("g")
            .attr('class', 'treemap-rect-elem')
            .attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
            .attr("data-tip", function(d){ return '<span class="text-500">' + d.parent.data.name + "</span><br/>" + d.data.size + ' Items (' + (parseInt((d.data.size / (d.parent.value || 1)) * 10000) / 100) + '%)<br/>Status: ' + d.data.name; })
            .attr("data-html", function(d){ return true; })
            .on("click", function(d) {
                navigate('/search/?type=' + d.parent.data.name);
            })
            .attr("data-effect", function(d){ return 'float'; });

        enteringCellGroups.append("rect")
            .attr("id", function(d) { return d.data.id.replace(/ /g, '_'); })
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; })
            .attr("fill", function(d) { return colorStatus(colorFallback(d.parent.data.name), d.data.name); });

        enteringCellGroups.append("clipPath")
            .attr("id", function(d) { return "clip-" + d.data.id.replace(/ /g, '_'); })
            .append("use")
            .attr("xlink:href", function(d) { return "#" + d.data.id.replace(/ /g, '_'); });

        enteringCellGroups.append("text")
            .attr("clip-path", function(d) { return "url(#clip-" + d.data.id.replace(/ /g, '_') + ")"; })
            .attr('class', 'title-text')
            .selectAll("tspan")
            .data(function(d) { return _.map(d.parent.data.name.split(/(?=[_][^_])/g), function(s){ return s.replace(/(_)/g, ''); }); })
            .enter().append("tspan")
            .attr("x", 4)
            .attr("y", function(d, i) { return 13 + i * 10; })
            .text(function(d) { return d; });
    }

    render(){
        const { width, height, mounted } = this.props;

        if (!mounted) return null;

        return (
            <div>
                <h5 className="text-400 mt-2 pull-right mb-0"><em>Excluding OntologyTerm</em></h5>
                <h3 className="text-400 mb-2 mt-3">Types in ElasticSearch</h3>
                <style dangerouslySetInnerHTML={{
                    __html : (
                        '.treemap-rect-elem { cursor: pointer; }' +
                        '.treemap-rect-elem .title-text { fill: rgba(0,0,0,0.5); font-size: 0.75rem; }' +
                        '.treemap-rect-elem:hover .title-text { fill: #000; }'
                    )
                }}/>
                <svg width={width} height={height} ref={this.svgRef} />
            </div>
        );

    }
}
