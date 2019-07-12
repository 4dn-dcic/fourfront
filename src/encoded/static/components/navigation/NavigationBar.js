'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { console, ajax } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { FourfrontLogo } from './../viz/FourfrontLogo';
import { productionHost } from './../globals';
import { SearchBar, TestWarning, HelpNavItem, BigDropdownMenu, UserActionDropdownMenu, isActionActive, getActionURL } from './components';
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
        'href'              : PropTypes.string,
        'session'           : PropTypes.bool,
        'listActionsFor'    : PropTypes.func,
        'updateUserInfo'    : PropTypes.func.isRequired,
        'context'           : PropTypes.object,
        'schemas'           : PropTypes.any
    };

    /**
     * Default properties.
     *
     * @public
     * @constant
     * @property {string} helpItemTreeURI - ID/URI to get DirectoryPage containing other children pages to show in menu.
     * @property {string} helpItemHref - URL to root help page.
     */
    static defaultProps = {
        'helpItemTreeURI'   : '/pages/311d0f4f-56ee-4450-8cbb-780c10229284/@@embedded',
        'helpItemHref'      : '/help'
    };

    constructor(props){
        super(props);
        this.hideTestWarning = this.hideTestWarning.bind(this);
        this.closeMobileMenu = this.closeMobileMenu.bind(this);
        this.loadHelpMenuTree = this.loadHelpMenuTree.bind(this);
        this.setOpenDropdownID = _.throttle(this.setOpenDropdownID.bind(this), 500);
        this.resetOpenDropdownID = this.resetOpenDropdownID.bind(this);
        this.onToggleNavBar = this.onToggleNavBar.bind(this);

        /**
         * Navbar state.
         *
         * @private
         * @constant
         * @property {boolean} state.testWarning        Whether Test Data warning banner is visible. Initially determined according to if are on production hostname.
         * @property {boolean} state.mounted            Whether are mounted.
         * @property {boolean} state.mobileDropdownOpen Helper state to keep track of if menu open on mobile because mobile menu doesn't auto-close after navigation.
         * @property {!string} state.openDropdown       ID of currently-open dropdown menu. Use for BigDropdown(s) e.g. Help menu directory.
         * @property {Object}  state.helpMenuTree       JSON representation of menu tree.
         * @property {boolean} state.isLoadingHelpMenuTree - Whether menu tree is currently being loaded.
         */
        this.state = {
            'testWarning'           : !productionHost[url.parse(props.href).hostname] || false,
            'mounted'               : false,
            'mobileDropdownOpen'    : false,
            'openDropdown'          : null,
            'helpMenuTree'          : null,
            'isLoadingHelpMenuTree' : false
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
        if (!this.state.helpMenuTree && !this.state.isLoadingHelpMenuTree){
            this.loadHelpMenuTree();
        }
    }

    /**
     * Re-loads help menu tree if session (user login state) has changed.
     *
     * @private
     * @returns {void}
     */
    componentDidUpdate(prevProps, prevState){
        if (typeof this.props.session === 'boolean' && this.props.session !== prevProps.session){
            this.loadHelpMenuTree({ 'openDropdown' : null });
            this.closeMobileMenu();
        } else if (this.props.href !== prevProps.href){
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
    hideTestWarning(e) {
        // Remove the warning banner because the user clicked the close icon
        this.setState({ 'testWarning': false });

        // If collection with .sticky-header on page, jiggle scroll position
        // to force the sticky header to jump to the top of the page.
        var hdrs = document.getElementsByClassName('sticky-header');
        if (hdrs.length) {
            window.scrollBy(0,-1);
            window.scrollBy(0,1);
        }
    }

    /**
     * Performs AJAX request to `props.helpItemTreeURI` and saves response to
     * `state.helpMenuTree`. Manages `state.isLoadingHelpMenuTree` appropriately.
     *
     * @param {Object} [extraState={}] Any extra state values to save prior to starting AJAX load.
     * @returns {void}
     */
    loadHelpMenuTree(extraState = {}){
        if (this.state.isLoadingHelpMenuTree) {
            console.error("Already loading Help tree");
            return;
        }
        this.setState(_.extend(extraState, { 'isLoadingHelpMenuTree' : true }), ()=>{
            ajax.load(this.props.helpItemTreeURI, (res)=>{
                if (res && res.children){
                    this.setState({ 'helpMenuTree' : res, 'isLoadingHelpMenuTree' : false });
                } else {
                    this.setState({ 'helpMenuTree' : null, 'isLoadingHelpMenuTree' : false });
                }
            }, 'GET', ()=>{
                this.setState({ 'helpMenuTree' : null, 'isLoadingHelpMenuTree' : false });
            });

        });
    }

    onToggleNavBar(open){
        this.setState({ 'mobileDropdownOpen' : open });
    }

    setOpenDropdownID(id = null){
        this.setState({ 'openDropdown' : id });
    }

    resetOpenDropdownID(){
        this.setOpenDropdownID(null);
    }

    render() {
        const { testWarning, mobileDropdownOpen, mounted, helpMenuTree, isLoadingHelpMenuTree, openDropdown } = this.state;
        const {
            href, context, listActionsFor, session, updateUserInfo, schemas, browseBaseState,
            currentAction, windowWidth, windowHeight, isFullscreen, overlaysContainer
        } = this.props;
        const testWarningVisible = testWarning & !isFullscreen; // Hidden on full screen mode.
        const navClassName = (
            "navbar-container" +
            (testWarningVisible ? ' test-warning-visible' : '') +
            (openDropdown ? ' big-menu-open' : '')
        );
        const primaryActions = listActionsFor('global_sections');
        const browseMenuItemOpts = _.findWhere(primaryActions, { 'id' : 'browse-menu-item' });
        const inclBigMenu = helpMenuTree && (helpMenuTree.children || []).length > 0 && windowWidth >= 768;

        return (
            <div className={navClassName}>

                { inclBigMenu ? // Shown when help nav menu (or similar) is open
                    <div className="big-dropdown-menu-background" onClick={this.resetOpenDropdownID} />
                    : null }

                <div id="top-nav" className="navbar-fixed-top" role="navigation">
                    <TestWarning visible={testWarningVisible} setHidden={this.hideTestWarning} href={href} />
                    <Navbar label="main" expand="md" className="navbar-main" id="navbar-icon" onToggle={this.onToggleNavBar}
                        expanded={mobileDropdownOpen}>

                        <a className="navbar-brand" href="/">
                            <FourfrontLogo onClick={this.resetOpenDropdownID} />
                        </a>

                        <Navbar.Toggle>
                            <i className="icon icon-bars icon-fw" />
                        </Navbar.Toggle>

                        <Navbar.Collapse>
                            <Nav className="mr-auto">
                                { browseMenuItemOpts ?
                                    <Nav.Link key={browseMenuItemOpts.id} href={getActionURL(browseMenuItemOpts, href)}
                                        active={(!!(isActionActive(browseMenuItemOpts, href)))} className="browse-nav-btn">
                                        { browseMenuItemOpts.title || "Browse" }
                                    </Nav.Link>
                                    : null }
                                <HelpNavItem {...this.props} {...{ mobileDropdownOpen, helpMenuTree, isLoadingHelpMenuTree, mounted }}
                                    setOpenDropdownID={this.setOpenDropdownID} openDropdownID={openDropdown} />
                            </Nav>
                            <SearchBar href={href} currentAction={currentAction} />
                            <UserActionDropdownMenu {...{ session, href, updateUserInfo, listActionsFor, mounted, overlaysContainer, schemas, windowWidth }} />
                        </Navbar.Collapse>
                    </Navbar>
                    { inclBigMenu ?
                        <BigDropdownMenu {...{ windowWidth, windowHeight, mobileDropdownOpen, href }}
                            setOpenDropdownID={this.setOpenDropdownID} openDropdownID={openDropdown} menuTree={helpMenuTree} />
                        : null }
                    <ChartDataController.Provider id="quick_info_bar1">
                        <QuickInfoBar {...{ href, schemas, context, browseBaseState }} invisible={!!(openDropdown)} />
                    </ChartDataController.Provider>
                </div>
            </div>
        );
    }
}
