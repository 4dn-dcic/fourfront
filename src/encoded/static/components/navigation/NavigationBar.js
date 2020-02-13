'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { Navbar } from 'react-bootstrap';
import { console, isSelectAction, memoizedUrlParse } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { FourfrontLogo } from './../viz/FourfrontLogo';
import { portalConfig } from './../globals';
import { SearchBar, TestWarning, LeftNav, AccountNav, BigDropdownGroupController } from './components';
import QuickInfoBar from './../viz/QuickInfoBar';
import { ChartDataController } from './../viz/chart-data-controller';



/**
 * Some of this code is deprecated and can be re-factored.
 * E.g. We use BigDropdown now for static pages menu.
 * At some point, the login/user menu should be updated as well.
 *
 * @todo Refactor and delete old unused code.
 * @todo Change login/user menu to match BigDropdown for Help pages.
 * @todo In new user/login menu (BigDropdown style), include more stuff from profile, e.g. Gravatar photo.
 */
export class NavigationBar extends React.PureComponent {

    static propTypes = {
        'href': PropTypes.string,
        'session': PropTypes.bool,
        'updateUserInfo': PropTypes.func.isRequired,
        'context': PropTypes.object,
        'schemas': PropTypes.any,
        'browseBaseState': PropTypes.string,
        'isFullscreen' : PropTypes.bool
    };

    /**
     * Checks to see if is production href to determine whether to store/get localStorage
     * state for "user has clicked agree before".
     *
     * @returns {boolean} Whether to look at localStorage.
     */
    static inferCookieAcceptanceFromLocalStorage(href){
        // return true; // uncomment for testing on localhost
        const initHostName = memoizedUrlParse(href).hostname;
        if (initHostName && portalConfig.productionHosts.indexOf(initHostName) > -1) {
            return true;
        }
        return false;
    }

    constructor(props){
        super(props);
        this.handleAcceptDisclaimer = this.handleAcceptDisclaimer.bind(this);
        this.closeMobileMenu = this.closeMobileMenu.bind(this);
        this.onToggleNavBar = this.onToggleNavBar.bind(this);

        /**
         * Navbar state.
         *
         * @private
         * @constant
         * @property {boolean} state.testWarning        Whether Test Data warning banner is visible. Initially determined according to if are on production hostname.
         * @property {boolean} state.mounted            Whether are mounted.
         * @property {boolean} state.mobileDropdownOpen Helper state to keep track of if menu open on mobile because mobile menu doesn't auto-close after navigation.
         */
        this.state = {
            'testWarning'           : false,
            'mounted'               : false,
            'mobileDropdownOpen'    : false
        };
    }

    /**
     * Initializes scroll event handler & loading of help menu tree.
     *
     * @private
     * @returns {void}
     */
    componentDidMount(){
        const { href } = this.props;

        let testWarning = true;
        let lsResult = null;

        if (NavigationBar.inferCookieAcceptanceFromLocalStorage(href)){
            if (window && window.localStorage && window.localStorage.getItem){
                lsResult = window.localStorage.getItem("accepted_privacy_policy_disclaimer");
                if (lsResult) {
                    lsResult = new Date(lsResult);
                    if (!isNaN(lsResult.valueOf())) {
                        testWarning = false;
                    }
                }
            }
        }

        this.setState({ testWarning, 'mounted' : true });
    }

    /**
     * Re-loads help menu tree if session (user login state) has changed.
     *
     * @private
     * @returns {void}
     */
    componentDidUpdate(prevProps, prevState){
        const { href, session } = this.props;
        if ((typeof session === 'boolean' && session !== prevProps.session) || href !== prevProps.href){
            this.closeMobileMenu();
        }
    }

    closeMobileMenu(){
        this.setState( ({ mobileDropdownOpen }) => {
            if (!mobileDropdownOpen) return null;
            return { 'mobileDropdownOpen' : false };
        });
    }

    /**
     * Sets `state.testWarning` to be false and scrolls the window if sticky header is visible (BrowseView, SearchView)
     * so that sticky header gets its dimension(s) updated.
     *
     * @param {React.SyntheticEvent} [e] An event, if any. Unused.
     * @returns {void}
     */
    handleAcceptDisclaimer(e) {
        // Remove the warning banner because the user clicked the close icon
        this.setState({ 'testWarning': false });

        // If collection with .sticky-header on page, jiggle scroll position
        // to force the sticky header to jump to the top of the page.
        var hdrs = document.getElementsByClassName('sticky-header');
        if (hdrs.length) {
            window.scrollBy(0,-1);
            window.scrollBy(0,1);
        }

        if (window && window.localStorage && window.localStorage.setItem) {
            window.localStorage.setItem("accepted_privacy_policy_disclaimer", (new Date()).toISOString());
        }
    }

    onToggleNavBar(open){
        this.setState({ 'mobileDropdownOpen' : open });
    }

    render() {
        const { testWarning, mobileDropdownOpen, mounted } = this.state;
        const { href, context, schemas, browseBaseState, isFullscreen, currentAction } = this.props;
        const testWarningVisible = !!(testWarning & !isFullscreen & !isSelectAction(currentAction) ); // Hidden on full screen mode.
        const navClassName = (
            "navbar-container" +
            (testWarningVisible ? ' test-warning-visible' : '')
        );

        return (
            <div className={navClassName}>
                <div id="top-nav" className="navbar-fixed-top" role="navigation">
                    <TestWarning visible={testWarningVisible} onAccept={this.handleAcceptDisclaimer} href={href} />
                    <div className="navbar-inner-container">
                        <Navbar label="main" expand="md" className="navbar-main" id="navbar-icon"
                            onToggle={this.onToggleNavBar} expanded={mobileDropdownOpen}>

                            <a className="navbar-brand" href="/">
                                <FourfrontLogo />
                            </a>

                            <Navbar.Toggle>
                                <i className="icon icon-bars fas icon-fw align-middle" />
                            </Navbar.Toggle>

                            <CollapsedNav {...this.props} {...{ testWarningVisible, mounted }} />
                        </Navbar>
                    </div>
                    <ChartDataController.Provider id="quick_info_bar1">
                        <QuickInfoBar {...{ href, schemas, context, browseBaseState }} />
                    </ChartDataController.Provider>
                </div>
            </div>
        );
    }
}

const CollapsedNav = React.memo(function CollapsedNav(props) {
    const {
        href, currentAction, session, mounted,
        overlaysContainer, windowWidth, windowHeight,
        browseBaseState, testWarningVisible,
        addToBodyClassList, removeFromBodyClassList,
        schemas, updateUserInfo
    } = props;

    const leftNavProps = {
        windowWidth, windowHeight, href, mounted, overlaysContainer, session,
        testWarningVisible, browseBaseState//, addToBodyClassList, removeFromBodyClassList
    };

    const userActionNavProps = {
        windowWidth, windowHeight, href, mounted, overlaysContainer, session,
        schemas, updateUserInfo, testWarningVisible
    };

    return (
        <Navbar.Collapse>
            <BigDropdownGroupController {...{ addToBodyClassList, removeFromBodyClassList }}>
                <LeftNav {...leftNavProps} />
                <SearchBar {...{ href, currentAction, browseBaseState }} />
                <AccountNav {...userActionNavProps} />
            </BigDropdownGroupController>
        </Navbar.Collapse>
    );
});
