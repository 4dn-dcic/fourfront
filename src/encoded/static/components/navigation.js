'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import { Navbars, Navbar, Nav, NavItem, NavDropdown, MenuItem, Checkbox, DropdownButton, Fade, Collapse } from 'react-bootstrap';
import _ from 'underscore';
import Login from './login';
import * as store from '../store';
import { JWT, console, layout, isServerSide, navigate, Filters, object, ajax } from './util';
import { requestAnimationFrame } from './viz/utilities';
import QuickInfoBar from './viz/QuickInfoBar';
import { ChartDataController } from './viz/chart-data-controller';
import TestWarning from './testwarning';
import { productionHost } from './globals';

// TODO: Break this up into a folder with separate file for SearchBar, BigDropDown (maybe), ...


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


    static isMenuItemActive(action, mounted, currentHref){
        return (
            (typeof action.active === 'function' && action.active(getWindowPath(mounted, currentHref))) ||
            (Navigation.getMenuItemURL(action, mounted) === getWindowPath(mounted, currentHref))
        );
    }

    static getMenuItemURL(action, mounted = false, currentHref){
        if (typeof action.url === 'string') return action.url;
        if (typeof action.url === 'function') return action.url(getWindowLocation(mounted, currentHref));
        if (typeof action.href === 'string') return action.href;
        if (typeof action.href === 'function') return action.href(getWindowLocation(mounted, currentHref));
        return '#';
    }

    /** Can be bound to access this.props.href for getWindowPath (if available) */
    static buildMenuItem(action, mounted, currentHref, extraProps){
        return (
            <MenuItem
                key={action.id}
                id={action.sid || action.id}
                href={Navigation.getMenuItemURL(action, mounted, currentHref)}
                onClick={function(e){ return e.target && typeof e.target.blur === 'function' && e.target.blur(); }}
                className="global-entry"
                active={Navigation.isMenuItemActive(action, mounted, currentHref)}
                children={action.title}
                {...extraProps}
            />
        );
    }

    /** Can be bound to access this.props.href for getWindowPath (if available) */
    static buildDropdownMenu(action, mounted, currentHref){
        if (action.children){
            return (
                <NavDropdown key={action.id} id={action.sid || action.id} label={action.id} title={action.title}>
                    { _.map(action.children, function(actionChild){ return Navigation.buildMenuItem(actionChild, mounted, currentHref); }) }
                </NavDropdown>
            );
        } else {
            return (
                <NavItem
                    key={action.id}
                    id={action.sid || action.id}
                    href={Navigation.getMenuItemURL(action, mounted, currentHref)}
                    active={Navigation.isMenuItemActive(action, mounted, currentHref)}
                    children={action.title}
                />
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

    static defaultProps = {
        'helpItemTreeURI' : '/pages/311d0f4f-56ee-4450-8cbb-780c10229284/@@embedded',
        'helpItemHref' : '/help'
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.setupScrollHandler = this.setupScrollHandler.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.hideTestWarning = this.hideTestWarning.bind(this);
        this.closeMobileMenu = this.closeMobileMenu.bind(this);
        this.loadHelpMenuTree = this.loadHelpMenuTree.bind(this);
        this.setOpenDropdownID = _.throttle(this.setOpenDropdownID.bind(this), 500);
        this.state = {
            'testWarning'           : this.props.visible || !productionHost[url.parse(this.props.href).hostname] || false,
            'mounted'               : false,
            'mobileDropdownOpen'    : false,
            'scrolledPastTop'       : false,
            'navInitialized'        : false,
            'openDropdown'          : null,
            'helpMenuTree'          : null,
            'isLoadingHelpMenuTree' : false
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
        if (!isServerSide()) {
            this.setupScrollHandler();
            if (!this.state.helpMenuTree && !this.state.isLoadingHelpMenuTree){
                this.loadHelpMenuTree();
            }
        }
    }

    componentDidUpdate(prevProps, prevState){
        if (typeof this.props.session === 'boolean' && this.props.session !== prevProps.session){
            this.loadHelpMenuTree({ 'openDropdown' : null });
        }
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

            if ( // Fixed nav takes effect at medium grid breakpoint or wider.
                ['xs','sm'].indexOf(layout.responsiveGridState()) === -1 && (
                    (currentScrollTop > 20 && scrollVector >= 0) ||
                    (currentScrollTop > 80)
                )
            ){
                if (!this.state.scrolledPastTop){
                    stateChange.scrolledPastTop = true;
                    this.setState(stateChange, layout.toggleBodyClass.bind(layout, 'scrolled-past-top', true, document.body));
                }
                if (currentScrollTop > 80) layout.toggleBodyClass('scrolled-past-80', true, document.body);
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

    render() {
        var { testWarning, navInitialized, scrolledPastTop, mobileDropdownOpen, mounted, helpMenuTree, isLoadingHelpMenuTree, openDropdown } = this.state;
        var { href, context, listActionsFor, session, updateUserInfo, schemas, browseBaseState } = this.props;

        var navClass = "navbar-container" + (testWarning ? ' test-warning-visible' : '') + (navInitialized ? ' nav-initialized' : '') + (scrolledPastTop ? " scrolled-past-top" : " scrolled-at-top") +
            (openDropdown ? ' big-menu-open' : '');

        var primaryActions = listActionsFor('global_sections');
        var browseMenuItemOpts = _.findWhere(primaryActions, { 'id' : 'browse-menu-item' });
        var windowInnerWidth = (mounted && !isServerSide() && typeof window !== 'undefined' && window.innerWidth) || 0;
        var windowInnerHeight =  (windowInnerWidth && window.innerHeight) || 500;
        var includeBigDropDownMenuComponents = helpMenuTree && (helpMenuTree.children || []).length > 0 && windowInnerWidth >= 768;

        return (
            <div className={navClass}>
                { includeBigDropDownMenuComponents ? <div className="big-dropdown-menu-background" onClick={this.setOpenDropdownID.bind(this, null)} /> : null }
                <div id="top-nav" className="navbar-fixed-top">
                    <TestWarning visible={testWarning} setHidden={this.hideTestWarning} href={href} />
                    <Navbar fixedTop={false /* Instead we make the navbar container fixed */} label="main" className="navbar-main" id="navbar-icon" onToggle={(open)=>{
                        this.setState({ 'mobileDropdownOpen' : open });
                    }} expanded={mobileDropdownOpen}>
                        <Navbar.Header>
                            <Navbar.Brand>
                                <NavItem href="/" onClick={(e)=>{ this.setOpenDropdownID(null); }}>
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
                                { browseMenuItemOpts ? 
                                    <NavItem
                                        key={browseMenuItemOpts.id}
                                        id={browseMenuItemOpts.sid || browseMenuItemOpts.id}
                                        href={Navigation.getMenuItemURL(browseMenuItemOpts, mounted, href)}
                                        active={Navigation.isMenuItemActive(browseMenuItemOpts, mounted, href)}
                                        children={browseMenuItemOpts.title || "Browse"}
                                    />
                                : null }
                                <HelpNavMenuItem {...this.props} {...{ windowInnerWidth, windowInnerHeight, mobileDropdownOpen, helpMenuTree, isLoadingHelpMenuTree, mounted }} setOpenDropdownID={this.setOpenDropdownID} openDropdownID={openDropdown} />
                            </Nav>
                            {/*<Nav children={_.map(listActionsFor('global_sections'), function(a){ return Navigation.buildDropdownMenu(a, mounted, href); })} />*/}
                            <UserActions closeMobileMenu={this.closeMobileMenu} {...{ session, href, updateUserInfo, listActionsFor, mounted }} />
                            <SearchBar href={href} />
                        </Navbar.Collapse>
                    </Navbar>
                    { includeBigDropDownMenuComponents ?
                        <BigDropDownMenu {...this.props} {...{ windowInnerWidth, windowInnerHeight, mobileDropdownOpen, helpMenuTree, isLoadingHelpMenuTree, mounted, scrolledPastTop, testWarning }} setOpenDropdownID={this.setOpenDropdownID} openDropdownID={openDropdown} />
                    : null }
                    <ChartDataController.Provider id="quick_info_bar1">
                        <QuickInfoBar href={href} schemas={schemas} context={context} browseBaseState={browseBaseState} invisible={!!(openDropdown)} />
                    </ChartDataController.Provider>
                </div>
            </div>
        );
    }
}

class HelpNavMenuItem extends React.PureComponent {

    static defaultProps = {
        'id' : 'help-menu-item'
    };

    constructor(props){
        super(props);
        this.handleToggleOpen = this.handleToggleOpen.bind(this);
    }

    handleToggleOpen(e){
        if (typeof this.props.setOpenDropdownID !== 'function') throw new Error('No func setOpenDropdownID passed in props.');
        var idToSet = this.props.openDropdownID === this.props.id ? null : this.props.id;
        this.props.setOpenDropdownID(idToSet);
    }

    render(){
        var { mounted, href, session, context, helpItemHref, id, openDropdownID, helpMenuTree, isLoadingHelpMenuTree, windowInnerWidth } = this.props;

        var isOpen = openDropdownID === id;
        var active = href.indexOf(helpItemHref) > -1;
        var commonProps = { 'key' : id, 'id' : id, 'active' : active };
        var isDesktopView = windowInnerWidth >= 768;

        if (!helpMenuTree || (helpMenuTree.children || []).length === 0 || !mounted || !isDesktopView){
            return (
                <NavItem
                    {...commonProps}
                    href={helpItemHref}
                    children="Help"
                />
            );
        }

        return (
            <NavItem {...commonProps} onClick={this.handleToggleOpen} className={isOpen ? 'dropdown-open-for' : null}>
                Help <span className="caret"/>
            </NavItem>
        );

    }

}


class BigDropDownMenu extends React.Component {

    constructor(props){
        super(props);
        this.handleMenuItemClick = this.handleMenuItemClick.bind(this);
        this.renderMenuItems = this.renderMenuItems.bind(this);
        this.state = {
            "isClosing" : true
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.openDropdownID === null && this.props.openDropdownID !== null){
            this.setState({ 'isClosing' : true }, ()=>{
                setTimeout(()=>{
                    this.setState({ 'isClosing' : false });
                }, 500);
            });
        }
    }

    handleMenuItemClick(e){
        setTimeout(this.props.setOpenDropdownID.bind(this.props.setOpenDropdownID, null), 100);
        // TODO: Google Analytics Hook-In
    }

    renderMenuItems(){
        var { openDropdownID, helpMenuTree, windowInnerWidth, href, setOpenDropdownID } = this.props;
        var handleMenuItemClick = this.handleMenuItemClick;
        /*
        var mostChildrenHaveChildren = _.filter(helpMenuTree.children, function(c){
            return (c.children || []).length > 0;
        }).length >= parseInt(helpMenuTree.children.length / 2);
        */

        var urlParts = url.parse(href);

        function filterOutChildren(child){
            return !child.error && child.display_title && child.name;
        }

        var level1ChildrenToRender = _.filter(helpMenuTree.children, function(child){
            var childValid = filterOutChildren(child);
            if (!childValid) return false;
            if ((child.content || []).length > 0) return true;
            if ((child.children || []).length === 0) return false;
            var filteredChildren = _.filter(child.children || [], filterOutChildren);
            if (filteredChildren.length > 0) return true;
            return false;
        });

        function childColumnsRenderer(childLevel1){
            var level1Children = _.filter(childLevel1.children || [], filterOutChildren);
            var hasChildren = level1Children.length > 0;
            return (
                <div className={"help-menu-tree level-1 col-xs-12 col-sm-6 col-md-4" + (hasChildren ? ' has-children' : '')} key={childLevel1.name}>
                    <div className="level-1-title-container">
                        <a className="level-1-title text-medium" href={'/' + childLevel1.name} data-tip={childLevel1.description}
                            data-delay-show={1000} onClick={handleMenuItemClick}>
                            { childLevel1.display_title }
                        </a>
                    </div>
                    { hasChildren ?
                        _.map(level1Children, function(childLevel2){
                            return (
                                <a className={"level-2-title text-small" + (urlParts.pathname.indexOf(childLevel2.name) > -1 ? ' active' : '')}
                                    href={'/' + childLevel2.name} data-tip={childLevel2.description} data-delay-show={1000}
                                    key={childLevel2.name} onClick={handleMenuItemClick}>
                                    { childLevel2.display_title }
                                </a>
                            );
                        })
                    : null }
                </div>
            );
        }

        var columnsPerRow = 3;
        if (windowInnerWidth >= 768 && windowInnerWidth < 992) columnsPerRow = 2;
        else if (windowInnerWidth < 768) columnsPerRow = 1;


        var rowsOfLevel1Children = [];
        _.forEach(level1ChildrenToRender, function(child, i, all){
            var groupIdx = parseInt(i / columnsPerRow);
            if (!Array.isArray(rowsOfLevel1Children[groupIdx])) rowsOfLevel1Children.push([]);
            rowsOfLevel1Children[groupIdx].push(child);
        });

        return _.map(rowsOfLevel1Children, function(childrenInRow, rowIdx){
            return <div className="row help-menu-row" key={rowIdx} children={_.map(childrenInRow, childColumnsRenderer)}/>;
        });
    }

    introSection(){
        var { helpMenuTree, windowInnerHeight } = this.props;
        if (!helpMenuTree || !helpMenuTree.display_title || !helpMenuTree.description || windowInnerHeight < 800) return null;
        return (
            <div className="intro-section">
                <h4><a href={'/' + helpMenuTree.name} onClick={this.handleMenuItemClick}>{ helpMenuTree.display_title }</a></h4>
                <div className="description">{ helpMenuTree.description }</div>
            </div>
        );
    }

    render(){
        var { openDropdownID, windowInnerWidth, windowInnerHeight, scrolledPastTop, testWarning } = this.props;
        if (!openDropdownID && !this.state.isClosing) return null;
        var outerStyle = null;
        if (windowInnerWidth >= 992){
            outerStyle = { 'maxHeight' : windowInnerHeight - (scrolledPastTop ? 40 : 80) - (testWarning ? 52 : 0) };
        }
        return (
            <Collapse in={!!openDropdownID} transitionAppear>
                <div className={"big-dropdown-menu" + (openDropdownID ? ' is-open' : '')} data-open-id={openDropdownID} style={outerStyle}>
                    <div className="container">
                        { this.introSection() }
                        { this.renderMenuItems() }
                    </div>
                </div>
            </Collapse>
        );
    }

}


class SearchBar extends React.Component{

    static renderHiddenInputsForURIQuery(query){
        return _.flatten(_.map(
            _.pairs(query),
            function(qp){
                if (Array.isArray(qp[1])){
                    return _.map(qp[1], function(queryValue, idx){
                        return <input key={qp[0] + '.' + idx} type="hidden" name={qp[0]} value={queryValue} />;
                    });
                } else {
                    return <input key={qp[0]} type="hidden" name={qp[0]} value={qp[1]} />;
                }
            }
        ));
    }

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
            'searchAllItems' : props.href && navigate.isSearchHref(props.href),
            'typedSearchQuery' : initialQuery
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.href !== this.props.href){
            var query = Filters.searchQueryStringFromHref(nextProps.href) || '';
            if (query !== this.state.typedSearchQuery){
                this.setState({ 'typedSearchQuery' : query });
            }
        }
    }

    hasInput(typedSearchQuery = this.state.typedSearchQuery){
        return (typedSearchQuery && typeof typedSearchQuery === 'string' && typedSearchQuery.length > 0) || false;
    }

    toggleSearchAllItems(willSearchAllItems = !this.state.searchAllItems){
        this.setState({ 'searchAllItems' : willSearchAllItems }, ()=>{
            this.refs && this.refs.form && this.refs.form.dispatchEvent(new Event('submit', { bubbles : true }) );
        });
    }

    onSearchInputChange(e){
        var newValue = e.target.value;
        var state = { 'typedSearchQuery' : newValue };
        if (!this.hasInput(newValue)) {
            state.searchAllItems = false;
        }
        this.setState(state);
    }

    onSearchInputBlur(e){
        var lastQuery = Filters.searchQueryStringFromHref(this.props.href);
        if (this.hasInput(lastQuery) && !this.hasInput(this.state.typedSearchQuery)) {
            this.setState({ 'typedSearchQuery' : lastQuery });
        }
        
    }

    onResetSearch (e){
        var id = url.parse(this.props.href, true);
        if (typeof id.search === 'string'){
            delete id.query['q'];
            delete id.search;
        }
        var resetHref = url.format(id);
        this.setState({ 'searchAllItems' : false, 'typedSearchQuery' : '' }, navigate.bind(navigate, resetHref));
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
                    <MenuItem eventKey='sets' data-key="sets" active={!this.state.searchAllItems}>
                        Experiment Sets
                    </MenuItem>
                    <MenuItem eventKey='all' data-key="all" active={this.state.searchAllItems}>
                        All Items (advanced)
                    </MenuItem>
                </DropdownButton>
            </Fade>
        );
    }

    render() {
        var { searchAllItems, typedSearchQuery } = this.state;
        var id = url.parse(this.props.href, true);
        var searchQueryFromHref = (id && id.query && id.query.q) || '';
        var resetIconButton = null;
        var searchBoxHasInput = this.hasInput();

        if (searchQueryFromHref){
            resetIconButton = <i className="reset-button icon icon-close" onClick={this.onResetSearch}/>;
        }

        var query = {};
        var browseBaseParams = navigate.getBrowseBaseParams();
        if (searchAllItems) {   // Don't preserve facets.
            _.extend(query, { 'type' : 'Item' });
        } else {                // Preserve facets?
            _.extend(query, _.omit(id.query || {}, 'q'), browseBaseParams);
        }
        
        return (
            <form
                className={"navbar-search-form-container navbar-form navbar-right" + (searchQueryFromHref ? ' has-query' : '') + (this.hasInput() ? ' has-input' : '')}
                action={searchAllItems ? "/search/" : "/browse/" }
                method="GET"
                ref="form"
            >
                {/*<Checkbox className="toggle-all-items-search" checked={this.state.searchAllItems} onChange={this.toggleSearchAllItems}>&nbsp; All Items</Checkbox>*/}
                { this.selectItemTypeDropdown(!!(searchBoxHasInput || searchQueryFromHref)) }
                <input className="form-control search-query" id="navbar-search" type="search" placeholder="Search"
                    ref="q" name="q" value={typedSearchQuery} onChange={this.onSearchInputChange} key="search-input" onBlur={this.onSearchInputBlur} />
                { resetIconButton }
                { SearchBar.renderHiddenInputsForURIQuery(query) }
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
                    className={'user-account-item' + (this.props.session ? ' is-logged-in' : '') + (acctIcon && acctIcon.type === 'img' ? ' has-image' : '')} title={<span>{ acctIcon }{ acctTitle }</span>}
                    id="user_actions_dropdown" label="context" children={this.listUserActionsAsMenuItems()} />
            </Nav>
        );
    }
}

