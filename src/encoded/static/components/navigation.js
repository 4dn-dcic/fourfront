'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import { Navbars, Navbar, Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';
import _ from 'underscore';
import Login from './login';
import * as store from '../store';
import { JWT, console, layout, isServerSide } from './util';
import QuickInfoBar from './viz/QuickInfoBar';
import TestWarning from './testwarning';
import { productionHost } from './globals';



export function getCurrentHeight(){
    if (!isServerSide() && document){
        return parseInt(document.getElementById('top-nav').offsetHeight);
    }
    return null;
}


/** May be bound to access this.props.href (if available) as fallback */
export function getWindowPath(mounted){
    var href = getWindowLocation.call(this, mounted);
    if (!href) return null;
    return (href.pathname || '/') + (href.search || '') + (href.hash || '');
}


export function getWindowURL(mounted){
    var href = getWindowLocation.call(this, mounted);
    return href.href;
}


/** May be bound to access this.props.href (if available) as fallback */
export function getWindowLocation(mounted){
    if (this && this.props && this.props.href) {
        return url.parse(this.props.href);
    }
    if (mounted && typeof window === 'object' && window && typeof window.location !== 'undefined'){
        return window.location;
    }
    return null;
}


export default class Navigation extends React.Component {


    static isMenuItemActive(action, mounted){
        return (
            (typeof action.active === 'function' && action.active(getWindowPath.call(this, mounted))) ||
            (Navigation.getMenuItemURL(action, mounted) === getWindowPath.call(this, mounted))
        );
    }

    static getMenuItemURL(action, mounted = false){
        if (typeof action.url === 'string') return action.url;
        if (typeof action.url === 'function') return action.url(getWindowLocation.call(this, mounted));
        if (typeof action.href === 'string') return action.href;
        if (typeof action.href === 'function') return action.href(getWindowLocation.call(this, mounted));
        return '#';
    }

    /** Can be bound to access this.props.href for getWindowPath (if available) */
    static buildMenuItem(action, mounted, extraProps){
        return (
            <MenuItem
                key={action.id}
                id={action.sid || action.id}
                href={Navigation.getMenuItemURL(action, mounted)}
                onClick={function(e){ return e.target && typeof e.target.blur === 'function' && e.target.blur(); }}
                className="global-entry"
                active={Navigation.isMenuItemActive.call(this, action, mounted)}
                {...extraProps}
            >
                {action.title}
            </MenuItem>
        );
    }

