'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import { Navbars, Navbar, Nav, NavItem, NavDropdown, MenuItem, Checkbox, DropdownButton, Fade } from 'react-bootstrap';
import _ from 'underscore';
import Login from './login';
import * as store from '../store';
import { JWT, console, layout, isServerSide, navigate, Filters, object } from './util';
import { requestAnimationFrame } from './viz/utilities';
import QuickInfoBar from './viz/QuickInfoBar';
import { ChartDataController } from './viz/chart-data-controller';
import TestWarning from './testwarning';
import { productionHost } from './globals';



export function getCurrentHeight(){
    if (!isServerSide() && document){
        return parseInt(document.getElementById('top-nav').offsetHeight);
    }
    return null;
}


/** May be bound to access this.props.href (if available) as fallback */
export function getWindowPath(mounted, href = null){
    var windowLocation = getWindowLocation.call(this, mounted, href);
    if (!windowLocation) return null;
    return (windowLocation.pathname || '/') + (windowLocation.search || '') + (windowLocation.hash || '');
}


export function getWindowURL(mounted, href = null){
    var windowLocation = getWindowLocation.call(this, mounted, href);
    return windowLocation.href;
}


/** May be bound to access this.props.href (if available) as fallback */
export function getWindowLocation(mounted, href = null){
    if (typeof href === 'string' && href) return url.parse(href);
    if (this && this.props && this.props.href && typeof this.props.href === 'string') return url.parse(this.props.href);
    if (store && typeof store.getState === 'function'){
        var storeState = store.getState();
        if (typeof storeState.href === 'string' && storeState.href) return url.parse(storeState.href);
    }
    if (mounted && typeof window === 'object' && window && typeof window.location !== 'undefined') return window.location;
    return null;
}


export default class Navigation extends React.Component {


    static isMenuItemActive(action, mounted, href){
        return (
            (typeof action.active === 'function' && action.active(getWindowPath(mounted, href))) ||
            (Navigation.getMenuItemURL(action, mounted) === getWindowPath(mounted, href))
        );
    }

    static getMenuItemURL(action, mounted = false, href){
        if (typeof action.url === 'string') return action.url;
        if (typeof action.url === 'function') return action.url(getWindowLocation(mounted, href));
        if (typeof action.href === 'string') return action.href;
        if (typeof action.href === 'function') return action.href(getWindowLocation(mounted, href));
        return '#';
    }

    /** Can be bound to access this.props.href for getWindowPath (if available) */
    static buildMenuItem(action, mounted, href, extraProps){
        return (
            <MenuItem
                key={action.id}
                id={action.sid || action.id}
                href={Navigation.getMenuItemURL(action, mounted, href)}
                onClick={function(e){ return e.target && typeof e.target.blur === 'function' && e.target.blur(); }}
                className="global-entry"
                active={Navigation.isMenuItemActive(action, mounted, href)}
                children={action.title}
                {...extraProps}
            />
        );
    }

    /** Can be bound to access this.props.href for getWindowPath (if available) */
    static buildDropdownMenu(action, mounted, href){
        if (action.children){
            return (
                <NavDropdown key={action.id} id={action.sid || action.id} label={action.id} title={action.title}>
                    {action.children.map((a) => Navigation.buildMenuItem(a, mounted, href) )}
                </NavDropdown>
            );
        } else {
            return (
                <NavItem
                    key={action.id}
                    id={action.sid || action.id}
                    href={Navigation.getMenuItemURL(action, mounted, href)}
                    active={Navigation.isMenuItemActive.call(action, mounted, href)}
                >
                        {action.title}
                </NavItem>
            );
        }
    }

    static propTypes = {
        'href'              : PropTypes.string,
        'session'           : PropTypes.bool,
        'listActionsFor'    : PropTypes.func,
        'updateUserInfo'    : PropTypes.func.isRequired,
        'context'           : PropTypes.object,
        'schemas'           : PropTypes.any
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
            var currentScrollTop = layout.getPageVerticalScrollPosition();
            var scrollVector = currentScrollTop - lastScrollTop;
            lastScrollTop = currentScrollTop;

            if (
                ['xs','sm'].indexOf(layout.responsiveGridState()) === -1 && // Fixed nav takes effect at medium grid breakpoint or wider.
                (
                    (currentScrollTop > 20 && scrollVector >= 0) ||
                    (currentScrollTop > 80)
                )
            ){
                if (!this.state.scrolledPastTop){
                    stateChange.scrolledPastTop = true;
                    this.setState(stateChange, layout.toggleBodyClass.bind(layout, 'scrolled-past-top', true, document.body));
                }
                if (currentScrollTop > 80){
                    layout.toggleBodyClass('scrolled-past-80', true, document.body);
                }
            } else {
                if (this.state.scrolledPastTop){
                    stateChange.scrolledPastTop = false;
                    this.setState(stateChange, layout.toggleBodyClass.bind(layout, ['scrolled-past-80', 'scrolled-past-top'], false, document.body));
                }
            }
        }

