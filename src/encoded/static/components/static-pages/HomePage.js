'use strict';

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import TwitterTimelineEmbed from '../lib/react-twitter-embed/TwitterTimelineEmbed';

import { FourfrontLogo } from './../viz/FourfrontLogo';
import { console, ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { BasicStaticSectionBody } from '@hms-dbmi-bgm/shared-portal-components/es/components/static-pages/BasicStaticSectionBody';
import { requestAnimationFrame } from '@hms-dbmi-bgm/shared-portal-components/es/components/viz/utilities';

import { navigate } from'./../util';
import { pageTitleViews, PageTitleContainer, TitleAndSubtitleUnder, StaticPageBreadcrumbs } from './../PageTitle';


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
                placeholder={twitterPlaceholder} autoHeight noFooter noHeader options={{ id: "profile:4dn_dcic" }} />
        );

        return (
            <div className="homepage-wrapper">

                <div className="home-content-area">

                    <CollectionsRow />

                    <div className="container" id="content">

                        <div className="row mt-8">
                            <div className="col-12 col-lg-8 recently-released-datasets-section">
                                <h2 className="homepage-section-title new-design ">Recently Released Datasets</h2>
                                <div className="recently-released-datasets-container">
                                    <RecentlyReleasedDataSets showAll />
                                </div>
                            </div>
                            <div className="col-12 col-lg-4 social-connections-column">
                                <h2 className="homepage-section-title new-design">
                                    <span>Tweets</span>
                                    <a href="https://help.twitter.com/en/twitter-for-websites-ads-info-and-privacy" target="_blank"
                                        rel="noopener noreferrer" className="right privacy-ext">
                                        <i className="icon icon-fw icon-info-circle fas" data-tip="Cookie & Privacy Information for Twitter" />
                                    </a>
                                </h2>
                                <div className="twitter-timeline-container" style={{ minHeight: '380px' }}>
                                    {twitterTimelineEmbed}
                                </div>
                            </div>
                        </div>

                    </div>

                    <ToolsAndResourcesRow />

                    <div className="container">
                        <FourDNMissonRow />

                        <HelpRow />

                        <div className="mt-8">
                            <h3 className="homepage-section-title text-500">External Links</h3>
                            <ExternalLinksRow />
                        </div>

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
    };

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

/** NOT USED FOR NOW - NEEDS UPDATES IF TO BE REINTRODUCED */
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

