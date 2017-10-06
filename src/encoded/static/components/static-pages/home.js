'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, layout } from'./../util';
import * as announcements_data from '../../data/announcements_data';
import { Collapse } from 'react-bootstrap';
import * as store from '../../store';
import * as globals from './../globals';
import { BannerEntry, Announcements } from './components';


/**
 * Homepage View component. Gets rendered at '/' and '/home' paths.
 * 
 * @module {Component} static-pages/home
 * @prop {Object} context - Should have properties typically needed for any static page.
 */


export default class HomePage extends React.Component {

    static propTypes = {
        "context" : PropTypes.shape({
            "content" : PropTypes.shape({
                "description" : PropTypes.string,
                "links" : PropTypes.string
            }).isRequired
        }).isRequired
    }

    /**
     * Render old subheading
     * 
     * @deprecated
     * @inner
     * @memberof module:static-pages/home
     * @returns {Element} H4 React Element with quick summary: "The portal currently hosts X from the 4DN network and Y from other sources over Z."
     */
    summaryHeading(){
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
    }

    /**
     * Render old homepage banner.
     * @deprecated
     * @returns {Element} A React <div> element.
     */
    banner(){
        return (
            <div className="fourDN-banner text-left">
                <h1 className="page-title" style={{ fontSize : '3.25rem' }}>4DN Data Portal</h1>
                { this.summaryHeading() }
            </div>
        );
    }

    /**
     * The render function. Renders homepage contents.
     * @returns {Element} A React <div> element.
     */
    render() {
        var c = this.props.context.content; // Content
       
        return (
            <div className="home-content-area">

                
                <div className="row">

                    <div className="col-md-6 col-xs-12">
                        <h2 className="fourDN-header">Introduction</h2>
                        <div className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: c.description}}/>

                        <layout.WindowResizeUpdateTrigger><LinksRow/></layout.WindowResizeUpdateTrigger>

                    </div>

                    <div className="col-md-6 col-xs-12">
                        <h2 className="fourDN-header">Announcements</h2>
                        <Announcements/>
                    </div>

                </div>

                

            </div>
        );
    }


}

class LinksRow extends React.Component {

    static defaultProps = {
        'linkBoxVerticalPaddingOffset' : 22
    }

    render(){
        var linkBoxVerticalPaddingOffset = this.props.linkBoxVerticalPaddingOffset;
        return (
            <div className="homepage-links-row">
                <h3 className="text-300 mb-2 mt-3">External Links</h3>
                <div className="links-wrapper clearfix row">
                    <div className="link-block col-sm-3">
                        <a href="http://www.4dnucleome.org/" target="_blank">
                            <VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>Main Portal</span>
                            </VerticallyCenteredChild>
                        </a>
                    </div>
                    <div className="link-block col-sm-3">
                        <a href="http://dcic.4dnucleome.org/" target="_blank">
                        <VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                            <span>4DN DCIC</span>
                        </VerticallyCenteredChild>
                        </a>
                    </div>
                    <div className="link-block col-sm-3">
                        <a href="https://commonfund.nih.gov/4Dnucleome/index" target="_blank">
                            <VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>NIH Common Fund</span>
                            </VerticallyCenteredChild>
                        </a>
                    </div>
                    <div className="link-block col-sm-3">
                        <a href="https://commonfund.nih.gov/4Dnucleome/FundedResearch" target="_blank">
                            <VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>Centers and Labs</span>
                            </VerticallyCenteredChild>
                        </a>
                    </div>
                </div>
                <br/>
            </div>
        );
    }
}


class VerticallyCenteredChild extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            'mounted' : true
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    render(){
        var style = null;
        //var domParentBlock = (this.state.mounted && this.refs && this.refs.parentBlock) || null;
        var domChildBlock = (this.state.mounted && this.refs && this.refs.childElement) || null;
        if (domChildBlock){
            var domParentBlock = domChildBlock.parentElement;

            var heightParent = domParentBlock.offsetHeight;
            if (typeof this.props.verticalPaddingOffset === 'number'){
                heightParent -= this.props.verticalPaddingOffset;
            }
            var heightChild = domChildBlock.offsetHeight;
            if (heightParent && heightChild && heightChild < heightParent){
                style = {
                    'transform' : 'translateY(' + Math.floor((heightParent - heightChild) / 2) + 'px)'
                };
            }

        }
        if (style){
            var origStyle = this.props.children.props.style || {};
            style = _.extend(style, origStyle);
        }
        var childClassName = this.props.children.props.className;
        var className = 'vertically-centered-child' + (childClassName ? ' ' + childClassName : '');

        return React.cloneElement(this.props.children, { ref : 'childElement', 'style' : style, 'className' : className } );
    }

}



globals.content_views.register(HomePage, 'HomePage');
