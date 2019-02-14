'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, layout, navigate } from'./../util';
import { requestAnimationFrame } from './../viz/utilities';
import { Collapse, Button } from 'react-bootstrap';
import * as store from '../../store';
import * as globals from './../globals';
import { Announcements, BasicStaticSectionBody, HomePageCarousel } from './components';


/**
 * Homepage View component. Gets rendered at '/' and '/home' paths.
 *
 * @module {Component} static-pages/home
 * @prop {Object} context - Should have properties typically needed for any static page.
 */
export default class HomePage extends React.PureComponent {

    static propTypes = {
        "context" : PropTypes.shape({
            "content" : PropTypes.array
        }).isRequired
    };

    introText(){
        var introContent = _.findWhere(this.props.context.content, { 'name' : 'home.introduction' }); // Content

        if (introContent){
            return <BasicStaticSectionBody {..._.pick(introContent, 'content', 'filetype')} />;
        }

        return <p className="text-center">Introduction content not yet indexed.</p>;
    }

    /**
     * The render function. Renders homepage contents.
     * @returns {Element} A React <div> element.
     */
    render() {
        return (
            <div className="home-content-area">
                <HomePageCarousel {..._.pick(this.props, 'windowWidth')} />
                <div className="row">
                    <div className="col-xs-12 col-md-8">
                        <h2 className="homepage-section-title">Introduction</h2>
                        { this.introText() }
                    </div>
                    <div className="col-xs-12 col-md-4 pull-right">
                        <LinksColumn {..._.pick(this.props, 'session', 'windowWidth')} />
                    </div>
                </div>
                <div className="mt-4">
                    <h2 className="homepage-section-title">Announcements</h2>
                    <Announcements loaded session={this.props.session} announcements={this.props.context.announcements || null} />
                </div>
            </div>
        );
    }

}



class BigBrowseButton extends React.Component {

    static defaultProps = {
        'element' : 'a',
        'className' : "btn btn-block btn-primary btn-lg text-400",
        'children' : 'Browse 4DN Data'
    }

    constructor(props){
        super(props);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
    }

    handleMouseEnter(){
        requestAnimationFrame(function(){
            var topMenuBrowseButton = document.getElementById('browse-menu-item');
            if (topMenuBrowseButton){
                topMenuBrowseButton.style.textShadow = "0 0 0 #000";
                topMenuBrowseButton.style.color = "#000";
                topMenuBrowseButton.style.backgroundColor = "#e7e7e7";
            }
        });
    }

    handleMouseLeave(e){
        requestAnimationFrame(function(){
            var topMenuBrowseButton = document.getElementById('browse-menu-item');
            if (topMenuBrowseButton){
                topMenuBrowseButton.style.textShadow = '';
                topMenuBrowseButton.style.color = '';
                topMenuBrowseButton.style.backgroundColor = '';
            }
        });
    }

    render(){
        var children = this.props.children,
            element = this.props.element,
            propsToPass = {
                'onMouseEnter' : this.handleMouseEnter,
                'onMouseLeave' : this.handleMouseLeave,
                'onClick' : this.handleMouseLeave,
                'href' : navigate.getBrowseBaseHref()
            };

        return React.createElement(element, _.extend(_.omit(this.props, 'element', 'children'), propsToPass), children);
    }
}


class LinksColumn extends React.PureComponent {

    jointAnalysisPageLink(colSize){
        var className = "link-block";
        if (colSize){
            className += (' col-sm-' + colSize);
        }
        return (
            <div className={className}>
                <a href="/joint-analysis">
                    <span>Joint Analysis Page</span>
                </a>
            </div>
        );
    }

    /**
     * Add a link for the NOFIC-AICS Collaboration page.
     */
    nofisAicsCollaborationPageLink(colSize){
        var className = "link-block";
        if (colSize){
            className += (' col-sm-' + colSize);
        }
        return (
            <div className={className}>
                <a href="/4DN-AICS-Collaboration">
                    <span>NOFIC-AICS Collaboration</span>
                </a>
            </div>
        );
    }

    internalLinks(){
        var { linkBoxVerticalPaddingOffset, session } = this.props;

        return (
            <div className="homepage-links-column internal-links">
                <h4 className="text-400 mb-15 mt-0">Getting Started</h4>
                <div className="links-wrapper clearfix">
                    <div className="link-block">
                        <BigBrowseButton className="browse-btn">
                            <span>{ BigBrowseButton.defaultProps.children }</span>
                        </BigBrowseButton>
                    </div>
                    <div className="link-block">
                        <a href="/search/?award.project=4DN&type=Publication">
                            <span>Browse 4DN Publications</span>
                        </a>
                    </div>
                    <div className="link-block">
                        <a href="/jupyterhub">
                            <span>Explore 4DN Data (JupyterHub)</span>
                        </a>
                    </div>
                    <div className="link-block">
                        <a href="/visualization/index">
                            <span>Visualize 4DN Data (HiGlass)</span>
                        </a>
                    </div>
                    {/*
                    <div className="link-block">
                        <a href="/help/user-guide/data-organization">
                            <span>Introduction to 4DN Metadata</span>
                        </a>
                    </div>
                    */}
                    { (session && this.jointAnalysisPageLink()) || null }
                    { (session && this.nofisAicsCollaborationPageLink()) || null }
                </div>
            </div>
        );
    }

    externalLinks(){
        var linkBoxVerticalPaddingOffset = this.props.linkBoxVerticalPaddingOffset;
        return (
            <div className="homepage-links-column external-links">
                {/* <h3 className="text-300 mb-2 mt-3">External Links</h3> */}
                <h4 className="text-400 mb-15 mt-25">External Links</h4>
                <div className="links-wrapper clearfix">
                    <div className="link-block">
                        <a href="http://www.4dnucleome.org/" target="_blank" className="external-link">
                            <span>Main Portal</span>
                        </a>
                    </div>
                    <div className="link-block">
                        <a href="http://dcic.4dnucleome.org/" target="_blank" className="external-link">
                            <span>4DN DCIC</span>
                        </a>
                    </div>
                    <div className="link-block">
                        <a href="https://commonfund.nih.gov/4Dnucleome/index" target="_blank" className="external-link">
                            <span>NIH Common Fund</span>
                        </a>
                    </div>
                    <div className="link-block">
                        <a href="https://commonfund.nih.gov/4Dnucleome/FundedResearch" target="_blank" className="external-link">
                            <span>Centers and Labs</span>
                        </a>
                    </div>
                </div>
                <br/>
            </div>
        );
    }

    render(){
        return <div className="homepage-links">{ this.internalLinks() }{ this.externalLinks() }</div>;
    }

}


globals.content_views.register(HomePage, 'HomePage');