const CollectionsRow = React.memo(function CollectionsRow(props) {
    return (
        <div className="mt-6 mb-6 browse-data-collection-fullwidth-container">
            <div className="container">
                <div className="row pt-3 pb-3 p-3 browse-data-collection-container">
                    <div className="col-12 col-md-7 browse-data-collection-col-browse">
                        <div className="row">
                            <div className="col-12">
                                <div className='row'>
                                    <div className="col-12 col-md-6 text-center">
                                        <div className="h-100 p-0 browse-data-collection-block browse-all-data">
                                            <a href="/browse/?experimentset_type=replicate&type=ExperimentSetReplicate" className="h-100 d-flex flex-column text-decoration-none">
                                                <div className="mt-2"><i className="icon icon-database fas"></i></div>
                                                <div className="flex-grow-1 mt-2 browse-data-collection-block-title">Browse All Data</div>
                                                <div className="mt-2 pt-2 pb-2 pl-4 pr-4 browse-data-collection-block-desc">
                                                    Search all Experiment Sets<br /> in the 4D Nucleome Database
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6 text-center">
                                        <div className="h-100 p-0 browse-data-collection-block browse-by-publication">
                                            <a href="/search/?type=Publication&sort=static_content.location&sort=-number_of_experiment_sets&number_of_experiment_sets.from=1" className="h-100 d-flex flex-column text-decoration-none">
                                                <div className="mt-2"><i className="icon icon-book-open fas"></i></div>
                                                <div className="flex-grow-1 mt-2 browse-data-collection-block-title">Browse By Publication</div>
                                                <div className="mt-2 pt-2 pb-2 pl-4 pr-4 browse-data-collection-block-desc">
                                                    View Publications<br /> in the 4D Nucleome Database
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 col-md-5 pl-lg-5 d-flex flex-column browse-data-collection-col-collections">
                        <div className="flex-grow-1 mt-1">
                            <h2 className="homepage-section-title new-design text-500">4DN Data Collections</h2>
                            <a href="/hic-data-overview" className="btn btn-primary w-100">
                                Hi-C Datasets
                            </a>
                            <a href="/microscopy-data-overview" className="btn btn-primary w-100 mt-05">
                                All Microscopy Datasets
                            </a>
                            <a href="/resources/data-collections/chromatin-tracing-datasets" className="btn btn-primary w-100 mt-05">
                                Chromatin Tracing Datasets
                            </a>
                            <a href="/resources/data-collections" className="btn btn-primary w-100 mt-1 btn-all-data-collections">
                                <span className="float-left ml-1">View All Data Collections</span>
                                <span className="float-right mr-1"><i className="icon icon-arrow-right fas"></i></span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

class RecentlyReleasedDataSets extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            'mounted': false,
        };
    }

    componentDidMount() {
        this.setState({ 'mounted': true, 'loading': true }, () => {
            ajax.load('/recently_released_datasets', (res) => {
                if (res && res.terms && typeof res.terms === 'object') {
                    this.setState({ 'datasets': res.terms, 'loading': false });
                    setTimeout(ReactTooltip.rebuild, 100);
                }
            }, 'GET', () => {
                this.setState({ 'datasets': [], 'loading': false });
            });
        });
    }

    render() {
        const { showAll } = this.props;
        const { mounted, loading, datasets } = this.state;

        if (!mounted) {
            return null;
        }
        if (loading) {
            return (
                <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    <i className="icon icon-fw fas icon-spin icon-circle-notch" />
                </div>
            );
        }
        return (
            <React.Fragment>
                <div className="embedded-search-view-outer-container">
                    <div className="embedded-search-container">
                        <div className="row search-view-controls-and-results">
                            <div className="col-12">
                                <div className="search-results-outer-container is-within-page">
                                    <div className="search-results-container fully-loaded">
                                        <div className="search-headers-row" style={{ backgroundColor: '#EFF7F8' }}>
                                            <div className="headers-columns-overflow-container">
                                                <div className="columns clearfix" style={{ left: "0px" }}>
                                                    <div className="search-headers-column-block" style={{ width: "280px" }}>
                                                        <div className="inner" style={{ color: '#34646C' }}>
                                                            <div className="column-title"><span data-html="true">Dataset</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="search-headers-column-block" style={{ width: "200px" }}>
                                                        <div className="inner" style={{ color: '#34646C' }}>
                                                            <div className="column-title"><span data-html="true"># of Experiment Sets</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="search-headers-column-block" style={{ width: "240px" }}>
                                                        <div className="inner" style={{ color: '#34646C' }}>
                                                            <div className="column-title"><span data-tip="Type of experiment to which this file belongs" data-html="true">Lab</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="react-infinite-container" style={{ overflow: "auto", maxHeight: "400px;" }}>
                                            <div>
                                                {
                                                    _.map(datasets, function (item, datasetName) {
                                                        const searchUrl = "/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&dataset_label=" + encodeURIComponent(datasetName);
                                                        return (
                                                            <div className="search-result-row" style={{ minWidth: "696px" }}>
                                                                <div className="columns clearfix result-table-row">
                                                                    <div className="search-result-column-block" style={{ width: "280px", fontSize: '14px' }}>
                                                                        <div className="inner">
                                                                            <div className="title-block text-truncate" data-tip={datasetName}>{datasetName}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "200px", fontSize: '14px' }}>
                                                                        <div className="inner text-center"><span className="value text-truncate"><a href={searchUrl} data-tip={"Released on " + item.public_release}>{item.experiment_sets || '-'} Experiment Set(s)</a></span></div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "240px", fontSize: '14px' }}>
                                                                        <div className="inner"><span className="value text-left"><i className="icon icon-fw icon-user far user-icon" data-html="true" data-tip={"Submitted by " + item.labs}></i> <a href={searchUrl} data-tip={"Submitted by " + item.labs}>{item.labs || '-'}</a></span></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {
                    showAll ?
                        <a href="/browse/?type=ExperimentSetReplicate&experimentset_type=replicate" className="btn btn-primary mt-1 float-right btn-browse-all-exp-sets">
                            <span className="float-left px-2">Browse All Experiment Sets</span>
                            <span className="float-right"><i className="icon icon-arrow-right fas"></i></span>
                        </a> : null
                }
            </React.Fragment>
        );
    }
}

