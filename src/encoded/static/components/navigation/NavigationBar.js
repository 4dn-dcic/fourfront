'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { CGAPLogo } from './../viz/CGAPLogo';
import { productionHost } from './../globals';
import { navigate } from './../util';
import { SearchBar, TestWarning, HelpNavItem, UserActionDropdownMenu } from './components';


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
        'href'              : PropTypes.string,
        'session'           : PropTypes.bool,
        'updateUserInfo'    : PropTypes.func.isRequired,
        'context'           : PropTypes.object,
        'schemas'           : PropTypes.any,
        'browseBaseState'   : PropTypes.string
    };

    constructor(props){
        super(props);
        this.closeMobileMenu = this.closeMobileMenu.bind(this);
        this.onToggleNavBar = this.onToggleNavBar.bind(this);

        /**
         * Navbar state.
         *
         * @private
         * @constant
         * @property {boolean} state.mounted            Whether are mounted.
         * @property {boolean} state.mobileDropdownOpen Helper state to keep track of if menu open on mobile because mobile menu doesn't auto-close after navigation.
         * @property {!string} state.openDropdown       ID of currently-open dropdown menu. Use for BigDropdown(s) e.g. Help menu directory.
         * @property {Object}  state.helpMenuTree       JSON representation of menu tree.
         * @property {boolean} state.isLoadingHelpMenuTree - Whether menu tree is currently being loaded.
         */
        this.state = {
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
        this.setState({ 'mounted' : true });
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

    onToggleNavBar(open){
        this.setState({ 'mobileDropdownOpen' : open });
    }

    render() {
        const { testWarning, mobileDropdownOpen, mounted } = this.state;
        const { href, context, schemas, browseBaseState, isFullscreen, testWarningPresent, hideTestWarning } = this.props;
        const testWarningVisible = testWarningPresent & !isFullscreen; // Hidden on full screen mode.
        //const navClassName = "navbar-container" + (testWarningVisible ? ' test-warning-visible' : '');

        return (
            <div className="navbar-container">
                <div id="top-nav" className="navbar-fixed-top" role="navigation">
                    <TestWarning visible={testWarningVisible} setHidden={hideTestWarning} href={href} />
                    <div className="navbar-inner-container">
                        <Navbar label="main" expand="md" className="navbar-main" id="navbar-icon"
                            onToggle={this.onToggleNavBar} expanded={mobileDropdownOpen}>

                            <a className="navbar-brand" href="/">
                                <CGAPLogo />
                            </a>

                            <Navbar.Toggle>
                                <i className="icon icon-bars icon-fw fas" />
                            </Navbar.Toggle>

                            <CollapsedNav {...this.state} {...this.props} />
                        </Navbar>
                    </div>
                </div>
            </div>
        );
    }
}

const CollapsedNav = React.memo(function CollapsedNav(props){
    const { href, currentAction } = props;
    const leftNavProps = _.pick(props, 'mobileDropdownOpen', 'windowWidth', 'windowHeight', 'browseBaseState', 'href',
        'mounted', 'overlaysContainer', 'session', 'testWarning', 'isFullscreen');
    const userActionNavProps = _.pick(props, 'session', 'href', 'updateUserInfo', 'mounted', 'overlaysContainer', 'schemas', 'windowWidth');
    return (
        <Navbar.Collapse>
            <LeftNav {...leftNavProps} />
            <SearchBar href={href} currentAction={currentAction} />
            <UserActionDropdownMenu {...userActionNavProps} />
        </Navbar.Collapse>
    );
});

const LeftNav = React.memo(function LeftNav(props){
    const { href, ...passProps } = props;
    const { query = {} } = url.parse(href, true);
    const isCasesLinkActive = query.type === 'Case';
    return (
        <Nav className="mr-auto">
            <Nav.Link key="browse-menu-item" href="/cases/" active={isCasesLinkActive} className="browse-nav-btn">
                Cases
            </Nav.Link>
            <HelpNavItem {...props} />
        </Nav>
    );
});