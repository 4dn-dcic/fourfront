'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

import { console, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { pageTitleViews, PageTitleContainer, TitleAndSubtitleUnder, OnlyTitle } from './../PageTitleSection';


/**
 * Homepage View component. Gets rendered at '/' and '/home' paths.
 *
 * @module {Component} static-pages/home
 * @prop {Object} context - Should have properties typically needed for any static page.
 */
export default class HomePage extends React.PureComponent {

    /**
     * The render function. Renders homepage contents.
     * @returns {Element} A React <div> element.
     */
    render() {
        const { session, context } = this.props;
        return (
            <div className="homepage-wrapper">

                <div className="container home-content-area" id="content">

                    { session ? <MyDashboard /> : <GuestHomeView /> }

                    <div className="row mt-3">
                        <div className="col-xs-12 col-md-5 pull-right">
                            <LinksColumn {..._.pick(this.props, 'windowWidth')} />
                        </div>
                    </div>

                </div>

            </div>
        );
    }

}



const MyDashboard = React.memo(function MyDashboard(props){
    return (
        <React.Fragment>
            <div className="mt-4 homepage-dashboard">
                <h2 className="homepage-section-title">Actions</h2>
                <div className="row">
                    <div className="col-xs-12 col-md-6 col-lg-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2" href="/search/?type=Case&currentAction=add">New Case</a>
                    </div>
                    <div className="col-xs-12 col-md-6 col-lg-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2 disabled" href="#" >Pipeline Admin</a>
                    </div>
                    <div className="col-xs-12 col-md-6 col-lg-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2 disabled" href="#">Quality Controls</a>
                    </div>
                    <div className="col-xs-12 col-md-6 col-lg-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2 disabled" href="#">Curation</a>
                    </div>
                    <div className="col-xs-12 col-md-6 col-lg-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2 disabled" href="#">Crowdsourcing</a>
                    </div>
                    <div className="col-xs-12 col-md-6 col-lg-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2" href="/search/?type=Item">Clinical Reports</a>
                    </div>

                </div>
            </div>
            <RecentCasesSection/>

        </React.Fragment>
    );
});



const GuestHomeView = React.memo(function GuestHomeView(props){
    return (
        <React.Fragment>
            <div className="row mt-5">
                <div className="col-xs-12 col-md-12">
                    <h2 className="homepage-section-title">Marketing Stuff Here (maybe)</h2>
                    <h4 className="text-500">(maybe) Publicly-viewable cases as entrance to crowdsourcing UI/UX</h4>
                    <p>

                    </p>
                </div>
            </div>
        </React.Fragment>
    );
});



class RecentCasesSection extends React.PureComponent { // Is PureComponent so can do AJAX request for cases later. Maybe.
    render(){
        return (
            <React.Fragment>
                <h2 className="homepage-section-title mt-5">Recent Cases</h2>
                <div className="row">
                    <div className="col-12 col-md-4 col-xl-3 hidden-xs">
                        <a href="/search/?type=Case" className="btn btn-lg btn-primary btn-block">View All</a>
                    </div>
                    <div className="col-12 col-md-8 col-xl-9">
                        <p>
                            <b>(TODO) Visible cases sorted by date-modified be here</b><br/>
                            Per-role content or something else could go here also, such as searchview of recent
                            cases or individuals if are clinician; new pipelines if are pipeline admin, etc.
                            <br/><br/>
                            (or per-role content can be above dashboard actions; final layout / location etc TBD)
                            <br/><br/>
                            <b>
                            This could also be visible for public visitors as an entrance to a crowdsourcing UI/UX
                            Or be daily cat facts here.
                            </b>
                        </p>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}



const ExternalLinksColumn = React.memo(function ExternalLinksColumn(props){
    return (
        <div className="homepage-links-column external-links">
            {/* <h3 className="text-300 mb-2 mt-3">External Links</h3> */}
            <h4 className="text-400 mb-15 mt-25">External Links</h4>
            ( layout & location not final / TBD )
            <div className="links-wrapper clearfix">
                <div className="link-block">
                    <a href="https://dbmi.hms.harvard.edu/" target="_blank" rel="noopener noreferrer" className="external-link">
                        <span>HMS DBMI</span>
                    </a>
                </div>
                <div className="link-block">
                    <a href="https://www.brighamandwomens.org/medicine/genetics/genetics-genomic-medicine-service" target="_blank" rel="noopener noreferrer" className="external-link">
                        <span>Brigham Genomic Medicine</span>
                    </a>
                </div>
                <div className="link-block">
                    <a href="https://undiagnosed.hms.harvard.edu/" target="_blank" rel="noopener noreferrer" className="external-link">
                        <span>Undiagnosed Diseased Network (UDN)</span>
                    </a>
                </div>
                <div className="link-block">
                    <a href="https://forome.org/" target="_blank" rel="noopener noreferrer" className="external-link">
                        <span>Forome</span>
                    </a>
                </div>
                <div className="link-block">
                    <a href="http://dcic.4dnucleome.org/" target="_blank" rel="noopener noreferrer" className="external-link">
                        <span>4DN DCIC</span>
                    </a>
                </div>
            </div>
            <br/>
        </div>
    );
});


const LinksColumn = React.memo(function LinksColumn(props){
    return (
        <div className="homepage-links">
            <ExternalLinksColumn />
        </div>
    );
});


const HomePageTitle = React.memo(function HomePageTitle(props){
    const { session, alerts } = props;

    if (session){
        return (
            <PageTitleContainer alerts={alerts}>
                <OnlyTitle>My Dashboard</OnlyTitle>
            </PageTitleContainer>
        );
    }

    return (
        <PageTitleContainer alerts={alerts}>
            <TitleAndSubtitleUnder subtitle="Clinical Genomics Analysis Platform" className="home-page-title">
                <strong>TODO:</strong> Portal Title Here
            </TitleAndSubtitleUnder>
        </PageTitleContainer>
    );
});


pageTitleViews.register(HomePageTitle, "HomePage");
