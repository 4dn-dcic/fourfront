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

                {/* <HomePageCarousel {...{ windowWidth, context }} /> */}

                <div className="container home-content-area" id="content">

                    <div className="row mt-4 pt-3 pb-3" style={{ backgroundColor: '#EFF7F8' }}>
                        <div className="col-12 col-md-7">
                            <div className="row mh-100 h-100">
                                <div className="col-12 col-md-5 ml-2 text-center mh-100 h-100 m-2 p-0 d-flex flex-column" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
                                    <div className="mt-3"><i className="icon icon-database fas" style={{ fontSize: '4rem', opacity: '0.5', color: '#D7EAEE' }}></i></div>
                                    <div className="mt-3"><span style={{ fontSize: '1.75rem', fontWeight: '600', color: '#34646C' }}>Browse All Data</span></div>
                                    <div className="flex-grow-1 mt-2 pt-2 pl-4 pr-4" style={{ backgroundColor: '#BBE3EA', color: '#34646C', fontSize: '1.3rem', lineHeight: '1.3', fontWeight: '400', borderRadius: '0 0 8px 8px' }}>Search all Experiment Sets<br/> in the 4D Nucleome Database</div>
                                </div>
                                <div className="col-12 col-md-5 ml-2 text-center mh-100 h-100 m-2 p-0 d-flex flex-column" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
                                    <div className="mt-3"><i className="icon icon-book-open fas" style={{ fontSize: '4rem', opacity: '0.5', color: '#D7EAEE' }}></i></div>
                                    <div className="mt-3"><span style={{ fontSize: '1.75rem', fontWeight: '600', color: '#34646C' }}>Browse By Publication</span></div>
                                    <div className="flex-grow-1 mt-2 pt-2 pl-4 pr-4" style={{ backgroundColor: '#BBE3EA', color: '#34646C', fontSize: '1.3rem', lineHeight: '1.3', fontWeight: '400', borderRadius: '0 0 8px 8px' }}>View Publications<br/> in the 4D Nucleome Database</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-md-5">
                            <h2 className="homepage-section-title new-design">4DN Data Collections</h2>
                            <div>
                                <button type="button" className="btn btn-primary w-100" style={{ fontSize: '1.4rem', borderRadius: '5px' }}>
                                    {/* <i className="mr-05 icon icon-fw icon-check-square far"></i><span className="d-none d-md-inline text-400">Select </span>
                                    <span className="text-600">All</span> */}
                                    Hi-C Datasets
                                </button>
                                <button type="button" className="btn btn-primary w-100 mt-05" style={{ fontSize: '1.4rem', borderRadius: '5px' }}>
                                    {/* <i className="mr-05 icon icon-fw icon-check-square far"></i><span className="d-none d-md-inline text-400">Select </span>
                                    <span className="text-600">All</span> */}
                                    All Microscopy Datasets
                                </button>
                                <button type="button" className="btn btn-primary w-100 mt-05" style={{ fontSize: '1.4rem', borderRadius: '5px' }}>
                                    {/* <i className="mr-05 icon icon-fw icon-check-square far"></i><span className="d-none d-md-inline text-400">Select </span>
                                    <span className="text-600">All</span> */}
                                    Chromatin Tracing Datasets
                                </button>
                                <button type="button" className="btn btn-primary w-100 mt-1" style={{ fontSize: '1.1rem', borderWidth: '0px', borderRadius: '10px', backgroundColor: '#D5E9EB', color: '#34646C' }}>
                                    {/* <i className="mr-05 icon icon-fw icon-check-square far"></i><span className="d-none d-md-inline text-400">Select </span>
                                    <span className="text-600">All</span> */}
                                    <span className="float-left">View All Data Collections</span>
                                    <span className="float-right"><i className="icon icon-arrow-right fas"></i></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-3">
                        <div className="col-12 col-md-8">
                            <h2 className="homepage-section-title new-design">Recently Released Datasets</h2>
                            <div className="embedded-search-view-outer-container">
                                <div className="embedded-search-container">
                                    <div className="row search-view-controls-and-results" data-search-item-type="File" data-search-abstract-type="File">
                                        <div className="col-12">
                                            <div className="search-results-outer-container is-within-page" data-context-loading="false">
                                                <div className="search-results-container fully-loaded">
                                                    <div className="search-headers-row" style={{ backgroundColor: '#EFF7F8' }}>
                                                        <div className="headers-columns-overflow-container">
                                                            <div className="columns clearfix" style={{ left: "0px" }}>
                                                                <div data-field="display_title" data-column-key="display_title" className="search-headers-column-block" style={{ width: "280px" }} data-first-visible-column="true">
                                                                    <div className="inner" style={{ color: '#34646C' }}>
                                                                        <div className="column-title"><span data-html="true">Dataset</span></div>
                                                                        <span className="column-sort-icon" data-html="true"><i className="sort-icon icon icon-fw icon-sort-down fas align-top"></i></span>
                                                                    </div>
                                                                    <div className="width-adjuster react-draggable" style={{ transform: "translate(280px)", borderColor: '#34646C' }}></div>
                                                                </div>
                                                                <div data-field="lab.display_title" data-column-key="lab.display_title" className="search-headers-column-block" style={{ width: "200px" }}>
                                                                    <div className="inner" style={{ color: '#34646C' }}>
                                                                        <div className="column-title"><span data-html="true"># of Experiment Sets</span></div>
                                                                        <span className="column-sort-icon" data-html="true"><i className="sort-icon icon icon-fw icon-sort-down fas align-top"></i></span>
                                                                    </div>
                                                                    <div className="width-adjuster react-draggable" style={{ transform: "translate(200px)" }}></div>
                                                                </div>
                                                                <div data-field="track_and_facet_info.experiment_type" data-column-key="track_and_facet_info.experiment_type" className="search-headers-column-block" style={{ width: "200px" }}>
                                                                    <div className="inner" style={{ color: '#34646C' }}>
                                                                        <div className="column-title"><span data-tip="Type of experiment to which this file belongs" data-html="true">Lab</span></div>
                                                                        <span className="column-sort-icon" data-html="true"><i className="sort-icon icon icon-fw icon-sort-down fas align-top"></i></span>
                                                                    </div>
                                                                    <div className="width-adjuster react-draggable" style={{ transform: "translate(200px)" }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="react-infinite-container" style={{ overflow: "auto", maxHeight: "400px;" }}>
                                                        <div>
                                                            <div style={{ width: "100%", height: "0px;" }}></div>
                                                            <div className="search-result-row detail-closed" data-row-number="0" style={{ minWidth: "696px" }}>
                                                                <div className="columns clearfix result-table-row" draggable="false">
                                                                    <div className="search-result-column-block" style={{ width: "280px", fontSize:'14px' }} data-field="display_title" data-first-visible-column="true" data-column-even="true">
                                                                        <div className="inner">
                                                                            <div className="title-block text-truncate" data-tip="4DNFIO67AFHX.fastq.gz" data-delay-show="750">Chromatin tracing of chRX</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "200px", fontSize:'14px' }} data-field="lab.display_title" data-column-even="false">
                                                                        <div className="inner text-center"><span className="value text-truncate"><a href="#">9 Experiment Set(s)</a></span></div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "200px", fontSize:'14px' }} data-field="track_and_facet_info.experiment_type" data-column-even="true">
                                                                        <div className="inner"><span className="value text-center"><i className="icon icon-fw icon-user far user-icon" data-html="true" data-tip="<small>Submitted by</small> 4dn DCIC"></i> <a href="/labs/4dn-dcic-lab/">4DN DCIC, HMS</a></span></div>
                                                                    </div>
                                                                </div>
                                                                <div className="result-table-detail-container detail-closed">
                                                                    <div></div>
                                                                </div>
                                                            </div>
                                                            <div className="search-result-row detail-closed" data-row-number="0" style={{ minWidth: "696px" }}>
                                                                <div className="columns clearfix result-table-row" draggable="false">
                                                                    <div className="search-result-column-block" style={{ width: "280px", fontSize:'14px' }} data-field="display_title" data-first-visible-column="true" data-column-even="true">
                                                                        <div className="inner">
                                                                            <div className="title-block text-truncate" data-tip="4DNFIO67AFHX.fastq.gz" data-delay-show="750">Chromatin tracing in mouse brain</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "200px", fontSize:'14px' }} data-field="lab.display_title" data-column-even="false">
                                                                        <div className="inner text-center"><span className="value text-truncate"><a href="#">4 Experiment Set(s)</a></span></div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "200px", fontSize:'14px' }} data-field="track_and_facet_info.experiment_type" data-column-even="true">
                                                                        <div className="inner"><span className="value text-center"><i className="icon icon-fw icon-user far user-icon" data-html="true" data-tip="<small>Submitted by</small> 4dn DCIC"></i> <a href="/labs/4dn-dcic-lab/">4DN DCIC, HMS</a></span></div>
                                                                    </div>
                                                                </div>
                                                                <div className="result-table-detail-container detail-closed">
                                                                    <div></div>
                                                                </div>
                                                            </div>
                                                            <div className="search-result-row detail-closed" data-row-number="0" style={{ minWidth: "696px" }}>
                                                                <div className="columns clearfix result-table-row" draggable="false">
                                                                    <div className="search-result-column-block" style={{ width: "280px", fontSize:'14px' }} data-field="display_title" data-first-visible-column="true" data-column-even="true">
                                                                        <div className="inner">
                                                                            <div className="title-block text-truncate" data-tip="4DNFIO67AFHX.fastq.gz" data-delay-show="750">Chromatin tracing in mESCs</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "200px", fontSize:'14px' }} data-field="lab.display_title" data-column-even="false">
                                                                        <div className="inner text-center"><span className="value text-truncate"><a href="#">3 Experiment Set(s)</a></span></div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "200px", fontSize:'14px' }} data-field="track_and_facet_info.experiment_type" data-column-even="true">
                                                                        <div className="inner"><span className="value text-center"><i className="icon icon-fw icon-user far user-icon" data-html="true" data-tip="<small>Submitted by</small> 4dn DCIC"></i> <a href="/labs/4dn-dcic-lab/">4DN DCIC, HMS</a></span></div>
                                                                    </div>
                                                                </div>
                                                                <div className="result-table-detail-container detail-closed">
                                                                    <div></div>
                                                                </div>
                                                            </div>
                                                            <div className="search-result-row detail-closed" data-row-number="0" style={{ minWidth: "696px" }}>
                                                                <div className="columns clearfix result-table-row" draggable="false">
                                                                    <div className="search-result-column-block" style={{ width: "280px", fontSize:'14px' }} data-field="display_title" data-first-visible-column="true" data-column-even="true">
                                                                        <div className="inner">
                                                                            <div className="title-block text-truncate" data-tip="4DNFIO67AFHX.fastq.gz" data-delay-show="750">H3K4me3 PLAC-seq on embryo</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "200px", fontSize:'14px' }} data-field="lab.display_title" data-column-even="false">
                                                                        <div className="inner text-center"><span className="value text-truncate"><a href="#">12 Experiment Set(s)</a></span></div>
                                                                    </div>
                                                                    <div className="search-result-column-block" style={{ width: "200px", fontSize:'14px' }} data-field="track_and_facet_info.experiment_type" data-column-even="true">
                                                                        <div className="inner"><span className="value text-center"><i className="icon icon-fw icon-user far user-icon" data-html="true" data-tip="<small>Submitted by</small> 4dn DCIC"></i> <a href="/labs/4dn-dcic-lab/">4DN DCIC, HMS</a></span></div>
                                                                    </div>
                                                                </div>
                                                                <div className="result-table-detail-container detail-closed">
                                                                    <div></div>
                                                                </div>
                                                            </div>
                                                            <div style={{ width: "100%", height: "0px;" }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="button" className="btn btn-primary mt-1 float-right" style={{ width: '35%', fontSize: '1.1rem', borderWidth: '0px', borderRadius: '10px', backgroundColor: '#D5E9EB', color: '#34646C' }}>
                                {/* <i className="mr-05 icon icon-fw icon-check-square far"></i><span className="d-none d-md-inline text-400">Select </span>
                                    <span className="text-600">All</span> */}
                                <span className="float-left">Browse All Experiment Sets</span>
                                <span className="float-right"><i className="icon icon-arrow-right fas"></i></span>
                            </button>
                        </div>
                        <div className="col-12 col-md-4 social-connections-column">
                            <h2 className="homepage-section-title new-design">
                                <span>Tweets</span>
                                <a href="https://help.twitter.com/en/twitter-for-websites-ads-info-and-privacy" target="_blank"
                                    rel="noopener noreferrer" className="right privacy-ext">
                                    <i className="icon icon-fw icon-info-circle fas" data-tip="Cookie & Privacy Information for Twitter" />
                                </a>
                            </h2>
                            <div className="twitter-timeline-container">
                                {twitterTimelineEmbed}
                            </div>
                        </div>
                    </div>
                    <div className="row mt-6 mb-3">
                        <h2 className="homepage-section-title new-design text-center w-100 mb-0" style={{ borderBottom: 'none', fontSize: '28px' }}>Explore Our Tools and Resources for Data Visualization &amp; Analysis</h2>
                        <span className="icon-wrapper w-100 mt-2"><i className="icon icon-tools fas" style={{ fontSize: '2.5rem', opacity: '0.5', color: '#D7EAEE' }}></i></span>
                    </div>
                    <div className="row pl-2 pr-2 pt-4 pb-4" style={{ backgroundColor: '#F5FBF5' }}>
                        <div className="col-12 col-md-8">
                            <div className="row mh-100 h-100">
                                <div className="col-12 col-md-4 pr-8">
                                    <div className="mh-100 h-100 p-2 d-flex flex-column" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
                                        <div className="mt-3 text-center w-100"><i className="icon icon-lock fas" style={{ fontSize: '4rem', opacity: '0.5', color: '#D7EAEE' }}></i></div>
                                        <div className="mt-8 pl-2"><span style={{ fontSize: '1.6rem', fontWeight: '600', color: '#34646C' }}>HiGlass</span></div>
                                        <div className="flex-grow-1 mt-1 pl-2 pr-2" style={{ color: '#34646C', fontSize: '1.2rem', lineHeight: '1.3', fontWeight: '200', borderRadius: '0 0 8px 8px' }}>Use the 4DN visualization workspace to browse data</div>
                                        <button type="button" className="btn btn-primary w-100 mt-1 mb-1" style={{ fontSize: '1.1rem', borderWidth: '0px', borderRadius: '10px', backgroundColor: '#ECF8EC', color: '#34646C' }}>
                                            <span className="float-left">Learn More</span>
                                            <span className="float-right"><i className="icon icon-arrow-right fas"></i></span>
                                        </button>
                                    </div>
                                </div>
                                <div className="col-12 col-md-4 pr-8">
                                    <div className="mh-100 h-100 p-2 d-flex flex-column" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
                                        <div className="mt-3 text-center w-100"><i className="icon icon-lock fas" style={{ fontSize: '4rem', opacity: '0.5', color: '#D7EAEE' }}></i></div>
                                        <div className="mt-8 pl-2"><span style={{ fontSize: '1.6rem', fontWeight: '600', color: '#34646C' }}>JupyterHub</span></div>
                                        <div className="flex-grow-1 mt-1 pl-2 pr-2" style={{ color: '#34646C', fontSize: '1.2rem', lineHeight: '1.3', fontWeight: '200', borderRadius: '0 0 8px 8px' }}>Explore data in the cloud using python and the 4DN jupyter hub</div>
                                        <button type="button" className="btn btn-primary w-100 mt-1 mb-1" style={{ fontSize: '1.1rem', borderWidth: '0px', borderRadius: '10px', backgroundColor: '#ECF8EC', color: '#34646C' }}>
                                            <span className="float-left">Learn More</span>
                                            <span className="float-right"><i className="icon icon-arrow-right fas"></i></span>
                                        </button>
                                    </div>
                                </div>
                                <div className="col-12 col-md-4 pr-8">
                                    <div className="mh-100 h-100 p-2 d-flex flex-column" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
                                        <div className="mt-3 text-center w-100"><i className="icon icon-lock fas" style={{ fontSize: '4rem', opacity: '0.5', color: '#D7EAEE' }}></i></div>
                                        <div className="mt-8 pl-2"><span style={{ fontSize: '1.6rem', fontWeight: '600', color: '#34646C' }}>MicroMeta</span></div>
                                        <div className="flex-grow-1 mt-1 pl-2 pr-2" style={{ color: '#34646C', fontSize: '1.2rem', lineHeight: '1.3', fontWeight: '200', borderRadius: '0 0 8px 8px' }}>Enter and access microscope metadata with Micrometa</div>
                                        <button type="button" className="btn btn-primary w-100 mt-1 mb-1" style={{ fontSize: '1.1rem', borderWidth: '0px', borderRadius: '10px', backgroundColor: '#ECF8EC', color: '#34646C' }}>
                                            <span className="float-left">Learn More</span>
                                            <span className="float-right"><i className="icon icon-arrow-right fas"></i></span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-md-4 pl-8">
                            <div className="p-3" style={{ backgroundColor: '#CCE9CE', color: '#0D4129', borderRadius: '10px' }}>
                                <h2 className="homepage-section-title new-design" style={{ color: '#0D4129' }}>Portal Resources</h2>
                                <div className="p-3 d-flex flex-column" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
                                    <div className="row">
                                        <div className="col-3 text-center">
                                            <div className="mt-2"><i className="icon icon-database fas" style={{ fontSize: '3rem', opacity: '0.8', color: '#E5F4E5' }}></i></div>
                                        </div>
                                        <div className="col-9">
                                            <div className="mt-1"><span style={{ fontSize: '1.4rem', fontWeight: '500', color: '#34646C' }}>Experimental Resources</span></div>
                                            <div className="flex-grow-1 mt-1" style={{ color: '#6C886E', fontSize: '1.1rem', lineHeight: '1.2', fontWeight: '200' }}>View Protocols, Cell Lines, Assays &amp; File Formats</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 d-flex flex-column mt-1" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
                                    <div className="row">
                                        <div className="col-3 text-center">
                                            <div className="mt-2"><i className="icon icon-project-diagram fas" style={{ fontSize: '3rem', opacity: '0.8', color: '#E5F4E5' }}></i></div>
                                        </div>
                                        <div className="col-9">
                                            <div className="mt-1"><span style={{ fontSize: '1.4rem', fontWeight: '500', color: '#34646C' }}>Data Analysis</span></div>
                                            <div className="flex-grow-1 mt-1" style={{ color: '#6C886E', fontSize: '1.1rem', lineHeight: '1.2', fontWeight: '200' }}>Learn about our standardized bioinformatic analysis pipelines</div>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" className="btn btn-primary w-100 mt-1" style={{ fontSize: '1.1rem', borderWidth: '0px', borderRadius: '10px', backgroundColor: '#ECF8EC', color: '#34646C' }}>
                                    {/* <i className="mr-05 icon icon-fw icon-check-square far"></i><span className="d-none d-md-inline text-400">Select </span>
                                    <span className="text-600">All</span> */}
                                    <span className="float-left">View All Available Resources</span>
                                    <span className="float-right"><i className="icon icon-arrow-right fas"></i></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-3 p-3" style={{ backgroundColor: '#EFF7F8', borderRadius: '16px' }}>
                        <div className="col-12 p-5" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px' }}>
                            <h2 className="homepage-section-title new-design text-center" style={{ borderBottom: 'none', fontSize: '3rem' }}>The 4DN Mission</h2>
                            <div style={{ width: '80%', margin: '0 auto', fontSize: '2rem', textAlign: 'center', lineHeight: '1.2', fontWeight: '100' }}>
                                The 4D Nucleome Data Portal hosts data generated by the 4DN Network and other reference nucleomics data sets, and an expanding tool set for open data processing and visualization.
                            </div>
                        </div>
                    </div>

                    <div className="row mt-3">
                        <div className="col-12 col-md-7 px-5 py-3" style={{ backgroundColor: '#F5FBF5', borderRadius: '10px', borderWidth: '3px', borderColor: '#99C79C', borderStyle: 'solid', color: '#0D4129' }}>
                            <h2 className="homepage-section-title new-design" style={{ borderBottom: 'none', color: '#0D4129', marginBottom: '5px' }}>Data Use Guidelines</h2>
                            <p>The data at the 4DN Data Portal is generated by the 4DN Network and made freely available to the scientific community.</p>
                            <ul>
                                <li>For unpublished data that you are intending to use for a publication, we ask that you please contact the data generating lab to discuss possible coordinated publication. In your manuscript, please cite <a href="https://doi.org/10.1038/nature23884">the 4DN White Paper (doi:10.1038/nature23884)</a>, and please acknowledge the 4DN lab which generated the data.</li>
                                <li>For published data please cite the relevant publication.</li>
                            </ul>
                            <p>Please direct any questions to the Data Coordination and
                                Intregration Center at <a href="mailto:support@4dnucleome.org">support@4dnucleome.org</a>.
                            </p>
                        </div>
                        <div className="col-12 col-md-4 offset-md-1 pt-3">
                            <h2 className="homepage-section-title new-design">4DN Help</h2>
                            <button type="button" style={{ fontSize: '1.5rem', borderWidth: '0px', borderRadius: '10px', backgroundColor: '#EFF7F8', color: '#34646C', fontWeight: '400' }} className="btn btn-primary w-100 mt-2 p-1">
                                <span style={{ fontSize: '2.5rem' }} className="float-left ml-1 mt-05">
                                    <i className="icon icon-user-circle fas"></i>
                                </span>
                                <span className="float-left ml-2 mt-15">User Guide</span>
                                <span className="float-right mr-2 mt-15">
                                    <i className="icon icon-arrow-right fas" style={{ opacity: '0.3' }}></i>
                                </span>
                            </button>
                            <button type="button" style={{ fontSize: '1.5rem', borderWidth: '0px', borderRadius: '10px', backgroundColor: '#EFF7F8', color: '#34646C', fontWeight: '400' }} className="btn btn-primary w-100 mt-2 p-1">
                                <span style={{ fontSize: '2.5rem' }} className="float-left ml-1 mt-05">
                                    <i className="icon icon-file-import fas"></i>
                                </span>
                                <span className="float-left ml-2 mt-15">Submitter Guide</span>
                                <span className="float-right mr-2 mt-15">
                                    <i className="icon icon-arrow-right fas" style={{ opacity: '0.3' }}></i>
                                </span>
                            </button>
                            <button type="button" style={{ fontSize: '1.5rem', borderWidth: '0px', borderRadius: '10px', backgroundColor: '#EFF7F8', color: '#34646C', fontWeight: '400' }} className="btn btn-primary w-100 mt-2 p-1">
                                <span style={{ fontSize: '2.5rem' }} className="float-left ml-1 mt-05">
                                    <i className="icon icon-envelope fas"></i>
                                </span>
                                <span className="float-left ml-2 mt-15">Contact Us</span>
                                <span className="float-right mr-2 mt-15">
                                    <i className="icon icon-arrow-right fas" style={{ opacity: '0.3' }}></i>
                                </span>
                            </button>
                        </div>
                    </div>

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

const ExternalLinksRow = React.memo(function LinksRow(props){
    return (
        <div className="homepage-links-row external-links">
            <div className="links-wrapper row">
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