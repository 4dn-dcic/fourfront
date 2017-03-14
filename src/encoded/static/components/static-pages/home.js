'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var { console } = require('./../util');
var announcements_data = require('../../data/announcements_data');
var Collapse = require('react-bootstrap').Collapse;
var store = require('../../store');
var globals = require('./../globals');
var { BannerEntry, Announcements } = require('./components');


/**
 * Homepage View component. Gets rendered at '/' and '/home' paths.
 * 
 * @module {Component} static-pages/home
 * @prop {Object} context - Should have properties typically needed for any static page.
 */
var HomePage = module.exports = React.createClass({

    propTypes: {
        "context" : React.PropTypes.shape({
            "content" : React.PropTypes.shape({
                "description" : React.PropTypes.string,
                "links" : React.PropTypes.string
            }).isRequired
        }).isRequired
    },

    /**
     * Render old subheading
     * 
     * @deprecated
     * @inner
     * @memberof module:static-pages/home
     * @returns {Element} H4 React Element with quick summary: "The portal currently hosts X from the 4DN network and Y from other sources over Z."
     */
    summaryHeading : function(){
        var experiment4DNBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="4DN" destination="/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all" fetchLoc='/search/?type=Experiment&award.project=4DN&format=json'/>;
        var experimentExtBanner = <BannerEntry session={this.props.session} text='experiments' defaultFilter="External" destination="/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all" fetchLoc='/search/?type=Experiment&award.project=External&format=json'/>;
        var biosourceBanner = <BannerEntry session={this.props.session} text='cell types' destination='/search/?type=Biosource' fetchLoc='/search/?type=Biosource&format=json'/>;
        return (
            <h4 className="text-300 col-sm-8" style={{ float: 'none', padding : 0 }}>
                The portal currently hosts {experiment4DNBanner} from
                the 4DN network and {experimentExtBanner} from other
                sources over {biosourceBanner}.
            </h4>
        );
    },

    /**
     * Render old homepage banner.
     * 
     * @deprecated
     * @inner
     * @memberof module:static-pages/home
     * @returns {Element} A React <div> element.
     */
    banner : function(){
        return (
            <div className="fourDN-banner text-left">
                <h1 className="page-title" style={{ fontSize : '3.25rem' }}>4DN Data Portal</h1>
                { this.summaryHeading() }
            </div>
        );
    },

    /**
     * The render function. Renders homepage contents.
     * 
     * @inner
     * @memberof module:static-pages/home
     * @returns {Element} A React <div> element.
     */
    render: function() {
        var c = this.props.context.content; // Content
       
        return (
            <div className="home-content-area">
                <div className="row">

                    <div className="col-md-6 col-xs-12">
                        <h2 className="fourDN-header">Welcome</h2>
                        <div className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: c.description}}/>
                    </div>

                    <div className="col-md-6 col-xs-12">
                        <h2 className="fourDN-header">Announcements</h2>
                        <Announcements/>
                    </div>

                </div>

                <div className="homepage-links-row">
                    <h4 className="fourDN-header">Links</h4>
                    <div className="links-wrapper clearfix">
                        <div className="link-block">
                                <a href="http://www.4dnucleome.org/" target="_blank">Main Portal</a>
                        </div>
                        <div className="link-block">
                            <a href="http://dcic.4dnucleome.org/" target="_blank">4DN DCIC</a>
                        </div>
                        <div className="link-block">
                            <a href="https://commonfund.nih.gov/4Dnucleome/index" target="_blank">NIH Common Fund</a>
                        </div>
                        <div className="link-block">
                            <a href="https://commonfund.nih.gov/4Dnucleome/FundedResearch" target="_blank">Centers and Labs</a>
                        </div>
                    </div>
                    <br/>
                </div>

            </div>
        );
    }
});

globals.content_views.register(HomePage, 'HomePage');
