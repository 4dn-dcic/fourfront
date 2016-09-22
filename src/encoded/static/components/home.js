'use strict';
var React = require('react');
var fetched = require('./fetched');
var _ = require('underscore');
var announcements_data = require('../data/announcements_data');
var statics = require('../data/statics');

/* ****************
New homepage
Will load static entries from a js file
Uses fetch to get context necessary to populate banner entry
**************** */

var BannerLoader = module.exports.BannerLoader = React.createClass({
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

var BannerEntry = module.exports.BannerEntry = React.createClass({
    render: function() {
        var total = this.props.data.total;
        var location = this.props.location;
        var text = total + " " + this.props.text;
        return (
            <a className="banner-entry" href={location}>{text}</a>
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
                <div className="fourDN-section-title"><a className="fourDN-section-toggle" href="" onClick={this.handleToggle}>{title}</a></div>
                <div className="fourDN-section-info">{subtitle}</div>
                {content}
            </div>
        );
    }
});

var HomePage = module.exports.HomePage = React.createClass({
    // BannerLoaders are passed in as props
    PropTypes: {
        banners: React.PropTypes.array.isRequired
    },
    render: function() {
        var experiment4DNBanner = this.props.banners[0]
        var experimentExtBanner = this.props.banners[1]
        var biosourceBanner = this.props.banners[2]
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
                    <div className="col-md-6 col-xs-12">
                        <div className="col-md-11">
                            <h3 className="fourDN-header">Welcome!</h3>
                            <p className="fourDN-content" dangerouslySetInnerHTML={{__html: statics.homeDescription}}></p>
                        </div>
                    </div>
                    <div className="col-md-6 col-xs-12">
                        <div className="col-md-11">
                            <h3 className="fourDN-header">Announcements</h3>
                            {announcements}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});
