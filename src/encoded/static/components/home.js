'use strict';
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var announcements_data = require('../data/announcements_data');
var Collapse = require('react-bootstrap').Collapse;
var store = require('../store');
var globals = require('./globals');
var { ajaxLoad, console } = require('./objectutils');
var SunBurstChart = require('./viz/sunburst');
var { ExperimentsTable } = require('./experiments-table');
var expFuncs = require('./experiments-table').ExperimentsTable.funcs;

/* ****************
New homepage
Uses fetch to get context necessary to populate banner entry
ToDo : Embed info needed for chart(s) & banners into /home/?format=json endpoint (reduce AJAX reqs).
**************** */

var BannerEntry = React.createClass({
    contextTypes: {
        fetch: React.PropTypes.func
    },

    getInitialState: function(){
        return({
            count: null
        });
    },

    componentDidMount: function(){
        this._isMounted = true;
        this.updateCount();
    },

    componentWillUnmount: function(){
        this._isMounted = false;
    },

    componentWillReceiveProps: function(nextProps){
        if(nextProps.session !== this.props.session){
            this.updateCount();
        }
    },

    updateCount: function(){
        if(this.context.fetch('/?format=json', {}) !== null){ // for test purposes
            var request = this.context.fetch(this.props.fetchLoc, {
                headers: {'Accept': 'application/json',
                    'Content-Type': 'application/json'}
            });
            request.then(data => {
                if(this._isMounted){
                    if(data.total){
                        this.setState({
                            count: data.total
                        })
                    }else{
                        this.setState({
                            count: null
                        })
                    }
                }
            });
        }else{
            return;
        }

    },

    setFacets: function(e){
        // for 4DN or external filters: if provided, set expSetFilters correctly
        if(this.props.defaultFilter){
            var newObj = {};
            var objSet = new Set();
            objSet.add(this.props.defaultFilter);
            newObj['experiments_in_set.award.project'] = objSet;
            store.dispatch({
                type: {'expSetFilters': newObj}
            });
        }
    },

    render: function() {
        var count = this.state.count ? this.state.count : 0;
        var text = count + " " + this.props.text;
        return (
            <a className="banner-entry" href={this.props.destination} onClick={this.setFacets}>{text}</a>
        );
    }
});

var Announcement = React.createClass({
    getInitialState: function() {
        return {
            active: true
        };
    },

    handleToggle: function(e) {
        e.preventDefault();
        this.setState({active: !this.state.active});
    },

    render: function() {
        var title = this.props.content.title || "";
        var author = this.props.content.author || "";
        var date = this.props.content.date || "";
        var content = this.props.content.content || "";
        var active = this.state.active;
        var subtitle;
        if (author && date){
            subtitle = "Posted by " + author + " | " + date;
        }else if (author && !date){
            subtitle = "Posted by " + author;
        }else if (!author && date){
            subtitle = "Posted on " + date;
        }else{
            subtitle = "";
        }

        var icon = null;
        if (this.props.icon){
            if (typeof this.props.icon === true){
                icon = <i className={"icon text-small icon-" + (this.state.active ? 'minus' : 'plus')}></i>;
            } else {
                icon = this.props.icon; // Custom icon maybe for future
            }
        }

        return (
            <div className="fourDN-section announcement">
                <div className="fourDN-section-title announcement-title">
                    <a className="fourDN-section-toggle" href="#" onClick={this.handleToggle}>
                        {icon} {title}
                    </a>
                </div>
                <div className="fourDN-section-info announcement-subtitle">{subtitle}</div>
                <Collapse in={this.state.active}>
                    <div className="fourDN-content announcement-content">
                        <p dangerouslySetInnerHTML={{__html: content}}></p>
                    </div>
                </Collapse>
            </div>
        );
    }
});

