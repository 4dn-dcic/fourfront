'use strict';
var React = require('react');
var url = require('url');
var Login = require('./login');
var { Navbars, Navbar, Nav, NavItem, NavDropdown, MenuItem } = require('react-bootstrap');
var _ = require('underscore');
var store = require('../store');
var { responsiveGridState, JWT, console } = require('./objectutils');
var TestWarning = require('./testwarning');
var productionHost = require('./globals').productionHost;


var Navigation = module.exports = React.createClass({

    statics : {

        /** May be bound to access this.props.href (if available) as fallback */
        getWindowUrl : function(mounted){
            var href;
            if (this && this.props && this.props.href) {
                href = url.parse(this.props.href);
            }
            if (mounted && typeof window === 'object' && window && typeof window.location !== 'undefined'){
                href = window.location;
            }
            if (!href) return null;
            return (href.pathname || '/') + (href.search || '') + (href.hash || '');
        },

        /** Can be bound to access this.props.href for getWindowUrl (if available) */
        buildMenuItem : function(action, mounted, extraProps){
            return (
                <MenuItem
                    key={action.id}
                    id={action.sid || action.id}
                    href={action.url || action.href || '#'}
                    className="global-entry"
                    active={
                        (action.url && action.url === Navigation.getWindowUrl.call(this, mounted)) ||
                        (action.href && action.href === Navigation.getWindowUrl.call(this, mounted))
                    }
                    {...extraProps}
                >
                    {action.title}
                </MenuItem>
            );
        },

        /** Can be bound to access this.props.href for getWindowUrl (if available) */
        buildDropdownMenu : function(action, mounted){
            if (action.children){
                return (
                    <NavDropdown key={action.id} id={action.sid || action.id} label={action.id} title={action.title}>
                        {action.children.map((a) => Navigation.buildMenuItem(a, mounted) )}
                    </NavDropdown>
                );
            } else {
                return (
                    <NavItem key={action.id} id={action.sid || action.id} href={action.url || action.href || '#'} active={
                        (action.url && action.url === Navigation.getWindowUrl.call(this, mounted)) ||
                        (action.href && action.href === Navigation.getWindowUrl.call(this, mounted))
                    }>
                        {action.title}
                    </NavItem>
                );
            }
        }
    },

    propTypes : {
        href : React.PropTypes.string,
        session : React.PropTypes.bool
    },

    contextTypes: {
        portal: React.PropTypes.object,
        listActionsFor : React.PropTypes.func
    },

    getInitialState: function() {
        return {
            testWarning: this.props.visible || !productionHost[url.parse(this.props.href).hostname] || false,
            mounted : false,
            mobileDropdownOpen : false,
            scrolledPastTop : false,
            navInitialized : false
        };
    },

    componentDidMount : function(){
        this.setState({ mounted : true });
        this.setupScrollHandler();
    },

    setupScrollHandler : function(){
        if (!(typeof window !== 'undefined' && window && document && document.body && typeof document.body.scrollTop !== 'undefined')){
            return null;
        }

        var lastScrollTop = 0;

        // We add as property of class instance so we can remove event listener on unmount, for example.
        this.throttledScrollHandler = _.throttle((e) => {
            var stateChange = {};
            if (!this.state.navInitialized){
                stateChange.navInitialized = true;
            }
            
            var scrollVector = document.body.scrollTop - lastScrollTop;
            lastScrollTop = document.body.scrollTop;

            if (
                ['xs','sm'].indexOf(responsiveGridState()) === -1 && // Fixed nav takes effect at medium grid breakpoint or wider.
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
            } else {
                if (this.state.scrolledPastTop){
                    stateChange.scrolledPastTop = false;
                    this.setState(stateChange, function(){
                        if (document.body.className.indexOf(' scrolled-past-top') !== -1) document.body.className = document.body.className.replace(' scrolled-past-top', '');
                    });
                }
            }
        }, 100);

        // Save logo/brand element's 'full width' before any height transitions.
        // Ideally wait until logo/brand image has loaded before doing so.
        var navBarBrandImg = document.getElementsByClassName('navbar-logo-image')[0];

        function saveWidth(){
            var navBarBrandImgContainer = navBarBrandImg.parentNode;
            var navBarBrand = navBarBrandImgContainer.parentNode.parentNode;
            navBarBrand.style.width = ''; // Clear any earlier width
            if (['xs','sm'].indexOf(responsiveGridState()) !== -1) return; // If mobile / non-fixed nav width
            //navBarBrandImgContainer.style.width = navBarBrandImgContainer.offsetWidth + 'px'; // Enable to fix width of logo to its large size.
            navBarBrand.style.width = navBarBrand.offsetWidth + 'px';
        };

         this.throttledResizeHandler = _.throttle(saveWidth, 300);

        navBarBrandImg.addEventListener('load', saveWidth);
        // Execute anyway in case image is loaded, in addition to the 1 time on-img-load if any (some browsers do not support img load event; it's not part of W3 spec).
        // Alternatively we can define width in stylesheet (e.g. 200px)
        saveWidth();

        window.addEventListener("scroll", this.throttledScrollHandler);
        window.addEventListener("resize", this.throttledResizeHandler);
        setTimeout(this.throttledScrollHandler, 100, null, { 'navInitialized' : true });
    },

    componentWillUnmount : function(){
        // Unbind events | probably not needed but lets be safe & cleanup.
        window.removeEventListener("resize", this.throttledResizeHandler);
        window.removeEventListener("scroll", this.throttledScrollHandler);
        delete this.throttledResizeHandler;
        delete this.throttledScrollHandler;
    },

    closeMobileMenu : function(){
        if (this.state.mobileDropdownOpen) this.setState({ mobileDropdownOpen : false });
    },

    closeDropdowns : function(){
        if (!this.state.mounted) return;
        //this.
    },

    hideTestWarning: function(e) {
        // Remove the warning banner because the user clicked the close icon
        this.setState({testWarning: false});

        // If collection with .sticky-header on page, jiggle scroll position
        // to force the sticky header to jump to the top of the page.
        var hdrs = document.getElementsByClassName('sticky-header');
        if (hdrs.length) {
            window.scrollBy(0,-1);
            window.scrollBy(0,1);
        }
    },

    render: function() {
        var portal = this.context.portal;

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
                    <TestWarning visible={this.state.testWarning} setHidden={this.hideTestWarning} />
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
                            <Nav>{ this.context.listActionsFor('global_sections').map((a)=> Navigation.buildDropdownMenu.call(this, a, this.state.mounted) ) }</Nav>
                            <UserActions mounted={this.state.mounted} closeMobileMenu={this.closeMobileMenu} session={this.props.session} />
                            {/* REMOVE SEARCH FOR NOW: <Search href={this.props.href} /> */}
                        </Navbar.Collapse>
                    </Navbar>
                </div>
            </div>
        );
    }
});