        // We add as property of class instance so we can remove event listener on unmount, for example.
        this.throttledScrollHandler = _.throttle(requestAnimationFrame.bind(requestAnimationFrame, handleScroll.bind(this)), 10);

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
        var { testWarning, navInitialized, scrolledPastTop, mobileDropdownOpen, mounted } = this.state;
        var { href, context, listActionsFor, session, updateUserInfo, schemas } = this.props;
        var navClass = "navbar-container" + (testWarning ? ' test-warning-visible' : '') + (navInitialized ? ' nav-initialized' : '') + (scrolledPastTop ? " scrolled-past-top" : " scrolled-at-top");
        var expSetFilters = Filters.currentExpSetFilters((context && context.filters) || []);

        return (
            <div className={navClass}>
                <div id="top-nav" className="navbar-fixed-top">
                    <TestWarning visible={testWarning} setHidden={this.hideTestWarning} href={href} />
                    <Navbar fixedTop={false /* Instead we make the navbar container fixed */} label="main" className="navbar-main" id="navbar-icon" onToggle={(open)=>{
                        this.setState({ 'mobileDropdownOpen' : open });
                    }} expanded={mobileDropdownOpen}>
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
                            <Nav children={_.map(listActionsFor('global_sections'), function(a){ return Navigation.buildDropdownMenu(a, mounted, href); })} />
                            <UserActions closeMobileMenu={this.closeMobileMenu} {...{ session, href, updateUserInfo, listActionsFor, mounted }} />
                            <SearchBar href={href} />
                        </Navbar.Collapse>
                    </Navbar>
                    <QuickInfoBar ref="stats" href={href} expSetFilters={expSetFilters} schemas={schemas} context={context} />
                </div>
            </div>
        );
    }
}


class SearchBar extends React.Component{

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.toggleSearchAllItems = this.toggleSearchAllItems.bind(this);
        this.onSearchInputChange = this.onSearchInputChange.bind(this);
        this.onResetSearch = this.onResetSearch.bind(this);
        this.onSearchInputBlur = this.onSearchInputBlur.bind(this);
        this.selectItemTypeDropdown = this.selectItemTypeDropdown.bind(this);
        var initialQuery = '';
        if (props.href){
            initialQuery = Filters.searchQueryStringFromHref(props.href) || '';
        }
        this.state = {
            searchAllItems : false,
            typedSearchQuery : initialQuery
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.href !== this.props.href){
            var query = Filters.searchQueryStringFromHref(nextProps.href) || '';
            if (query !== this.state.typedSearchQuery){
                this.setState({ typedSearchQuery : query });
            }
        }
    }

    hasInput(typedSearchQuery = this.state.typedSearchQuery){
        return (typedSearchQuery && typeof typedSearchQuery === 'string' && typedSearchQuery.length > 0) || false;
    }

    toggleSearchAllItems(willSearchAllItems = null){
        if (willSearchAllItems === null){
            willSearchAllItems = !this.state.searchAllItems;
        }
        this.setState({ searchAllItems : willSearchAllItems });
    }

    onSearchInputChange(e){
        var newValue = e.target.value;
        var state = { typedSearchQuery : newValue };
        if (!this.hasInput(newValue)) {
            state.searchAllItems = false;
        }
        this.setState(state);
    }

    onSearchInputBlur(e){
        var lastQuery = Filters.searchQueryStringFromHref(this.props.href);
        if (this.hasInput(lastQuery) && !this.hasInput(this.state.typedSearchQuery)) {
            this.setState({ typedSearchQuery : lastQuery });
        }
        
    }

    onResetSearch (e){
        var id = url.parse(this.props.href, true);
        delete id.query['q'];
        var resetHref = id.protocol + '//' + id.host + id.pathname + (_.keys(id.query).length > 0 ? '?' + _.map(_.pairs(id.query), p => p[0]+'='+p[1] ).join('&') : '' );
        this.setState({
            searchAllItems : false,
            typedSearchQuery : ''
        }, navigate.bind(navigate, resetHref));
    }

    selectItemTypeDropdown(inProp = false){
        return (
            <Fade in={inProp} transitionAppear>
                <DropdownButton
                    id="search-item-type-selector"
                    bsSize="sm"
                    pullRight
                    onSelect={(eventKey, evt)=>{
                        this.toggleSearchAllItems(eventKey === 'all' ? true : false);
                    }}
                    title={this.state.searchAllItems ? 'All Items' : 'Experiment Sets'}
                >
                    <MenuItem eventKey='sets' active={!this.state.searchAllItems}>
                        Experiment Sets
                    </MenuItem>
                    <MenuItem eventKey='all' active={this.state.searchAllItems}>
                        All Items (advanced)
                    </MenuItem>
                </DropdownButton>
            </Fade>
        );
    }

    render() {
        var id = url.parse(this.props.href, true);
        var searchAllItems = this.state.searchAllItems;
        var searchQueryFromHref = id.query['q'] || '';
        var resetIconButton = null;
        var searchBoxHasInput = this.hasInput();

        if (searchQueryFromHref){
            resetIconButton = <i className="reset-button icon icon-close" onClick={this.onResetSearch}/>;
        }
        
        return (
            <form
                className={"navbar-search-form-container navbar-form navbar-right" + (searchQueryFromHref ? ' has-query' : '') + (this.hasInput() ? ' has-input' : '')}
                action={searchAllItems ? "/search/" : "/browse/" }
                method="GET"
            >
                {/*<Checkbox className="toggle-all-items-search" checked={this.state.searchAllItems} onChange={this.toggleSearchAllItems}>&nbsp; All Items</Checkbox>*/}
                {  this.selectItemTypeDropdown(!!(searchBoxHasInput || searchQueryFromHref)) }
                <input className="form-control search-query" id="navbar-search" type="search" placeholder="Search"
                    ref="q" name="q" value={this.state.typedSearchQuery} onChange={this.onSearchInputChange} key="search-input" onBlur={this.onSearchInputBlur} />
                {resetIconButton}
                <input id="type-select" type="hidden" name="type" value={searchAllItems ? "Item" : "ExperimentSetReplicate"}/>
                { !searchAllItems ? <input id="expset-type-select" type="hidden" name="experimentset_type" value="replicate"/> : null }
                <button type="submit" className="search-icon-button">
                    <i className="icon icon-fw icon-search"/>
                </button>
            </form>
        );
    }
}


