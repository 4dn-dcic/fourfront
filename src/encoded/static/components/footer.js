'use strict';

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Page footer which is visible on each page.
 * 
 * @module {Component} footer
 * @prop {string} version - App version number
 */
export default class Footer extends React.Component {

    static propTypes = {
        version: PropTypes.string // App version number
    }

    render() {
        return (
            <footer id="page-footer">
                <div className="page-footer">
                    <div className="container">
                        <div className="row">

                            <div className="col-md-6 hidden-sm">
                                <div className="footer-section copy-notice">
                                    <a href="http://dcic.4dnucleome.org" target="_blank" className="text-400">
                                        4D Nucleome Data Coordination and Integration Center
                                    </a>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="footer-section text-500">
                                    <a href="http://www.harvard.edu/" target="_blank">Harvard University</a>
                                    <span> &nbsp;|&nbsp; </span>
                                    <a href="http://www.mit.edu/" target="_blank">Massachusetts Institute of Technology</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        );
    }
}