var Search = React.createClass({

    render: function() {
        var id = url.parse(this.props.href, true);
        var searchTerm = id.query['searchTerm'] || '';
        return (
            <form className="navbar-form navbar-right" action="/search/">
                <input className="form-control search-query" id="navbar-search" type="text" placeholder="Search..."
                    ref="searchTerm" name="searchTerm" defaultValue={searchTerm} key={searchTerm} />
            </form>
        );
    }
});


var UserActions = React.createClass({

    propTypes : {
        session: React.PropTypes.bool
    },

    contextTypes: {
        listActionsFor: React.PropTypes.func
    },

    render: function() {
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
                <i title={session ? "Signed In" : null} className={"icon icon-user" + (session ? "" : "-o")}></i>&nbsp; { acctTitle }
            </span>
        );

        var actions = [];
        this.context.listActionsFor('user_section').forEach((action) => {
            if (action.id === "login"){
                actions.push(<Login key={action.id} navCloseMobileMenu={this.props.closeMobileMenu} />);
            } else if (action.id === "accountactions"){
                // link to registration page if logged out or account actions if logged in
                if (!session) {
                    actions.push(Navigation.buildMenuItem.call(this, action, this.props.mounted));
                } else {
                    // Account Actions
                    actions = actions.concat(this.context.listActionsFor('user').map((action, idx) => {
                        return Navigation.buildMenuItem.call(this, action, this.props.mounted, {"data-no-cache" : true});
                    }));
                }
            } else if (action.id === "contextactions") {
                // Context Actions
                actions = actions.concat(this.context.listActionsFor('context').map((action) => {
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
});



// Display breadcrumbs with contents given in 'crumbs' object.
// Each crumb in the crumbs array: {
//     id: Title string to display in each breadcrumb. If falsy, does not get included, not even as an empty breadcrumb
//     query: query string property and value, or null to display unlinked id
//     uri: Alternative to 'query' property. Specify the complete URI instead of accreting query string variables
//     tip: Text to display as part of uri tooltip.
//     wholeTip: Alternative to 'tip' property. The complete tooltip to display
// }
var Breadcrumbs = module.exports.Breadcrumbs = React.createClass({
    propTypes: {
        root: React.PropTypes.string, // Root URI for searches
        crumbs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired // Object with breadcrumb contents
    },

    render: function() {
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
});