var Chart = React.createClass({

    getDefaultProps : function(){
        return {
            fieldsToFetch : [ // What fields we need from /browse/... for this chart.
                'experiments_in_set.experiment_summary',
                'experiments_in_set.accession',
                'experiments_in_set.status',
                'experiments_in_set.files.file_type',
                'experiments_in_set.files.accession',
                'experiments_in_set.biosample.description',
                'experiments_in_set.biosample.modifications_summary_short',
                'experiments_in_set.biosample.biosource_summary',
                'experiments_in_set.biosample.accession',
                'experiments_in_set.biosample.biosource.description',
                'experiments_in_set.biosample.biosource.biosource_name',
                'experiments_in_set.biosample.biosource.biosource_type',
                'experiments_in_set.biosample.biosource.individual.organism.name',
                'experiments_in_set.biosample.biosource.individual.organism.scientific_name'
            ]
        };
    },

    getInitialState : function(){
        return {
            data : null
        };
    },

    componentDidMount : function(){
        var reqUrl = '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all&format=json';
        reqUrl += this.props.fieldsToFetch.map(function(fieldToIncludeInResult){
            return '&field=' + fieldToIncludeInResult;
        }).join('');

        ajaxLoad(reqUrl, (data) => {
            this.setState({ 'data' : this.transformDataForChart(data['@graph']) });
        });
    },

    transformDataForChart : function(experiment_sets){
        // We needa turn these sets into either a hierarchical/directed graph of nodes containing 'name', 'children', and 'size' properties
        // or into array of sequence & value sets ['name1-name2-name3-name4', <size>].
        // once this is working we'll move into a static method on SunBurstChart

        // First child (depth == 1) should be organism. ('root' node will have depth == 0)
        var organisms = {};

        function updateBiosource(biosource, exp){
            if (
                biosource.individual.organism.name &&
                typeof organisms[biosource.individual.organism.name] === 'undefined'
            ){
                organisms[biosource.individual.organism.name] = {
                    'name' : biosource.individual.organism.scientific_name + 
                        " (" + biosource.individual.organism.name + ")",
                    'children' : [],
                    'biosamples' : {}
                };
            }
            if (
                exp.biosample.accession &&
                typeof organisms[biosource.individual.organism.name].biosamples[exp.biosample.accession] === 'undefined'
            ){
                var description;
                if (typeof exp.biosample.modifications_summary_short !== 'undefined' && exp.biosample.modifications_summary_short !== 'None'){
                    description = exp.biosample.modification_summary_short;
                } else if (exp.biosample.biosource_summary) {
                    description = '<small>Biosample </small>' + exp.biosample.accession;
                }
                organisms[biosource.individual.organism.name].biosamples[exp.biosample.accession] = {
                    'name' : exp.biosample.biosource_summary || exp.biosample.accession,
                    'children' : [],
                    'description' : description,
                    'experiments' : {} // We don't show experiment_sets here because there may be multiple biosamples per set. 
                }
            }
            if (
                exp.accession &&
                typeof organisms[biosource.individual.organism.name]
                    .biosamples[exp.biosample.accession]
                    .experiments[exp.accession] === 'undefined'
            ){
                expFuncs.flattenFileSetsToFilesIfNoFilesOnExperiment(exp);

                organisms[biosource.individual.organism.name]
                    .biosamples[exp.biosample.accession]
                    .experiments[exp.accession] = {
                        'name' : exp.experiment_summary,
                        'fallbackSize' : 2,
                        'description' : '<small>Experiment </small>' + exp.accession,
                        'children' : Array.isArray(exp.files) ? exp.files.map(function(f){
                                return {
                                    'name' : f.accession,
                                    'size' : 1
                                };
                            }) : []
                    }
            }
        }

        var expset, experiment, biosource;
        for (var setIndex = 0; setIndex < experiment_sets.length; setIndex++){
            expset = experiment_sets[setIndex];

            for (var i = 0; i < expset.experiments_in_set.length; i++){
                experiment = expset.experiments_in_set[i];
                if (Array.isArray(experiment.biosample.biosource)){ // if array
                    for (var j = 0; j < experiment.biosample.biosource.length; j++){
                        biosource = experiment.biosample.biosource[j];
                        updateBiosource(biosource, experiment);
                    }
                } else if ( // if object
                    experiment.biosample.biosource.individual.organism.name &&
                    typeof organisms[experiment.biosample.biosource.individual.organism.name] === 'undefined'
                ){
                    biosource = experiment.biosample.biosource;
                    updateBiosource(biosource, experiment);
                } else {
                    console.error("Check biosource hierarchy code for chart.");
                }
            }

        }

        function recursivelySetChildren(node){
            var childKey = _.find(Object.keys(node), function(k){
                return ['name', 'children', 'size', 'description', 'fallbackSize'].indexOf(k) === -1;
            });
            if (typeof childKey === 'undefined') return;
            if (Array.isArray(node.children.length) > 0) return; // Already set elsewhere.
            if ((!Array.isArray(node.children.length) || node.children.length === 0) && Object.keys(node[childKey]).length > 0){
                node.children = _.values(node[childKey]);
                delete node[childKey];
            }
            if (typeof node.children === 'undefined' || node.children.length === 0){
                return;
            }
            for (var i = 0; i < node.children.length; i++){
                recursivelySetChildren(node.children[i]);
            }
        }

        var rootNode = { 'name' : 'root', 'children' : [], 'organisms' : organisms };
        recursivelySetChildren(rootNode);
        return rootNode;
    },

    render : function(){
        return (
            <SunBurstChart data={this.state.data} />
        );
    }

});