const ToolsAndResourcesRow = React.memo(function ToolsAndResourcesRow(props) {
    return (
        <div className="tools-and-resources-container">
            <div className="row mt-8 mb-3 tools-and-resources-container-title">
                <h2 className="homepage-section-title new-design text-center w-100 mb-0">Explore Our Tools and Resources for Data Visualization &amp; Analysis</h2>
                <span className="icon-wrapper w-100 mt-1"><i className="icon icon-tools fas"></i></span>
            </div>
            <div className="tools-and-resources-fullwidth-container">
                <div className="container">
                    <div className="row pl-2 pr-2 pt-4 pb-4 tools-and-resources-container-inner">
                        <div className="col-12 col-lg-8 tools-and-resources-col-tools">
                            <div className="row mh-100 h-100 mr-lg-1">
                                <div className="col-12 col-md-4 px-0 px-md-1 px-lg-2 tool-detail-col">
                                    <a href="/tools/visualization" className="h-100 p-2 d-flex flex-column tool-detail text-decoration-none">
                                        <div className="text-center w-100"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-tools-4dn-higlass.jpg" alt="HiGlass" /></div>
                                        <div className="mt-1 w-100 tool-logo"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-4dn-higlass-logo.png" alt="HiGlass logo" /></div>
                                        <div className="mt-1 pl-1 tool-detail-title">HiGlass</div>
                                        <div className="flex-grow-1 mt-1 pl-1 tool-detail-description">Use the 4DN visualization workspace to browse data</div>
                                        <div className="btn btn-primary w-100 mt-1 mb-05">
                                            <span className="float-left pl-2">Learn More</span>
                                            <span className="float-right pr-2"><i className="icon icon-arrow-right fas"></i></span>
                                        </div>
                                    </a>
                                </div>
                                <div className="col-12 col-md-4 px-0 px-md-1 px-lg-2 tool-detail-col">
                                    <a href="/tools/jupyterhub" className="h-100 p-2 d-flex flex-column tool-detail text-decoration-none">
                                        <div className="text-center w-100"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-tools-4dn-jupyter.jpg" alt="4DN Jupyter Hub" /></div>
                                        <div className="mt-1 w-100 tool-logo"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-4dn-jupyter-logo.png" alt="4DN Jupyter Hub logo" /></div>
                                        <div className="mt-1 pl-1 tool-detail-title">JupyterHub</div>
                                        <div className="flex-grow-1 mt-1 pl-1 tool-detail-description">Explore data in the cloud using python & the 4DN jupyter hub</div>
                                        <div className="btn btn-primary w-100 mt-1 mb-05">
                                            <span className="float-left pl-2">Learn More</span>
                                            <span className="float-right pr-2"><i className="icon icon-arrow-right fas"></i></span>
                                        </div>
                                    </a>
                                </div>
                                <div className="col-12 col-md-4 px-0 px-md-1 px-lg-2 tool-detail-col">
                                    <a href="/tools/micro-meta-app" className="h-100 p-2 d-flex flex-column tool-detail text-decoration-none">
                                        <div className="text-center w-100"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-tools-4dn-micrometa.jpg" alt="Micro Meta App" /></div>
                                        <div className="mt-1 w-100 tool-logo"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-4dn-micrometa-logo.png" alt="Micro Meta App logo" /></div>
                                        <div className="mt-1 pl-1 tool-detail-title">MicroMeta</div>
                                        <div className="flex-grow-1 mt-1 pl-1 tool-detail-description">Enter and access microscope metadata with Micrometa</div>
                                        <div className="btn btn-primary w-100 mt-1 mb-05">
                                            <span className="float-left pl-2">Learn More</span>
                                            <span className="float-right pr-2"><i className="icon icon-arrow-right fas"></i></span>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-lg-4 pl-8 p-3 mt-sm-3 mt-lg-0 tools-and-resources-col-resources">
                            <h2 className="homepage-section-title new-design">Portal Resources</h2>
                            <div className="p-3 d-flex flex-column resource-detail">
                                <a href="/resources/experimental-resources" className="text-decoration-none">
                                    <div className="row">
                                        <div className="col-3 text-center">
                                            <div className="mt-1"><i className="icon icon-flask fas"></i></div>
                                        </div>
                                        <div className="col-9">
                                            <div className="mt-1 resource-detail-title">Experimental Resources</div>
                                            <div className="flex-grow-1 mt-1 resource-detail-description">View Protocols, Cell Lines, Assays &amp; File Formats</div>
                                        </div>
                                    </div>
                                </a>
                            </div>
                            <div className="p-3 d-flex flex-column mt-1 resource-detail data-analysis">
                                <a href="/resources/data-analysis" className="text-decoration-none">
                                    <div className="row">
                                        <div className="col-3 text-center">
                                            <div className="mt-1"><i className="icon icon-project-diagram fas"></i></div>
                                        </div>
                                        <div className="col-9">
                                            <div className="mt-1 resource-detail-title">Data Analysis</div>
                                            <div className="flex-grow-1 mt-1 resource-detail-description">Learn about our standardized bioinformatic analysis pipelines</div>
                                        </div>
                                    </div>
                                </a>
                            </div>
                            <a href="/resources" className="btn btn-primary w-100 mt-1 resource-all">
                                <span className="float-left">View All Available Resources</span>
                                <span className="float-right"><i className="icon icon-arrow-right fas"></i></span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const FourDNMissonRow = React.memo(function FourDNMissonRow(props) {
    return (
        <div className="row mt-8 mb-8 p-3 fourdn-mission-container">
            <div className="col-12 p-4 fourdn-mission-content">
                <h2 className="homepage-section-title new-design text-center"><FourfrontLogo id="mission_fourfront_logo_svg" prefix="The" title="Mission"/></h2>
                <div className="fourdn-mission-text">
                    The 4D Nucleome Data Portal hosts data generated by the 4DN Network and other reference nucleomics data sets, and an expanding tool set for open data processing and visualization.
                </div>
            </div>
        </div>
    );
});

const HelpRow = React.memo(function HelpRow(props) {
    return (
        <div className="row mt-3 pl-2 pr-2">
            <div className="col-12 col-lg-7 px-4 pt-2 data-use-guidelines-container">
                <h2 className="homepage-section-title">Data Use Guidelines</h2>
                <p>The data at the 4DN Data Portal is generated by the 4DN Network and made freely available to the scientific community.</p>
                <ul>
                    <li>For unpublished data that you are intending to use for a publication, we ask that you please contact the data generating lab to discuss possible coordinated publication. In your manuscript, please cite <a href="https://doi.org/10.1038/nature23884">the 4DN White Paper (doi:10.1038/nature23884)</a>, and please acknowledge the 4DN lab which generated the data.</li>
                    <li>For published data please cite the relevant publication.</li>
                </ul>
                <p>Please direct any questions to the Data Coordination and
                    Intregration Center at <a href="mailto:support@4dnucleome.org">support@4dnucleome.org</a>.
                </p>
            </div>
            <div className="col-12 col-lg-5 pt-3 d-flex flex-column fourdn-help-container">
                <div className="flex-grow-1">
                    <h2 className="homepage-section-title new-design">4DN Help</h2>
                    <a href="/help/user-guide" className="btn btn-primary w-100 mt-1 p-2 btn-4dn-help">
                        <span className="float-left ml-2 mt-05 mb-05 btn-4dn-help-icon">
                            <i className="icon icon-user fas"></i>
                        </span>
                        <span className="float-left ml-2 mt-13 help-button-text">User Guide</span>
                        <span className="float-right mr-2 mt-13 btn-4dn-help-arrow">
                            <i className="icon icon-arrow-right fas"></i>
                        </span>
                    </a>
                    <a href="/help/submitter-guide" className="btn btn-primary w-100 mt-2 p-2 btn-4dn-help">
                        <span className="float-left ml-2 mt-05 mb-05 btn-4dn-help-icon">
                            <i className="icon icon-file-import fas"></i>
                        </span>
                        <span className="float-left ml-2 mt-13 help-button-text">Submitter Guide</span>
                        <span className="float-right mr-2 mt-13 btn-4dn-help-arrow">
                            <i className="icon icon-arrow-right fas"></i>
                        </span>
                    </a>
                    <a href="/help/about/contact-us" className="btn btn-primary w-100 mt-2 p-2 btn-4dn-help">
                        <span className="float-left ml-2 mt-05 mb-05 btn-4dn-help-icon">
                            <i className="icon icon-envelope fas"></i>
                        </span>
                        <span className="float-left ml-2 mt-13 help-button-text">Contact Us</span>
                        <span className="float-right mr-2 mt-13 btn-4dn-help-arrow">
                            <i className="icon icon-arrow-right fas"></i>
                        </span>
                    </a>
                </div>
            </div>
        </div>
    );
});

const ExternalLinksRow = React.memo(function LinksRow(props){
    return (
        <div className="homepage-links-row external-links">
            <div className="links-wrapper row mb-2">
                <div className="col-12 col-md-3">
                    <a className="link-block external-link" href="http://www.4dnucleome.org/" target="_blank" rel="noopener noreferrer">
                        <span>Main 4DN Portal</span>
                    </a>
                </div>
                <div className="col-12 col-md-3">
                    <a className="link-block external-link" href="http://dcic.4dnucleome.org/" target="_blank" rel="noopener noreferrer">
                        <span>4DN DCIC</span>
                    </a>
                </div>
                <div className="col-12 col-md-3">
                    <a className="link-block external-link" href="https://commonfund.nih.gov/4Dnucleome/index" target="_blank" rel="noopener noreferrer">
                        <span>NIH Common Fund</span>
                    </a>
                </div>
                <div className="col-12 col-md-3">
                    <a className="link-block external-link" href="https://commonfund.nih.gov/4Dnucleome/FundedResearch" target="_blank" rel="noopener noreferrer">
                        <span>Centers and Labs</span>
                    </a>
                </div>
            </div>
        </div>
    );
});

const HomePageTitle = React.memo(function HomePageTitle(props) {
    const { alerts } = props;
    return (
        <PageTitleContainer alerts={alerts}>
            <StaticPageBreadcrumbs key="breadcrumbs" />
            <TitleAndSubtitleUnder subtitle="A platform to search, visualize, and download nucleomics data."
                className="home-page-title" subTitleClassName="subtitle" style={{ marginTop: '38px' }}>
                4D Nucleome Data Portal
            </TitleAndSubtitleUnder>
        </PageTitleContainer>
    );
});

pageTitleViews.register(HomePageTitle, "HomePage");