'use strict';

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Page footer which is visible on each page.
 * In future could maybe move into app.js since file is so small.
 * But it may get bigger in future also and include things such as privacy policy, about page links, copyright, and so forth.
 */
export class Footer extends React.Component {

    /**
     * @private
     * @returns {JSX.Element} A footer element with a couple of columns.
     */
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
