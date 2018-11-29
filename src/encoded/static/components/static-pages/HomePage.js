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
    }

    midHeader(){
        return <div className="mt-2" />; // Temporary -- remove and uncomment lines below when we have better "Getting Started" page or static section or w/e.
        /*
        return (
            <div className="homepage-mid-header row mb-4 mt-2">
                <div className="col-md-6">
                    <BigBrowseButton />
                </div>
                <div className="col-md-6">
                    <Button className="btn-block btn-lg text-300" href="/help/user-guide/data-organization">
                        Guide to Getting Started
                    </Button>
                </div>
            </div>
        );
        */
    }

    introText(){
        var introContent = _.findWhere(this.props.context.content, { 'name' : 'home.introduction' }); // Content
        return (
            <React.Fragment>
                {/* <h2 className="homepage-section-title">{ (introContent && introContent.display_title) || "Introduction" }</h2> */}
                { introContent ?
                    <BasicStaticSectionBody {..._.pick(introContent, 'content', 'filetype')} />
                    : // Fallback -
                    <p className="text-center">Introduction content not yet indexed.</p>
                }
                {/* <LinksRow {..._.pick(this.props, 'session', 'windowWidth')} /> */}
            </React.Fragment>
        );
    }

    announcements(){
        return (
            <React.Fragment>
                <h2 className="homepage-section-title">Announcements</h2>
                <Announcements loaded session={this.props.session} announcements={this.props.context.announcements || null} />
            </React.Fragment>
        );
    }

    /**
     * The render function. Renders homepage contents.
     * @returns {Element} A React <div> element.
     */
    render() {
        return (
            <div className="home-content-area">
                { this.midHeader() }
                <h2 className="homepage-section-title">Introduction</h2>
                <div className="row">
                    <div className="col-xs-12 col-md-8">
                        { this.introText() }
                    </div>
                    <div className="col-xs-12 col-md-4 pull-right">
                        <LinksColumn {..._.pick(this.props, 'session', 'windowWidth')} />
                    </div>
                </div>
                <HomePageCarousel />
                <div className="mt-4">
                    { this.announcements() }
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

class LinksRow extends React.Component {

    static defaultProps = {
        'linkBoxVerticalPaddingOffset' : 22
    }

    jointAnalysisPageLink(colSize){
        var className = "link-block";
        if (colSize){
            className += (' col-sm-' + colSize);
        }
        return (
            <div className={className}>
                <a href="/joint-analysis">
                    <layout.VerticallyCenteredChild verticalPaddingOffset={this.props.linkBoxVerticalPaddingOffset}>
                        <span>Joint Analysis Page</span>
                    </layout.VerticallyCenteredChild>
                </a>
            </div>
        );
    }

    componentDidUpdate(pastProps, pastState){
        if (pastProps.session !== this.props.session){
            setTimeout(this.forceUpdate.bind(this), 500);
        }
    }

    internalLinks(){
        var { linkBoxVerticalPaddingOffset, session } = this.props;
        var colSize = session ? 4 : 6;
        return (
            <div className="homepage-links-row internal-links">
                <h3 className="text-300 mb-2 mt-3">Recommended</h3>
                <div className="links-wrapper clearfix row">
                    <div className={"link-block col-sm-" + colSize}>
                        <BigBrowseButton className={null}>
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>{ BigBrowseButton.defaultProps.children }</span>
                            </layout.VerticallyCenteredChild>
                        </BigBrowseButton>
                    </div>
                    <div className={"link-block col-sm-" + colSize}>
                        <a href="/help/user-guide/data-organization">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>Introduction to 4DN Metadata</span>
                            </layout.VerticallyCenteredChild>
                        </a>
                    </div>
                    { (session && this.jointAnalysisPageLink(colSize)) || null }
                </div>
            </div>
        );
    }

    externalLinks(){
        var linkBoxVerticalPaddingOffset = this.props.linkBoxVerticalPaddingOffset;
        return (
            <div className="homepage-links-row external-links">
                <h3 className="text-300 mb-2 mt-3">External Links</h3>
                <div className="links-wrapper clearfix row">
                    <div className="link-block col-sm-3">
                        <a href="http://www.4dnucleome.org/" target="_blank">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>Main Portal</span>
                            </layout.VerticallyCenteredChild>
                        </a>
                    </div>
                    <div className="link-block col-sm-3">
                        <a href="http://dcic.4dnucleome.org/" target="_blank">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>4DN DCIC</span>
                            </layout.VerticallyCenteredChild>
                        </a>
                    </div>
                    <div className="link-block col-sm-3">
                        <a href="https://commonfund.nih.gov/4Dnucleome/index" target="_blank">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>NIH Common Fund</span>
                            </layout.VerticallyCenteredChild>
                        </a>
                    </div>
                    <div className="link-block col-sm-3">
                        <a href="https://commonfund.nih.gov/4Dnucleome/FundedResearch" target="_blank">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>Centers and Labs</span>
                            </layout.VerticallyCenteredChild>
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


class LinksColumn extends LinksRow {

    internalLinks(){
        var { linkBoxVerticalPaddingOffset, session } = this.props;

        return (
            <div className="homepage-links-column internal-links">
                <h4 className="text-400 mb-15 mt-0">Recommended</h4>
                <div className="links-wrapper clearfix">
                    <div className="link-block">
                        <BigBrowseButton className="browse-btn">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>{ BigBrowseButton.defaultProps.children }</span>
                            </layout.VerticallyCenteredChild>
                        </BigBrowseButton>
                    </div>
                    <div className="link-block">
                        <a href="/help/user-guide/data-organization">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>Introduction to 4DN Metadata</span>
                            </layout.VerticallyCenteredChild>
                        </a>
                    </div>
                    { (session && this.jointAnalysisPageLink()) || null }
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
                        <a href="http://www.4dnucleome.org/" target="_blank">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>Main Portal</span>
                            </layout.VerticallyCenteredChild>
                        </a>
                    </div>
                    <div className="link-block">
                        <a href="http://dcic.4dnucleome.org/" target="_blank">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>4DN DCIC</span>
                            </layout.VerticallyCenteredChild>
                        </a>
                    </div>
                    <div className="link-block">
                        <a href="https://commonfund.nih.gov/4Dnucleome/index" target="_blank">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>NIH Common Fund</span>
                            </layout.VerticallyCenteredChild>
                        </a>
                    </div>
                    <div className="link-block">
                        <a href="https://commonfund.nih.gov/4Dnucleome/FundedResearch" target="_blank">
                            <layout.VerticallyCenteredChild verticalPaddingOffset={linkBoxVerticalPaddingOffset}>
                                <span>Centers and Labs</span>
                            </layout.VerticallyCenteredChild>
                        </a>
                    </div>
                </div>
                <br/>
            </div>
        );
    }
}


globals.content_views.register(HomePage, 'HomePage');
