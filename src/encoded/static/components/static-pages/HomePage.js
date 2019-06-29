'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, navigate, ajax } from'./../util';
import { requestAnimationFrame } from './../viz/utilities';
import { Collapse, Button } from 'react-bootstrap';
import { Announcements, BasicStaticSectionBody } from './components';


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
                    <div className="col-xs-12 col-sm-6 col-md-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2" href="/search/?type=Case&currentAction=add">New Case</a>
                    </div>
                    <div className="col-xs-12 col-sm-6 col-md-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2" href="/search/?type=Case&currentAction=add" disabled >Pipeline Admin</a>
                    </div>
                    <div className="col-xs-12 col-sm-6 col-md-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2" href="/search/?type=Case&currentAction=add" disabled>Quality Controls</a>
                    </div>
                    <div className="col-xs-12 col-sm-6 col-md-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2" href="/search/?type=Case&currentAction=add" disabled>Curation</a>
                    </div>
                    <div className="col-xs-12 col-sm-6 col-md-4">
                        <a className="btn btn-primary btn-block btn-lg mb-2" href="/search/?type=Case&currentAction=add" disabled>Crowdsourcing</a>
                    </div>
                    <div className="col-xs-12 col-sm-6 col-md-4">
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
            <div className="row mt-5">
                <div className="col-12 col-xs-12">
                    <h2 className="homepage-section-title">Recent Cases</h2>
                </div>
                <div className="col col-xs-12 col-sm-4 col-md-3 hidden-xs">
                    <a href="/search/?type=Case" className="btn btn-lg btn-primary btn-block">View All</a>
                </div>
                <div className="col col-xs-12 col-sm-8 col-md-9">
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
