'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, layout, navigate } from'./../util';
import { requestAnimationFrame } from './../viz/utilities';
import { Collapse, Button } from 'react-bootstrap';
import * as store from '../../store';
import * as globals from './../globals';
import { Announcements } from './components';


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
            <div className="col-md-6 col-xs-12">
                <h2 className="homepage-section-title">{ (introContent && introContent.display_title) || "Introduction" }</h2>
                <div className="fourDN-content text-justify" dangerouslySetInnerHTML={{__html: (introContent && introContent.content) || "<p>Introduction content not yet indexed.</p>" }}/>
                <layout.WindowResizeUpdateTrigger><LinksRow/></layout.WindowResizeUpdateTrigger>
            </div>
        );
    }

    announcements(){
        return (
            <div className="col-xs-12 col-md-6 pull-right">
                <h2 className="homepage-section-title">Announcements</h2>
                <Announcements loaded session={this.props.session} announcements={this.props.context.announcements} />
            </div>
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
                <div className="row">
                    { this.introText() }
                    { this.announcements() }
                </div>
            </div>
        );
    }

}


class BigBrowseButton extends React.Component {

    constructor(props){
        super(props);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
    }

    onMouseEnter(){
        requestAnimationFrame(function(){
            var topMenuBrowseButton = document.getElementById('browse-menu-item');
            if (topMenuBrowseButton){
                topMenuBrowseButton.style.textShadow = "0 0 0 #000";
                topMenuBrowseButton.style.color = "#000";
                topMenuBrowseButton.style.backgroundColor = "#e7e7e7";
            }
        });
    }

    onMouseLeave(e){
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
        return (
            <Button className="btn-block btn-primary btn-lg text-400" href={navigate.getBrowseBaseHref()} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onClick={this.onMouseLeave}>
                Browse 4DN Data
            </Button>
        );
    }
}


class LinksRow extends React.PureComponent {

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
}


globals.content_views.register(HomePage, 'HomePage');
