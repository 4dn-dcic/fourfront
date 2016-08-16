'use strict';
var React = require('react');
var globals = require('./globals');
var fetched = require('./fetched');
var _ = require('underscore');
var announcements_data = require('../data/announcements_data');
var gs_entries = require('../data/getting_started_data');

/* ****************
New homepage
Will load static entries from a js file
Uses fetch to get context necessary to populate banner entry
**************** */

var BannerLoader = React.createClass({
    render: function() {
        var text = this.props.text;
        var location = this.props.location;
        return (
            <fetched.FetchedData>
                <fetched.Param name='data' url={location} />
                <BannerEntry text={text} location={location}/>
            </fetched.FetchedData>
        );
    }
});

var BannerEntry = React.createClass({
    render: function() {
        var total = this.props.data.total;
        var location = this.props.location;
        var text = total + " " + this.props.text;
        return (
            <a href={location}>{text}</a>
        );
    }
});

var ContentItem = React.createClass({
    getInitialState: function() {
        return {
            active: true
        };
    },

    handleToggle: function(b) {
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
        var content;
        if (!this.state.active){
            content = <span></span>;
        }else{
            content = (
                <div className="fourDN-content"><p dangerouslySetInnerHTML={{__html: content}}></p></div>
            );
        }
        return (
            <div className="fourDN-section">
                <div className="fourDN-section-title"><a href="" onClick={this.handleToggle}>{title}</a></div>
                <div className="fourDN-section-info">{subtitle}</div>
                {content}
            </div>
        );
    }
});

var HomePage = module.exports = React.createClass({
    render: function() {
        var experimentBanner = <BannerLoader text='experiments' location='/search/?searchTerm=%40type%3Aexperiment'/>
        var biosourceBanner = <BannerLoader text='cell lines' location='/search/?searchTerm=%40type%3Abiosource'/>
        var announcements = announcements_data.map(function(announce) {
            return (
                <ContentItem content={announce}/>
            );
        });
        var entries = gs_entries.map(function(entry) {
            return (
                <ContentItem content={entry}/>
            );
        });
        return (
            <div>
                <div className="fourDN-title fourDN-banner">
                    <h3>Welcome to the 4DN Data Portal. We are under construction.<br/>The portal will be open to data submitters soon. Stay tuned!</h3>
                    <h4>The portal currently has {experimentBanner} across {biosourceBanner}.</h4>
                </div>
                <div className="row">
                    <div className="col-md-6 col-xs-12">
                        <div className="col-md-11">
                            <h3 className="fourDN-header">Announcements</h3>
                            {announcements}
                        </div>
                    </div>
                    <div className="col-md-6 col-xs-12">
                        <div className="col-md-11 col-md-push-1">
                            <h3 className="fourDN-header">Getting started</h3>
                            {entries}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});
