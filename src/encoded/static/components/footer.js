'use strict';
var React = require('react');

/**
 * Page footer which is visible on each page.
 * 
 * @module {Component} footer
 * @prop {string} version - App version number
 */
var Footer = React.createClass({

    propTypes: {
        version: React.PropTypes.string // App version number
    },

    render: function() {
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
});

module.exports = Footer;
