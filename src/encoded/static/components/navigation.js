'use strict';
var React = require('react');
var url = require('url');
var Login = require('./login');
var { Navbars, Navbar, Nav, NavItem, NavDropdown, MenuItem } = require('react-bootstrap');
var _ = require('underscore');
var TestWarning = require('./testwarning');
var productionHost = require('./globals').productionHost;


var Navigation = module.exports = React.createClass({

    statics : {

        buildMenuItem : function(action){
            return (
                <MenuItem key={action.id} id={action.sid || action.id} href={action.url || '#'} className="global-entry">
                    {action.title}
                </MenuItem>
            );
        },

        buildDropdownMenu : function(action){
            if (action.children){
                return (
                    <NavDropdown key={action.id} id={action.sid || action.id} label={action.id} title={action.title}>
                        {action.children.map(Navigation.buildMenuItem)}
                    </NavDropdown>
                );
            } else {
                return (
                    <NavItem key={action.id} id={action.sid || action.id} href={action.url ? action.url : '#'}>
                        {action.title}
                    </NavItem>
                );
            }
        }
    },

    contextTypes: {
        location_href: React.PropTypes.string,
        portal: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            testWarning: this.props.visible || !productionHost[url.parse(this.context.location_href).hostname] || false
        };
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
        return (
            <div className={"navbar-container" + (this.state.testWarning ? " test-warning-visible" : "")}>
                <div id="navbar" className="navbar navbar-fixed-top navbar-inverse">
                    <TestWarning visible={this.state.testWarning} setHidden={this.hideTestWarning} />
                    <Navbar label="main" className="navbar-main" id="navbar-icon">
                        <Navbar.Header>
                            <Navbar.Brand>
                                <NavItem href="/" style={{ display : 'block' }}>
                                    <img src="/static/img/4dn_logo.svg" className="navbar-logo-image"/>
                                </NavItem>
                            </Navbar.Brand>
                        </Navbar.Header>
                        <GlobalSections />
                        <UserActions pullRight />
                        {/* REMOVE SEARCH FOR NOW: <Search />*/}
                    </Navbar>
                </div>
            </div>
        );
    }
});



// Main navigation menus
var GlobalSections = React.createClass({
    contextTypes: {
        listActionsFor: React.PropTypes.func,
    },
    render: function() {
        return <Nav {...this.props}>{ this.context.listActionsFor('global_sections').map(Navigation.buildDropdownMenu) }</Nav>;
    }
});


// Context actions: mainly for editing the current object
var ContextActions = React.createClass({
    contextTypes: {
        listActionsFor: React.PropTypes.func
    },

    render: function() {
        if (actions.length === 0) {
            // No actions
            return(<a href="#" className="invis"/>);
        }

        return (
            <ul className="custom-entry">{ 
                this.context.listActionsFor('context').map(function(action) {
                    return Navigation.buildMenuItem(_.extend(_.clone(action), { title : <span><i className="icon icon-pencil"></i> {action.title}</span> }));
                })
            }</ul>
        );
    }
});

var Search = React.createClass({
    contextTypes: {
        location_href: React.PropTypes.string
    },

    render: function() {
        var id = url.parse(this.context.location_href, true);
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
    contextTypes: {
        listActionsFor: React.PropTypes.func,
        session: React.PropTypes.bool
    },

    render: function() {
        var session = this.context.session;
        var acctTitle = (
            <span>
                <i title={session ? "Signed In" : null} className={"icon icon-user" + (session ? "" : "-o")}></i>&nbsp; Account
            </span>
        );

        function actions(){
            return this.context.listActionsFor('user_section').map(function (action) {
                if (action.id === "login"){
                    return(<Login key={action.id} />);
                } else if (action.id === "accountactions"){
                    // link to registration page if logged out or account actions if logged in
                    if (!session) {
                        return Navigation.buildMenuItem(action);
                    } else {
                        return(<AccountActions key={action.id} />);
                    }
                }else if (action.id === "contextactions") {
                    return(<ContextActions key={action.id} />);
                }
            });
        }

        return (
            <Nav className="navbar-acct" {...this.props}>
                <NavDropdown id="context" label="context" title={acctTitle} >
                    { actions.call(this) }
                </NavDropdown>
            </Nav>
        );
    }
});

var AccountActions = React.createClass({
    contextTypes: {
        listActionsFor: React.PropTypes.func,
        session: React.PropTypes.bool
    },

    render: function() {
        if (!this.context.session) {
            // Logged out, so no user menu at all
            return null;
        }
        var actions = this.context.listActionsFor('user').map(function (action, idx) {
            return Navigation.buildMenuItem(action);
        });
        return (
            <li key="account-actions" className="custom-entry">
                <ul>{actions}</ul>
            </li>
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
