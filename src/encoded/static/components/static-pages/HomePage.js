'use strict';

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';

import { FourfrontLogo } from './../viz/FourfrontLogo';
import { console, ajax, layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

import { navigate } from './../util';
import { pageTitleViews, PageTitleContainer, TitleAndSubtitleUnder, StaticPageBreadcrumbs } from './../PageTitle';


/**
 * Homepage View component. Gets rendered at '/' and '/home' paths.
 *
 * @module {Component} static-pages/home
 * @prop {Object} context - Should have properties typically needed for any static page.
 */
export default class HomePage extends React.PureComponent {

    static propTypes = {
        "context": PropTypes.object.isRequired,
        "session": PropTypes.bool.isRequired
    };

    /**
     * The render function. Renders homepage contents.
     * @returns {Element} A React <div> element.
     */
    render() {
        const { windowWidth, context, session } = this.props;

        return (
            <div className="homepage-wrapper">

                <div className="home-content-area">

                    <CollectionsRow />
                    <DatasetsAndSocialMediaRow {...{ windowWidth }} />
                    <ToolsAndResourcesRow />
                    <FourDNMissonRow />
                    <HelpRow />
                    <ExternalLinksRow />
                </div>

            </div>
        );
    }
}



const CollectionsRow = React.memo(function CollectionsRow(props) {
    return (
        <div className="browse-data-collection-fullwidth-container mt-6 mb-6 ">
            <div className="container">
                <div className="browse-data-collection-container row pt-3 pb-3 p-3">
                    <div className="browse-data-collection-col-browse col-12 col-md-7">
                        <div className="row">
                            <div className="col-12">
                                <div className="row">
                                    <div className="col-12 col-md-6 text-center">
                                        <div className="browse-data-collection-block browse-all-data h-100 p-0">
                                            <a href="/browse/?experimentset_type=replicate&type=ExperimentSetReplicate" className="h-100 d-flex flex-column text-decoration-none">
                                                <div className="mt-2"><i className="icon icon-database fas"></i></div>
                                                <div className="browse-data-collection-block-title flex-grow-1 mt-2">Browse All Data</div>
                                                <div className="browse-data-collection-block-desc mt-2 pt-2 pb-2 pl-4 pr-4">
                                                    Search all Experiment Sets<br /> in the 4D Nucleome Database
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6 text-center">
                                        <div className="browse-data-collection-block browse-by-publication h-100 p-0">
                                            <a href="/search/?type=Publication&sort=static_content.location&sort=-number_of_experiment_sets&number_of_experiment_sets.from=1" className="h-100 d-flex flex-column text-decoration-none">
                                                <div className="mt-2"><i className="icon icon-book-open fas"></i></div>
                                                <div className="browse-data-collection-block-title flex-grow-1 mt-2">Browse By Publication</div>
                                                <div className="browse-data-collection-block-desc mt-2 pt-2 pb-2 pl-4 pr-4">
                                                    View Publications<br /> in the 4D Nucleome Database
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="browse-data-collection-col-collections col-12 col-md-5 pl-lg-5 d-flex flex-column">
                        <div className="flex-grow-1 mt-1">
                            <h2 className="homepage-section-title">4DN Data Collections</h2>
                            <a href="/hic-data-overview" className="btn btn-primary w-100">
                                Hi-C Datasets
                            </a>
                            <a href="/microscopy-data-overview" className="btn btn-primary w-100 mt-05">
                                All Microscopy Datasets
                            </a>
                            <a href="/resources/data-collections/chromatin-tracing-datasets" className="btn btn-primary w-100 mt-05">
                                Chromatin Tracing Datasets
                            </a>
                            <a href="/resources/data-collections" className="btn-all-data-collections btn btn-primary w-100 mt-1">
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

const DatasetsAndSocialMediaRow = React.memo(function DatasetsAndSocialMediaRow({ windowWidth }) {
    return (
        <div className="datasets-and-social-connections-container container">
            <div className="row pl-2 pr-2 mt-8">
                <div className="datasets-and-social-connections-col-datasets col-12 col-lg-8 pr-lg-4">
                    <h2 className="homepage-section-title">Recently Released Datasets</h2>
                    <div className="recently-released-datasets-container">
                        <RecentlyReleasedDataSets {...{ windowWidth, showAll: true }} />
                    </div>
                </div>
                <div className="datasets-and-social-connections-col-social col-12 col-lg-4 mt-3 p-0">
                    <div className="social-connections-container ml-0 mr-0">
                        <div className="d-flex flex-column h-100">
                            <div className="p-0 flex-grow-1">
                                <a href="https://doi.org/10.1038/s41467-022-29697-4" target="_blank" rel="noreferrer" className="h-100 text-decoration-none">
                                    <div className="text-center w-100 pt-2 pb-2 social-connections-image"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-4dn-nature-communications.png" alt="4DN Paper on Nature Communications" /></div>
                                    <div className="social-connections-block-title mt-15">4DN Data Portal Paper</div>
                                    <div className="social-connections-desc mt-1">Learn more about the 4DN data portal on the<br/>Nature Communications website</div>
                                </a>
                            </div>
                            <div className="mt-05">
                                <a href="https://doi.org/10.1038/s41467-022-29697-4" target="_blank" rel="noreferrer" className="btn-nature-4dn-article btn btn-primary w-100 mt-1">
                                    <span className="float-left ml-1">Go to Nature Communications</span><span className="float-right mr-1"><i className="icon icon-arrow-right fas"></i></span>
                                </a>
                            </div>
                            <div>
                                <a href="https://twitter.com/4dn_dcic" target="_blank" rel="noreferrer" className="btn-follow-on-social-media btn btn-primary w-100 mt-1">
                                    <span className="float-left ml-1">Follow 4DN Data Portal on X</span><span className="float-right mr-1"><i className="icon icon-arrow-right fas"></i></span>
                                </a>
                            </div>
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
            'loading': false
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

    getHeaders(isMobile) {
        if (!isMobile) {
            return (
                <div className="columns clearfix left-0">
                    <div className="search-headers-column-block" data-col="dataset">
                        <div className="inner">
                            <div className="column-title"><span data-html="true">Dataset</span></div>
                        </div>
                    </div>
                    <div className="search-headers-column-block" data-col="expset_count">
                        <div className="inner">
                            <div className="column-title"><span data-html="true"># of Experiment Sets</span></div>
                        </div>
                    </div>
                    <div className="search-headers-column-block" data-col="lab">
                        <div className="inner">
                            <div className="column-title"><span data-html="true">Lab</span></div>
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="columns clearfix left-0">
                    <div className="search-headers-column-block w-100">
                        <div className="inner">
                            <div className="column-title"><span data-html="true">Dataset</span></div>
                        </div>
                    </div>
                </div>
            );
        }
    }

    getRows(datasets, isMobile){
        if(!isMobile){
            return (
                <div className="search-result-rows-container">
                    {
                        _.map(datasets, function (item, datasetName) {

                            const searchUrl = "/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&dataset_label=" + encodeURIComponent(datasetName);
                            const { public_release, experiment_sets, labs: propLabs = [] } = item;
                            let labs = null;
                            if (propLabs.length === 1) {
                                const [lab] = propLabs;
                                const labUrl = '/labs/' + encodeURIComponent(lab);
                                labs = (
                                    <React.Fragment>
                                        <i className="icon icon-fw icon-user far user-icon" data-html="true" data-tip={"Submitted by " + lab}></i> {lab ? (<a href={labUrl} data-tip={"Submitted by " + lab}>{lab}</a>) : '-'}
                                    </React.Fragment>);
                            } else if (propLabs.length > 1) {
                                labs = (
                                    <ul className="mb-0 mt-01 list-inline">
                                        {
                                            propLabs.map(function (lab, index) {
                                                const labUrl = '/labs/' + encodeURIComponent(lab);
                                                return (
                                                    <li key={"lab-" + index}>
                                                        <i className="icon icon-fw icon-user far user-icon" data-html="true" data-tip={"Submitted by " + lab}></i> {lab ? (<a href={labUrl} data-tip={"Submitted by " + lab}>{lab}</a>) : '-'}
                                                    </li>
                                                );
                                            })
                                        }
                                    </ul>
                                );
                            }

                            return (
                                <div className="search-result-row" key={"dataset-" + datasetName}>
                                    <div className="columns clearfix result-table-row">
                                        <div className="search-result-column-block" data-col="dataset">
                                            <div className="inner">
                                                <div className="title-block text-truncate" data-tip={datasetName}>{datasetName}</div>
                                            </div>
                                        </div>
                                        <div className="search-result-column-block" data-col="expset_count" data-exp-set-count={experiment_sets || 0}>
                                            <div className="inner text-center">
                                                <span className="value text-truncate">
                                                    <a href={searchUrl} data-tip={"Released on " + public_release}>{experiment_sets || '-'} Experiment Sets</a>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="search-result-column-block" data-col="lab">
                                            <div className="inner">
                                                <span className="value text-left">{labs}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            );
        } else {
            return (
                <div className="search-result-rows-container">
                    {
                        _.map(datasets, function (item, datasetName) {

                            const { public_release, experiment_sets, labs: propLabs = [] } = item;
                            const searchUrl = "/browse/?experimentset_type=replicate&type=ExperimentSetReplicate&dataset_label=" + encodeURIComponent(datasetName);
                            const labs = propLabs && propLabs.length > 0 ? _.compact(_.pluck(propLabs, 'display_title')).join(", ") : null;

                            return (
                                <div className="search-result-row w-100">
                                    <div className="columns clearfix result-table-row">
                                        <div className="search-result-column-block w-100" style={{ fontSize: '16px' }}>
                                            <div className="inner">
                                                <div className="title-block text-truncate">
                                                    <a href={searchUrl} data-tip={datasetName + " (released on " + public_release + ")"}>{datasetName}</a>
                                                </div>
                                            </div>
                                            <div className="inner" style={{ fontSize: '13px', height: '30px' }}>
                                                <span className="value text-truncate">
                                                    {experiment_sets || '-'} Exp. Sets{labs ? ' by ' + labs : null}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            );
        }
    }

    render() {
        const { showAll, windowWidth } = this.props;
        const { mounted, loading, datasets } = this.state;

        if (!mounted) {
            return null;
        }
        if (loading) {
            return (
                <div className="text-center search-result-loading">
                    <i className="icon icon-fw fas icon-spin icon-circle-notch" />
                </div>
            );
        }

        const gridState = layout.responsiveGridState(windowWidth);
        const isMobileSize = gridState && ['xs', 'sm'].indexOf(gridState) > -1;

        const colHeaders = this.getHeaders(isMobileSize);
        const rows = this.getRows(datasets, isMobileSize);

        return (
            <React.Fragment>
                <div className="embedded-search-view-outer-container">
                    <div className="embedded-search-container">
                        <div className="row search-view-controls-and-results">
                            <div className="col-12">
                                <div className="search-results-outer-container is-within-page">
                                    <div className="search-results-container">
                                        <div className="search-headers-row">
                                            <div className="headers-columns-overflow-container">
                                                {colHeaders}
                                            </div>
                                        </div>
                                        {rows}
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
            <div className="tools-and-resources-container-title row mt-8 mb-3">
                <h2 className="homepage-section-title text-center w-100 mb-0">Explore Our Tools and Resources for Data Visualization &amp; Analysis</h2>
                <span className="icon-wrapper w-100 mt-1"><i className="icon icon-tools fas"></i></span>
            </div>
            <div className="tools-and-resources-fullwidth-container">
                <div className="container">
                    <div className="tools-and-resources-container-inner row pl-2 pr-2 pt-4 pb-4 ">
                        <div className="tools-and-resources-col-tools col-12 col-lg-8 ">
                            <div className="row mh-100 h-100 mr-lg-1">
                                <div className="tool-detail-col col-12 col-md-4 px-0 px-md-1 px-lg-2">
                                    <a href="/tools/visualization" className="h-100 p-2 d-flex flex-column tool-detail text-decoration-none">
                                        <div className="text-center w-100 tool-image"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-tools-4dn-higlass.jpg" alt="HiGlass" /></div>
                                        <div className="mt-1 w-100 tool-logo"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-4dn-higlass-logo.png" alt="HiGlass logo" /></div>
                                        <div className="mt-1 pl-1 tool-detail-title">HiGlass</div>
                                        <div className="flex-grow-1 mt-1 pl-1 tool-detail-description">Use the 4DN visualization workspace to browse data</div>
                                        <div className="btn btn-primary w-100 mt-1 mb-05">
                                            <span className="float-left pl-2">Learn More</span>
                                            <span className="float-right pr-2"><i className="icon icon-arrow-right fas"></i></span>
                                        </div>
                                    </a>
                                </div>
                                <div className="tool-detail-col col-12 col-md-4 px-0 px-md-1 px-lg-2">
                                    <a href="/tools/jupyterhub" className="h-100 p-2 d-flex flex-column tool-detail text-decoration-none">
                                        <div className="text-center w-100 tool-image"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-tools-4dn-jupyter.jpg" alt="4DN Jupyter Hub" /></div>
                                        <div className="mt-1 w-100 tool-logo"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-4dn-jupyter-logo.png" alt="4DN Jupyter Hub logo" /></div>
                                        <div className="mt-1 pl-1 tool-detail-title">JupyterHub</div>
                                        <div className="flex-grow-1 mt-1 pl-1 tool-detail-description">Explore data in the cloud using python & the 4DN jupyter hub</div>
                                        <div className="btn btn-primary w-100 mt-1 mb-05">
                                            <span className="float-left pl-2">Learn More</span>
                                            <span className="float-right pr-2"><i className="icon icon-arrow-right fas"></i></span>
                                        </div>
                                    </a>
                                </div>
                                <div className="tool-detail-col col-12 col-md-4 px-0 px-md-1 px-lg-2">
                                    <a href="/tools/micro-meta-app" className="h-100 p-2 d-flex flex-column tool-detail text-decoration-none">
                                        <div className="text-center w-100 tool-image"><img src="https://4dn-dcic-public.s3.amazonaws.com/static-pages/home-tools-4dn-micrometa.jpg" alt="Micro Meta App" /></div>
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
                        <div className="tools-and-resources-col-resources col-12 col-lg-4 pl-8 p-3 mt-sm-3 mt-lg-0">
                            <h2 className="homepage-section-title">Portal Resources</h2>
                            <div className="resource-detail p-3 d-flex flex-column">
                                <a href="/resources/experimental-resources" className="text-decoration-none">
                                    <div className="row">
                                        <div className="col-3 text-center">
                                            <div className="mt-1"><i className="icon icon-flask fas"></i></div>
                                        </div>
                                        <div className="col-9">
                                            <div className="resource-detail-title mt-1">Experimental Resources</div>
                                            <div className="resource-detail-description flex-grow-1 mt-1">View Protocols, Cell Lines, Assays &amp; File Formats</div>
                                        </div>
                                    </div>
                                </a>
                            </div>
                            <div className="resource-detail data-analysis p-3 d-flex flex-column mt-1">
                                <a href="/resources/data-analysis" className="text-decoration-none">
                                    <div className="row">
                                        <div className="col-3 text-center">
                                            <div className="mt-1"><i className="icon icon-project-diagram fas"></i></div>
                                        </div>
                                        <div className="col-9">
                                            <div className="resource-detail-title mt-1">Data Analysis</div>
                                            <div className="resource-detail-description flex-grow-1 mt-1">Learn about our standardized bioinformatic analysis pipelines</div>
                                        </div>
                                    </div>
                                </a>
                            </div>
                            <a href="/resources" className="resource-all btn btn-primary w-100 mt-1">
                                <span className="float-left ml-1">View All Available Resources</span>
                                <span className="float-right pr-2"><i className="icon icon-arrow-right fas"></i></span>
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
        <div className="fourdn-mission-container container mt-8 mb-8 p-3">
            <div className="row mx-0">
                <div className="fourdn-mission-content col-12 p-4">
                    <h2 className="homepage-section-title text-center"><FourfrontLogo id="mission_fourfront_logo_svg" prefix="The" title="Mission" /></h2>
                    <div className="fourdn-mission-text">
                        The 4D Nucleome (4DN) Network aims to understand the principles underlying nuclear organization. The 4D Nucleome Data Portal hosts data generated by 4DN and other reference nucleomics data sets, and an expanding tool set for open data processing and visualization.
                    </div>
                </div>
            </div>
        </div>
    );
});

const HelpRow = React.memo(function HelpRow(props) {
    return (
        <div className="guidelines-and-help-container container">
            <div className="row mt-3 pl-2 pr-2">
                <div className="guidelines-and-help-col-guidelines col-12 col-lg-7 px-4 pt-2">
                    <h2 className="homepage-section-title">Data Use Guidelines</h2>
                    <p>The data at the 4DN Data Portal is generated by the 4DN Network and made freely available to the scientific community.</p>
                    <ul>
                        <li>If you are intending to use these data for a publication, we ask that you please contact the data generating lab to discuss possible coordinated publication.</li>
                        <li>In your manuscript, please cite <a href="https://doi.org/10.1038/nature23884" target="_blank" rel="noopener noreferrer"> the 4DN White Paper (doi:10.1038/nature23884) </a>
                            and <a href="https://doi.org/10.1038/s41467-022-29697-4" target="_blank" rel="noopener noreferrer">the 4DN Data Portal Paper (doi:10.1038/s41467-022-29697-4)</a>, and please acknowledge the 4DN lab which generated the data.
                        </li>
                    </ul>
                    <p>Please direct any questions to the <a href="mailto:support@4dnucleome.org">Data Coordination and Integration Center</a>.
                    </p>
                </div>
                <div className="guidelines-and-help-col-help col-12 col-lg-5 pt-3 d-flex flex-column">
                    <div className="flex-grow-1">
                        <h2 className="homepage-section-title">4DN Help</h2>
                        <a href="/help/user-guide" className="btn-4dn-help btn btn-primary w-100 px-2 py-1">
                            <span className="btn-4dn-help-icon float-left ml-2 mt-05 mb-05">
                                <i className="icon icon-user fas"></i>
                            </span>
                            <span className="help-button-text float-left ml-2 mt-13">User Guide</span>
                            <span className="btn-4dn-help-arrow float-right mr-2 mt-13">
                                <i className="icon icon-arrow-right fas"></i>
                            </span>
                        </a>
                        <a href="/help/submitter-guide" className="btn-4dn-help btn btn-primary w-100 mt-1 px-2 py-1">
                            <span className="float-left ml-2 mt-05 mb-05 btn-4dn-help-icon">
                                <i className="icon icon-file-import fas"></i>
                            </span>
                            <span className="help-button-text float-left ml-2 mt-13">Submitter Guide</span>
                            <span className="btn-4dn-help-arrow float-right mr-2 mt-13">
                                <i className="icon icon-arrow-right fas"></i>
                            </span>
                        </a>
                        <a href="/help/about/contact-us" className="btn btn-primary w-100 mt-1 px-2 py-1 btn-4dn-help">
                            <span className="btn-4dn-help-icon float-left ml-2 mt-05 mb-05">
                                <i className="icon icon-envelope fas"></i>
                            </span>
                            <span className="help-button-text float-left ml-2 mt-13">Contact Us</span>
                            <span className="btn-4dn-help-arrow float-right mr-2 mt-13 ">
                                <i className="icon icon-arrow-right fas"></i>
                            </span>
                        </a>
                        <a href="https://www.nature.com/articles/s41467-022-29697-4" target="_blank" rel="noopener noreferrer" className="btn btn-primary w-100 mt-1 px-2 py-1 btn-4dn-help">
                            <span className="btn-4dn-help-icon float-left ml-2 mt-05 mb-05">
                                <i className="icon icon-book-open fas"></i>
                            </span>
                            <span className="help-button-text float-left ml-2 mt-13">4DN Data Portal Paper</span>
                            <span className="btn-4dn-help-arrow float-right mr-2 mt-13">
                                <i className="icon icon-arrow-right fas"></i>
                            </span>
                        </a>
                    </div>
                </div>
            </div>
        </div> 
    );
});

const ExternalLinksRow = React.memo(function LinksRow(props){
    return (
        <div className="container mt-8">
            <h3 className="homepage-section-title text-500">External Links</h3>
            <div className="homepage-links-row external-links">
                <div className="links-wrapper row mb-2">
                    <div className="col-12 col-md-3">
                        <a className="link-block external-link" href="https://www.4dnucleome.org/" target="_blank" rel="noopener noreferrer">
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