var HomePage = module.exports = React.createClass({

    propTypes: {
        "context" : React.PropTypes.shape({
            "content" : React.PropTypes.shape({
                "description" : React.PropTypes.string,
                "links" : React.PropTypes.string
            }).isRequired
        }).isRequired
    },

    shouldComponentUpdate : function(){
        return false; // Never re-render after initial mount (reduce chart re-rendering), let sub-components handle own state.
    },

    render: function() {
        var c = this.props.context.content; // Content
        var experiment4DNBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="4DN" destination="/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all" fetchLoc='/search/?type=Experiment&award.project=4DN&format=json'/>;
        var experimentExtBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="External" destination="/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all" fetchLoc='/search/?type=Experiment&award.project=External&format=json'/>;
        var biosourceBanner = <BannerEntry session={this.props.session} text='cell types' destination='/search/?type=Biosource' fetchLoc='/search/?type=Biosource&format=json'/>;
        var announcements = announcements_data.map(function(announce) {
            return (
                <Announcement key={announce.title} content={announce} icon={announcements_data.length > 3 ? true : false} />
            );
        });
        return (
            <div>
                <div className="fourDN-banner text-left">
                    <h1 className="page-title" style={{ fontSize : '3.25rem' }}>4DN Data Portal</h1>
                    <h4 className="text-300 col-sm-8" style={{ float: 'none', padding : 0 }}>
                        The portal currently hosts {experiment4DNBanner} from
                        the 4DN network and {experimentExtBanner} from other
                        sources over {biosourceBanner}.
                    </h4>
                </div>
                <div className="row">
                    <div className="col-md-7 col-xs-12">
                        <h3 className="fourDN-header">Welcome</h3>
                        <div className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: c.description}}></div>
                    </div>
                    <div className="col-md-5 col-xs-12">
                        <h3 className="fourDN-header">Announcements</h3>
                        {announcements}
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-9 col-xs-12">
                        <Chart/>
                    </div>
                    <div className="col-md-3 col-xs-12">
                        <h3 className="fourDN-header">4DN Links</h3>
                        <div className="fourDN-content"dangerouslySetInnerHTML={{__html: c.links}}></div>
                    </div>
                </div>
            </div>
        );
    }
});

globals.content_views.register(HomePage, 'HomePage');