class UserActions extends React.Component {

    static propTypes = {
        'session'         : PropTypes.bool.isRequired,      /** Passed in by App */
        'listActionsFor'  : PropTypes.func.isRequired,      /** Passed in by App */
        'href'            : PropTypes.string.isRequired,    /** Passed in by Redux store */
        'closeMobileMenu' : PropTypes.func.isRequired,      /** Passed in by Navigation */
        'updateUserInfo'  : PropTypes.func.isRequired,      /** Passed in by App */
        'mounted'         : PropTypes.bool                  /** Passed in by Navigation */
    }

    constructor(props){
        super(props);
        this.setIsLoading = this.setIsLoading.bind(this);
        this.listUserActionsAsMenuItems = this.listUserActionsAsMenuItems.bind(this);
        this.render = this.render.bind(this);
        this.state = { 'isLoading' : false };
    }

    setIsLoading(isLoading = !this.state.isLoading){
        this.setState({ 'isLoading' : isLoading });
    }

    listUserActionsAsMenuItems(){
        var { mounted, listActionsFor, href } = this.props;
        return _.reduce(listActionsFor('user_section'), (actions, action) => {
            if (action.id === "login-menu-item"){
                actions.push( <Login {..._.pick(this.props, 'closeMobileMenu', 'session', 'href', 'updateUserInfo')} key={action.id} setIsLoadingIcon={this.setIsLoading} /> );
            } else if (action.id === "accountactions-menu-item"){
                // link to registration page if logged out or account actions if logged in
                if (!this.props.session) {
                    actions.push(Navigation.buildMenuItem(action, mounted, href));
                } else {
                    // Account Actions
                    actions = actions.concat(_.map(listActionsFor('user'), function(action, idx){
                        return Navigation.buildMenuItem(action, mounted, href, {"data-no-cache" : true});
                    }));
                }
            } else if (action.id === "contextactions-menu-item") {
                // Context Actions
                actions = actions.concat(_.map(listActionsFor('context'), function(action){
                    return Navigation.buildMenuItem(_.extend( _.clone(action), { title : <span><i className="icon icon-pencil"></i> {action.title}</span> } ), mounted, href);
                }));
            }
            return actions;
        }, []);
    }

    render() {
        var acctTitle = "Account", acctIcon = null, userDetails = null;

        if (this.state.isLoading){
            acctTitle = <span className="pull-right"><i className="account-icon icon icon-spin icon-circle-o-notch" style={{ verticalAlign : 'middle' }}/></span>;
        } else if (this.props.session){
            userDetails = JWT.getUserDetails();
            if (userDetails && typeof userDetails.first_name === 'string' && userDetails.first_name.length > 0) acctTitle = userDetails.first_name;
            if (userDetails && typeof userDetails.email === 'string' && userDetails.email.indexOf('@') > -1){
                acctIcon = object.itemUtil.User.gravatar(userDetails.email, 30, { 'className' : 'account-icon-image' }, 'mm');
            } else acctIcon = <i title="Signed In" className="account-icon icon icon-user" />;
        } else {
            acctIcon = <i className="account-icon icon icon-user-o" />;
        }

        return (
            <Nav className="navbar-acct" pullRight>
                <NavDropdown
                    className={'user-account-item' + (acctIcon && acctIcon.type === 'img' ? ' has-image' : '')} title={<span>{ acctIcon }{ acctTitle }</span>}
                    id="user_actions_dropdown" label="context" children={this.listUserActionsAsMenuItems()} />
            </Nav>
        );
    }
}


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