    /** Can be bound to access this.props.href for getWindowPath (if available) */
    static buildDropdownMenu(action, mounted){
        if (action.children){
            return (
                <NavDropdown key={action.id} id={action.sid || action.id} label={action.id} title={action.title}>
                    {action.children.map((a) => Navigation.buildMenuItem(a, mounted) )}
                </NavDropdown>
            );
        } else {
            return (
                <NavItem
                    key={action.id}
                    id={action.sid || action.id}
                    href={Navigation.getMenuItemURL(action, mounted)}
                    active={Navigation.isMenuItemActive.call(this, action, mounted)}
                >
                        {action.title}
                </NavItem>
            );
        }
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.setupScrollHandler = this.setupScrollHandler.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.closeDropdowns = this.closeDropdowns.bind(this);
        this.hideTestWarning = this.hideTestWarning.bind(this);
        this.closeMobileMenu = this.closeMobileMenu.bind(this);
        this.state = {
            testWarning: this.props.visible || !productionHost[url.parse(this.props.href).hostname] || false,
            mounted : false,
            mobileDropdownOpen : false,
            scrolledPastTop : false,
            navInitialized : false
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
        if (!isServerSide()) this.setupScrollHandler();
    }

    setupScrollHandler(){
        if (!(typeof window !== 'undefined' && window && document && document.body && typeof document.body.scrollTop !== 'undefined')){
            return null;
        }

        var lastScrollTop = 0;

        function handleScroll(e){
            var stateChange = {};
            if (!this.state.navInitialized){
                stateChange.navInitialized = true;
            }

            var scrollVector = document.body.scrollTop - lastScrollTop;
            lastScrollTop = document.body.scrollTop;

            if (
                ['xs','sm'].indexOf(layout.responsiveGridState()) === -1 && // Fixed nav takes effect at medium grid breakpoint or wider.
                (
                    (document.body.scrollTop > 20 && scrollVector >= 0) ||
                    (document.body.scrollTop > 80)
                )
            ){
                if (!this.state.scrolledPastTop){
                    stateChange.scrolledPastTop = true;
                    this.setState(stateChange, function(){
                        if (document.body.className.indexOf(' scrolled-past-top') === -1) document.body.className += ' scrolled-past-top';
                    });
                }
                if (document.body.scrollTop > 80 && document.body.className.indexOf(' scrolled-past-80') === -1){
                    document.body.className += ' scrolled-past-80';
                }
            } else {
                if (this.state.scrolledPastTop){
                    stateChange.scrolledPastTop = false;
                    this.setState(stateChange, function(){
                        if (document.body.className.indexOf(' scrolled-past-top') !== -1){
                            var newClassName = document.body.className.replace(' scrolled-past-top', '').replace(' scrolled-past-80','');
                            document.body.className = newClassName;
                        }
                    });
                }
            }
        }

        // We add as property of class instance so we can remove event listener on unmount, for example.
        this.throttledScrollHandler = _.throttle(handleScroll.bind(this), 10);

        // Save logo/brand element's 'full width' before any height transitions.
        // Ideally wait until logo/brand image has loaded before doing so.
        var navBarBrandImg = document.getElementsByClassName('navbar-logo-image')[0];
        if (typeof navBarBrandImg === 'undefined') return;

        // Window resize & logo img load handler
        function saveWidth(){
            var navBarBrandImgContainer = navBarBrandImg.parentElement;
            var navBarBrand = navBarBrandImgContainer.parentElement.parentElement;
            navBarBrand.style.width = ''; // Clear any earlier width
            if (['xs','sm'].indexOf(layout.responsiveGridState()) !== -1) return; // If mobile / non-fixed nav width
            //navBarBrandImgContainer.style.width = navBarBrandImgContainer.offsetWidth + 'px'; // Enable to fix width of logo to its large size.
            navBarBrand.style.width = navBarBrand.offsetWidth + 'px';
        }

        this.throttledResizeHandler = _.throttle(saveWidth, 300);

        navBarBrandImg.addEventListener('load', saveWidth);
        // Execute anyway in case image is loaded, in addition to the 1 time on-img-load if any (some browsers do not support img load event; it's not part of W3 spec).
        // Alternatively we can define width in stylesheet (e.g. 200px)
        saveWidth();

        window.addEventListener("scroll", this.throttledScrollHandler);
        window.addEventListener("resize", this.throttledResizeHandler);
        setTimeout(this.throttledScrollHandler, 100, null, { 'navInitialized' : true });
    }

    componentWillUnmount(){
        // Unbind events | probably not needed but lets be safe & cleanup.
        window.removeEventListener("resize", this.throttledResizeHandler);
        window.removeEventListener("scroll", this.throttledScrollHandler);
        delete this.throttledResizeHandler;
        delete this.throttledScrollHandler;
    }

    closeMobileMenu(){
        if (this.state.mobileDropdownOpen) this.setState({ mobileDropdownOpen : false });
    }

    closeDropdowns(){
        if (!this.state.mounted) return;
        //this.
    }

    hideTestWarning(e) {
        // Remove the warning banner because the user clicked the close icon
        this.setState({testWarning: false});

        // If collection with .sticky-header on page, jiggle scroll position
        // to force the sticky header to jump to the top of the page.
        var hdrs = document.getElementsByClassName('sticky-header');
        if (hdrs.length) {
            window.scrollBy(0,-1);
            window.scrollBy(0,1);
        }
    }

    render() {
        var navClass = "navbar-container";
        if (this.state.testWarning) navClass += ' test-warning-visible';
        if (this.state.navInitialized) navClass += ' nav-initialized';
        if (this.state.scrolledPastTop) {
            navClass += " scrolled-past-top";
        } else {
            navClass += " scrolled-at-top";
        }

        return (
            <div className={navClass}>
                <div id="top-nav" className="navbar-fixed-top">
                    <TestWarning visible={this.state.testWarning} setHidden={this.hideTestWarning} href={this.props.href} />
                    <Navbar fixedTop={false /* Instead we make the navbar container fixed */} label="main" className="navbar-main" id="navbar-icon" onToggle={(open)=>{
                        this.setState({ mobileDropdownOpen : open });
                    }} expanded={this.state.mobileDropdownOpen}>
                        <Navbar.Header>
                            <Navbar.Brand>
                                <NavItem href="/">
                                    <span className="img-container"><img src="/static/img/4dn_icon.svg" className="navbar-logo-image"/></span>
                                    <span className="navbar-title">Data Portal</span>
                                </NavItem>
                            </Navbar.Brand>
                            <Navbar.Toggle>
                                <i className="icon icon-bars icon-fw"></i>
                            </Navbar.Toggle>
                        </Navbar.Header>
                        <Navbar.Collapse>
                            <Nav>
                            {
                                this.props.listActionsFor('global_sections').map((a)=>
                                    Navigation.buildDropdownMenu.call(this, a, this.state.mounted)
                                )
                            }
                            </Nav>
                            <UserActions
                                mounted={this.state.mounted} // boolean
                                closeMobileMenu={this.closeMobileMenu} // function
                                session={this.props.session} // boolean
                                href={this.props.href} // string
                                updateUserInfo={this.props.updateUserInfo} // function
                                listActionsFor={this.props.listActionsFor} // function
                            />
                        <SearchBar href={this.props.href} />
                        </Navbar.Collapse>
                    </Navbar>
                    <QuickInfoBar ref="stats" href={this.props.href} expSetFilters={this.props.expSetFilters} schemas={this.props.schemas} />
                </div>
            </div>
        );
    }
}

Navigation.propTypes = {
    href : PropTypes.string,
    session : PropTypes.bool
};


class SearchBar extends React.Component{

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        var id = url.parse(this.props.href, true);
        var searchQuery = id.query['q'] || '';
        return (
            <form className="navbar-form navbar-right" action="/search/">
                <input className="form-control search-query" id="navbar-search" type="search" placeholder="Search"
                    ref="q" name="q" defaultValue={searchQuery} key={searchQuery} />
            </form>
        );
    }
}


