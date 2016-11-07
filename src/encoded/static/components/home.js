'use strict';
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var announcements_data = require('../data/announcements_data');
var statics = require('../data/statics');
var Panel = require('react-bootstrap').Panel;
var store = require('../store');

/* ****************
New homepage
Will load static entries from a js file
Uses fetch to get context necessary to populate banner entry
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

var ContentItem = React.createClass({
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

        return (
            <div className="fourDN-section">
                <div className="fourDN-section-title"><a className="fourDN-section-toggle" href="" onClick={this.handleToggle}>{title}</a></div>
                <div className="fourDN-section-info">{subtitle}</div>
                <Panel collapsible expanded={this.state.active} className="fourDN-content fourDN-content-panel">
                    <p dangerouslySetInnerHTML={{__html: content}}></p>
                </Panel>
            </div>
        );
    }
});

var HomePage = module.exports = React.createClass({
    render: function() {
        var experiment4DNBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="4DN" destination="/browse/?type=ExperimentSet&experimentset_type=biological+replicates&limit=all" fetchLoc='/search/?type=Experiment&award.project=4DN&format=json'/>;
        var experimentExtBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="External" destination="/browse/?type=ExperimentSet&experimentset_type=biological+replicates&limit=all" fetchLoc='/search/?type=Experiment&award.project=External&format=json'/>;
        var biosourceBanner = <BannerEntry session={this.props.session} text='cell types' destination='/search/?type=Biosource' fetchLoc='/search/?type=Biosource&format=json'/>;
        var announcements = announcements_data.map(function(announce) {
            return (
                <ContentItem key={announce.title} content={announce}/>
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
                    <div className="col-md-9 col-xs-12">
                        <h3 className="fourDN-header">Welcome!</h3>
                        <p className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: statics.homeDescription}}></p>
                    </div>
                    <div className="col-md-3 col-xs-12">
                        <h3 className="fourDN-header">4DN Links</h3>
                        <p className="fourDN-content"dangerouslySetInnerHTML={{__html: statics.homeLinks}}></p>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-8 col-xs-12">
                        <h3 className="fourDN-header">Announcements</h3>
                        {announcements}
                    </div>
                </div>
            </div>
        );
    }
});
