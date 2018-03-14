'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, layout } from'./../util';
import { Collapse } from 'react-bootstrap';
import * as store from '../../store';
import * as globals from './../globals';
import { Announcements } from './components';


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
                        <Announcements loaded session={this.props.session} />
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
