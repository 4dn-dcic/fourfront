'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import TwitterTimelineEmbed from '../lib/react-twitter-embed/TwitterTimelineEmbed';

import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { BasicStaticSectionBody } from '@hms-dbmi-bgm/shared-portal-components/es/components/static-pages/BasicStaticSectionBody';
import { requestAnimationFrame } from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';

import { navigate } from'./../util';
import { Announcements, HomePageCarousel } from './components';


/**
 * Homepage View component. Gets rendered at '/' and '/home' paths.
 *
 * @module {Component} static-pages/home
 * @prop {Object} context - Should have properties typically needed for any static page.
 */
export default class HomePage extends React.PureComponent {

    static propTypes = {
        "context" : PropTypes.shape({
            "content" : PropTypes.array.isRequired,
            "announcements" : PropTypes.arrayOf(PropTypes.object)
        }).isRequired,
        "session": PropTypes.bool.isRequired
    };

    /**
     * The render function. Renders homepage contents.
     * @returns {Element} A React <div> element.
     */
    render() {
        const { windowWidth, context, session } = this.props;
        const { announcements = null, content = [] } = context || {};
        const introContent = _.findWhere(content, { 'name' : 'home.introduction' }); // Content
        const introToShow = introContent ?
            <BasicStaticSectionBody {..._.pick(introContent, 'content', 'filetype')} />
            : <p className="text-center">Introduction content not yet indexed.</p>;

        const twitterPlaceholder = (
            <div className="twitter-loading-placeholder">
                <i className="icon icon-twitter icon-2x fab"/>
            </div>
        );
        const twitterTimelineEmbed = (
            <TwitterTimelineEmbed sourceType="profile" screenName="4dn_dcic"
                placeholder={twitterPlaceholder} autoHeight noFooter noHeader />
        );

        return (
            <div className="homepage-wrapper">

                <HomePageCarousel {...{ windowWidth, context }} />

                <div className="container home-content-area" id="content">
                    <div className="row">
                        <div className="col-12 col-md-8">
                            <h2 className="homepage-section-title">Introduction</h2>
                            { introToShow }
                        </div>
                        <div className="col-12 col-md-4 social-connections-column">
                            {/*
                            <LinksColumn {...{ session, windowWidth }} />
                            */}
                            <h2 className="homepage-section-title">
                                <span>Tweets</span>
                                <a href="https://help.twitter.com/en/twitter-for-websites-ads-info-and-privacy" target="_blank"
                                    rel="noopener noreferrer" className="right privacy-ext">
                                    <i className="icon icon-fw icon-info-circle fas" data-tip="Cookie & Privacy Information for Twitter"/>
                                </a>
                            </h2>
                            <div className="twitter-timeline-container">
                                { twitterTimelineEmbed }
                            </div>
                        </div>
                    </div>

                    {/*
                    <div className="mt-4">
                        <h2 className="homepage-section-title">Announcements</h2>
                        <Announcements {...{ session, announcements, windowWidth }} />
                    </div>
                    */}

                    {/*
                    <div className="mt-4">
                        <h3 className="homepage-section-title text-300">Getting Started</h3>
                        <GettingStartedLinksRow {...{ session }} />
                    </div>
                    */}

                    <div className="mt-4">
                        <h3 className="homepage-section-title text-400">External Links</h3>
                        <ExternalLinksRow />
                    </div>

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
            const [ topMenuBrowseButton ] = document.getElementsByClassName('browse-nav-btn');
            if (topMenuBrowseButton){
                topMenuBrowseButton.style.textShadow = "0 0 0 #000";
                topMenuBrowseButton.style.color = "#000";
                topMenuBrowseButton.style.backgroundColor = "#e7e7e7";
            }
        });
    }

    handleMouseLeave(e){
        requestAnimationFrame(function(){
            const [ topMenuBrowseButton ] = document.getElementsByClassName('browse-nav-btn');
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


const GettingStartedLinksRow = React.memo(function GettingStartedLinksRow(props){
    const { linkBoxVerticalPaddingOffset, session } = props;
    let jointAnalysisPageLink = null;
    let nofisAicsCollaborationPageLink = null;
    if (session) {
        jointAnalysisPageLink = (
            <div className="col-3">
                <a className="link-block" href="/joint-analysis">
                    <span>Joint Analysis Page</span>
                </a>
            </div>
        );
        nofisAicsCollaborationPageLink = (
            <div className="col-3">
                <a className="link-block" href="/4DN-AICS-Collaboration">
                    <span>NOFIC-AICS Collaboration</span>
                </a>
            </div>
        );
    }
    return (
        <div className="homepage-links-row getting-started-links">
            <div className="links-wrapper row">
                <div className="col-3">
                    <BigBrowseButton className="browse-btn link-block">
                        <span>{ BigBrowseButton.defaultProps.children }</span>
                    </BigBrowseButton>
                </div>
                <div className="col-3">
                    <a className="link-block" href="/search/?type=Publication&sort=static_content.location&sort=-number_of_experiment_sets">
                        <span>Browse Publications</span>
                    </a>
                </div>
                <div className="col-3">
                    <a className="link-block" href="/tools/jupyterhub">
                        <span>Explore 4DN Data (JupyterHub)</span>
                    </a>
                </div>
                <div className="col-3">
                    <a className="link-block" href="/tools/visualization">
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
                { jointAnalysisPageLink }
                { nofisAicsCollaborationPageLink }
            </div>
        </div>
    );
});

const ExternalLinksRow = React.memo(function LinksRow(props){
    return (
        <div className="homepage-links-row external-links">
            <div className="links-wrapper row">
                <div className="col-3">
                    <a className="link-block external-link" href="http://www.4dnucleome.org/" target="_blank" rel="noopener noreferrer">
                        <span>Main 4DN Portal</span>
                    </a>
                </div>
                <div className="col-3">
                    <a className="link-block external-link" href="http://dcic.4dnucleome.org/" target="_blank" rel="noopener noreferrer">
                        <span>4DN DCIC</span>
                    </a>
                </div>
                <div className="col-3">
                    <a className="link-block external-link" href="https://commonfund.nih.gov/4Dnucleome/index" target="_blank" rel="noopener noreferrer">
                        <span>NIH Common Fund</span>
                    </a>
                </div>
                <div className="col-3">
                    <a className="link-block external-link" href="https://commonfund.nih.gov/4Dnucleome/FundedResearch" target="_blank" rel="noopener noreferrer">
                        <span>NIH Common Fund</span>
                    </a>
                </div>
            </div>
        </div>
    );
});