class UserActions extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        var session = this.props.session;
        var acctTitle = "Account";

        if (session){
            var userDetails = JWT.getUserDetails();
            if (userDetails && typeof userDetails.first_name === 'string' && userDetails.first_name.length > 0) {
                acctTitle = userDetails.first_name;
            }
        }

        acctTitle = (
            <span>
                <i title={session ? "Signed In" : null} className={"account-icon icon icon-user" + (session ? "" : "-o")}></i> { acctTitle }
            </span>
        );

        var actions = [];
        this.props.listActionsFor('user_section').forEach((action) => {
            if (action.id === "login-menu-item"){
                actions.push(
                    <Login
                        key={action.id}
                        navCloseMobileMenu={this.props.closeMobileMenu}
                        session={this.props.session}
                        href={this.props.href}
                        updateUserInfo={this.props.updateUserInfo}
                    />
                );
            } else if (action.id === "accountactions-menu-item"){
                // link to registration page if logged out or account actions if logged in
                if (!session) {
                    actions.push(Navigation.buildMenuItem.call(this, action, this.props.mounted));
                } else {
                    // Account Actions
                    actions = actions.concat(this.props.listActionsFor('user').map((action, idx) => {
                        return Navigation.buildMenuItem.call(this, action, this.props.mounted, {"data-no-cache" : true});
                    }));
                }
            } else if (action.id === "contextactions-menu-item") {
                // Context Actions
                actions = actions.concat(this.props.listActionsFor('context').map((action) => {
                    return Navigation.buildMenuItem.call(
                        this,
                        _.extend(_.clone(action), { title : <span><i className="icon icon-pencil"></i> {action.title}</span> }),
                        this.props.mounted
                    );
                }));
            }
        });

        return (
            <Nav className="navbar-acct" pullRight>
                <NavDropdown id="context" label="context" title={acctTitle} >
                    { actions }
                </NavDropdown>
            </Nav>
        );
    }
}

UserActions.propTypes = {
    session         : PropTypes.bool.isRequired,
    listActionsFor  : PropTypes.func.isRequired,
    href            : PropTypes.string.isRequired
};


// Display breadcrumbs with contents given in 'crumbs' object.
// Each crumb in the crumbs array: {
//     id: Title string to display in each breadcrumb. If falsy, does not get included, not even as an empty breadcrumb
//     query: query string property and value, or null to display unlinked id
//     uri: Alternative to 'query' property. Specify the complete URI instead of accreting query string variables
//     tip: Text to display as part of uri tooltip.
//     wholeTip: Alternative to 'tip' property. The complete tooltip to display
// }
export class Breadcrumbs extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render() {
        var accretingQuery = '';
        var accretingTip = '';

        // Get an array of just the crumbs with something in their id
        var crumbs = _.filter(this.props.crumbs, function(crumb) { return crumb.id; });
        var rootTitle = crumbs[0].id;

        return (
            <ol className="breadcrumb">
                {crumbs.map((crumb, i) => {
                    // Build up the query string if not specified completely
                    if (!crumb.uri) {
                        accretingQuery += crumb.query ? '&' + crumb.query : '';
                    }

                    // Build up tooltip if not specified completely
                    if (!crumb.wholeTip) {
                        accretingTip += crumb.tip ? (accretingTip.length ? ' and ' : '') + crumb.tip : '';
                    }

                    // Render the breadcrumbs
                    return (
                        <li key={i}>
                            {(crumb.query || crumb.uri) ? <a href={crumb.uri ? crumb.uri : this.props.root + accretingQuery} title={crumb.wholeTip ? crumb.wholeTip : 'Search for ' + accretingTip + ' in ' + rootTitle}>{crumb.id}</a> : <span>{crumb.id}</span>}
                        </li>
                    );
                })}
            </ol>
        );
    }
}

Breadcrumbs.propTypes = {
    root: PropTypes.string, // Root URI for searches
    crumbs: PropTypes.arrayOf(PropTypes.object).isRequired // Object with breadcrumb contents
};
