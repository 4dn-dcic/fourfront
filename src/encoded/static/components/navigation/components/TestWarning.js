'use strict';

import React from 'react';
import { console, isSelectAction, memoizedUrlParse, analytics } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

/**
 * Component which displays a banner at top of page informing users
 * about this portal containing test data.
 */
export class TestWarning extends React.PureComponent {

    constructor(props){
        super(props);
        this.handleClose = this.handleClose.bind(this);
    }

    handleClose(evt){
        const { setHidden } = this.props;
        evt.preventDefault();
        evt.stopPropagation();

        analytics.event("TestWarningBanner", "Accept");

        if (window && window.localStorage && window.localStorage.setItem) {
            window.localStorage.setItem("accepted_privacy_policy_disclaimer", "true");
        }

        if (typeof setHidden === 'function'){
            setHidden(evt);
        }
    }

    render(){
        const { visible } = this.props;
        if (!visible) return null;
        return (
            <div className="test-warning">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col text-container row align-items-center">
                            <div className="col-auto px-0">
                                <i className="icon icon-fw icon-eye far circle-icon d-none d-md-inline-block"/>
                            </div>
                            <div className="col">
                                We use cookies to track your portal usage.
                                Read our <a href="/privacy-policy" className="text-600">Privacy Policy</a> to learn more and how to manage this.
                            </div>
                        </div>
                        <div className="col-auto close-button-container">
                            <a className="test-warning-close" title="Hide" onClick={this.handleClose}>
                                <div className="contents">
                                    <i className="icon icon-fw icon-check fas d-block py-2"/>
                                    <span className="d-block py-2">Accept</span>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );

    }

}
