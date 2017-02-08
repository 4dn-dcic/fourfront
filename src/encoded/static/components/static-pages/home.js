'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var { console } = require('./../util');
var announcements_data = require('../../data/announcements_data');
var Collapse = require('react-bootstrap').Collapse;
var store = require('../../store');
var globals = require('./../globals');

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
            if (this.props.icon === true){
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
                    <div className="col-md-6 col-xs-12">
                        <h3 className="fourDN-header">Welcome</h3>
                        <div className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: c.description}}></div>
                    </div>
                    <div className="col-md-6 col-xs-12">
                        <h3 className="fourDN-header">Announcements</h3>
                        {announcements}
                    </div>

                    <div className="col-xs-12 col-sm-12 col-md-6 homepage-links-row">
                        
                        <h4 className="fourDN-header">Links</h4>
                        <div className="links-wrapper">
                            <div className="link-block">
                                    <a href="http://www.4dnucleome.org/" target="_blank">Main Portal</a>
                            </div>
                            <div className="link-block">
                                <a href="http://dcic.4dnucleome.org/" target="_blank">DCIC</a>
                            </div>
                            <div className="link-block">
                                <a href="https://commonfund.nih.gov/4Dnucleome/index" target="_blank">Common Fund</a>
                            </div>
                            <div className="link-block">
                                <a href="https://commonfund.nih.gov/4Dnucleome/FundedResearch" target="_blank">Centers and Labs</a>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="row">
                    
                </div>

            </div>
        );
    }
});

globals.content_views.register(HomePage, 'HomePage');
