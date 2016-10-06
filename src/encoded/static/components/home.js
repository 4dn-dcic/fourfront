'use strict';
var React = require('react');
var ReactDOM = require('react-dom');
var fetched = require('./fetched');
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

var BannerLoader = React.createClass({

    render: function() {
        return (
            <fetched.FetchedData backup={<BannerEntry data={{'total':"-"}} text={this.props.text} destination={this.props.destination} location={this.props.location}/>}>
                <fetched.Param name='data' url={this.props.location} />
                <BannerEntry defaultFilter={this.props.defaultFilter ? this.props.defaultFilter : null} text={this.props.text} destination={this.props.destination} location={this.props.location}/>
            </fetched.FetchedData>
        );
    }
});

var BannerEntry = React.createClass({

    setFacets: function(){
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
        var total = this.props.data.total;
        var location = this.props.location;
        var destination = this.props.destination;
        var text = total + " " + this.props.text;
        return (
            <a className="banner-entry" href={destination} onClick={this.setFacets}>{text}</a>
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

var HomePageLoader = React.createClass({
    render: function() {
        return (
            <fetched.FetchedData>
                <fetched.Param name='data' url='/search/?type=Experiment' />
            </fetched.FetchedData>
        );
    }
});


var HomePage = module.exports = React.createClass({
    render: function() {
        var experiment4DNBanner = <BannerLoader text='experiments' defaultFilter="4DN" destination="/browse/?type=ExperimentSet&experimentset_type=biological+replicates" location='/search/?type=Experiment&award.project=4DN'/>;
        var experimentExtBanner = <BannerLoader text='experiments' defaultFilter="External" destination="/browse/?type=ExperimentSet&experimentset_type=biological+replicates" location='/search/?type=Experiment&award.project=External'/>;
        var biosourceBanner = <BannerLoader text='cell types' destination='/search/?type=Biosource' location='/search/?type=Biosource'/>;
        var announcements = announcements_data.map(function(announce) {
            return (
                <ContentItem key={announce.title} content={announce}/>
            );
        });
        return (
            <div>
                <div className="fourDN-banner">
                    <h2>4DN Data Portal</h2>
                    <h4>The portal currently hosts {experiment4DNBanner} from the 4DN network and<br/>{experimentExtBanner} from other sources over {biosourceBanner}.</h4>
                </div>
                <div className="row">
                    <div className="col-md-9 col-xs-12">
                        <h3 className="fourDN-header">Welcome!</h3>
                        <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.homeDescription}}></p>
                    </div>
                    <div className="col-md-3 col-xs-12">
                        <h3 className="fourDN-header">Links</h3>
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
