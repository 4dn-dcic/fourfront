'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import { Navbars, Navbar, Nav, NavItem, NavDropdown, MenuItem, Checkbox, DropdownButton, Fade, Collapse } from 'react-bootstrap';
import { JWT, console, layout, isServerSide, navigate, Filters, object, ajax } from './../util';
import { requestAnimationFrame, FourfrontLogo } from './../viz/utilities';
import * as store from './../../store';
import { productionHost } from './../globals';
import { SearchBar, TestWarning, HelpNavItem, BigDropdownMenu, UserActionDropdownMenu, isActionActive, actionToMenuItem, getActionURL } from './components';
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
    }

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
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.hideTestWarning = this.hideTestWarning.bind(this);
        this.closeMobileMenu = this.closeMobileMenu.bind(this);
        this.loadHelpMenuTree = this.loadHelpMenuTree.bind(this);
        this.setOpenDropdownID = _.throttle(this.setOpenDropdownID.bind(this), 500);
        this.resetOpenDropdownID = this.resetOpenDropdownID.bind(this);

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
            'testWarning'           : !productionHost[url.parse(this.props.href).hostname] || false,
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
        }
    }

    closeMobileMenu(){
        if (this.state.mobileDropdownOpen) this.setState({ mobileDropdownOpen : false });
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
        this.setState({'testWarning': false});

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

    setOpenDropdownID(id = null){
        this.setState({ 'openDropdown' : id });
    }

    resetOpenDropdownID(){
        this.setOpenDropdownID(null);
    }

    render() {
        var { testWarning, mobileDropdownOpen, mounted, helpMenuTree, isLoadingHelpMenuTree, openDropdown } = this.state,
            { href, context, listActionsFor, session, updateUserInfo, schemas, browseBaseState, currentAction, windowWidth, windowHeight } = this.props,
            navClassName        = (
                "navbar-container" +
                (testWarning ?      ' test-warning-visible' : '') +
                (openDropdown ?     ' big-menu-open' : '')
            ),
            primaryActions      = listActionsFor('global_sections'),
            browseMenuItemOpts  = _.findWhere(primaryActions, { 'id' : 'browse-menu-item' }),
            inclBigMenu         = helpMenuTree && (helpMenuTree.children || []).length > 0 && windowWidth >= 768;

        return (
            <div className={navClassName}>
                { inclBigMenu ? <div className="big-dropdown-menu-background" onClick={this.resetOpenDropdownID} /> : null }
                <div id="top-nav" className="navbar-fixed-top">
                    <TestWarning visible={testWarning} setHidden={this.hideTestWarning} href={href} />
                    <Navbar fixedTop={false /* Instead we make the navbar container fixed */} label="main" className="navbar-main" id="navbar-icon" onToggle={(open)=>{
                        this.setState({ 'mobileDropdownOpen' : open });
                    }} expanded={mobileDropdownOpen}>
                        <Navbar.Header>
                            <FourfrontLogo onClick={this.resetOpenDropdownID} />
                            <Navbar.Toggle>
                                <i className="icon icon-bars icon-fw"></i>
                            </Navbar.Toggle>
                        </Navbar.Header>
                        <Navbar.Collapse>
                            <Nav>
                                { browseMenuItemOpts ?
                                    <NavItem key={browseMenuItemOpts.id} id={browseMenuItemOpts.id}
                                        href={getActionURL(browseMenuItemOpts, mounted, href)}
                                        active={isActionActive(browseMenuItemOpts, mounted, href)}
                                        children={browseMenuItemOpts.title || "Browse"} />
                                : null }
                                <HelpNavItem {...this.props} {...{ windowWidth, windowHeight, mobileDropdownOpen, helpMenuTree, isLoadingHelpMenuTree, mounted }}
                                    setOpenDropdownID={this.setOpenDropdownID} openDropdownID={openDropdown} />
                            </Nav>
                            <UserActionDropdownMenu closeMobileMenu={this.closeMobileMenu} {...{ session, href, updateUserInfo, listActionsFor, mounted }} />
                            <SearchBar href={href} currentAction={currentAction} />
                        </Navbar.Collapse>
                    </Navbar>
                    { inclBigMenu ?
                        <BigDropdownMenu {...{ windowWidth, windowHeight, mobileDropdownOpen, href }}
                            setOpenDropdownID={this.setOpenDropdownID} openDropdownID={openDropdown} menuTree={helpMenuTree} />
                    : null }
                    <ChartDataController.Provider id="quick_info_bar1">
                        <QuickInfoBar href={href} schemas={schemas} context={context} browseBaseState={browseBaseState} invisible={!!(openDropdown)} />
                    </ChartDataController.Provider>
                </div>
            </div>
        );
    }
}
