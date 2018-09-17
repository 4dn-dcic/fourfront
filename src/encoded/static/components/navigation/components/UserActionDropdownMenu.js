'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';
import { JWT, console, layout, isServerSide, navigate, Filters, object, ajax } from './../../util';
import * as store from './../../../store';
import { LoginMenuItem } from './LoginMenuItem';


/**
 * @typedef {Object} Action
 * @property {string|function} url - URL of action. If function, takes in currentHref as parameter.
 * @property {string} title Title of action.
 * @property {boolean|function} active - Whether action is currently active.
 */

/**
 * React-Bootstrap Dropdown with User Action menu items.
 *
 * @todo Refactor this into a BigDropdown menu. Get rid of listActionsFor at some point from App.js.
 */
export class UserActionDropdownMenu extends React.Component {

    static propTypes = {
        'session'         : PropTypes.bool.isRequired,      /** Passed in by App */
        'listActionsFor'  : PropTypes.func.isRequired,      /** Passed in by App TODO: Make this a global function, or have it be in util/json-web-token.js */
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
                actions.push( <LoginMenuItem {..._.pick(this.props, 'closeMobileMenu', 'session', 'href', 'updateUserInfo')} key={action.id} setIsLoadingIcon={this.setIsLoading} /> );
            } else if (action.id === "accountactions-menu-item"){
                // link to registration page if logged out or account actions if logged in
                if (!this.props.session) {
                    actions.push(actionToMenuItem(action, mounted, href));
                } else {
                    // Account Actions
                    actions = actions.concat(_.map(listActionsFor('user'), function(action, idx){
                        return actionToMenuItem(action, mounted, href, {"data-no-cache" : true});
                    }));
                }
            } else if (action.id === "contextactions-menu-item") {
                // Context Actions
                actions = actions.concat(_.map(listActionsFor('context'), function(action){
                    return actionToMenuItem(_.extend( _.clone(action), { title : <span><i className="icon icon-pencil"></i> {action.title}</span> } ), mounted, href);
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



// Various utility functions

/**
 * Tests if an action is currently active, according to its URL or 'active' key.
 *
 * @param {Action} action - Action to test.
 * @param {boolean} mounted - Whether parent component is mounted or in a browser execution context.
 * @param {string} currentHref - Current URI, if available.
 * @returns {boolean} Whether this action is to be displayed as active or not. 
 */
export function isActionActive(action, mounted, currentHref){
    return (
        (typeof action.active === 'function' && action.active(getWindowPath(mounted, currentHref))) ||
        (getActionURL(action, mounted) === getWindowPath(mounted, currentHref))
    );
}

/**
 * Gets URL for an action. Handles cases where `action.url` is a function rather than a string and executes it.
 *
 * @param {Action} action - Action to test.
 * @param {boolean} [mounted=false] - Whether parent component is mounted or in a browser execution context.
 * @param {string} currentHref - Current URI, if available.
 * @returns {string} URL of action, or `#` if none available.
 */
export function getActionURL(action, mounted = false, currentHref){
    if (typeof action.url === 'string')     return action.url;
    if (typeof action.url === 'function')   return action.url(getWindowLocation(mounted, currentHref));
    if (typeof action.href === 'string')    return action.href;
    if (typeof action.href === 'function')  return action.href(getWindowLocation(mounted, currentHref));
    return '#';
}

/**
 * Renders out a React-Bootstrap MenuItem for an action.
 *
 * @param {Action} action - Action to test.
 * @param {boolean} mounted - Whether parent component is mounted or in a browser execution context.
 * @param {string} currentHref - Current URI, if available.
 * @param {Object} extraProps - Any extra props to add to MenuItem.
 * @returns {JSX.Element} A MenuItem instance.
 */
export function actionToMenuItem(action, mounted, currentHref, extraProps){
    return (
        <MenuItem key={action.id} href={getActionURL(action, mounted, currentHref)}
            onClick={function(e){ return e.target && typeof e.target.blur === 'function' && e.target.blur(); }}
            className="global-entry" active={isActionActive(action, mounted, currentHref)}
            children={action.title} {...extraProps} />
    );
}


/**
 * Renders out a React-Bootstrap NavDropdown for an action and/or its children.
 *
 * @param {Action} action - Action to test.
 * @param {boolean} mounted - Whether parent component is mounted or in a browser execution context.
 * @param {string} currentHref - Current URI, if available.
 * @returns {JSX.Element} A NavDropdown instance.
 */
export function buildDropdownMenu(action, mounted, currentHref){
    if (action.children){
        return (
            <NavDropdown key={action.id} id={action.id} label={action.id} title={action.title}
                children={_.map(action.children, function(actionChild){
                    return actionToMenuItem(actionChild, mounted, currentHref);
                })}/>
        );
    } else {
        return (
            <NavItem key={action.id} id={action.id} children={action.title}
                href={getActionURL(action, mounted, currentHref)}
                active={isActionActive(action, mounted, currentHref)} />
        );
    }
}



/**
 * @deprecated
 * @returns {number|null} Height of NavBar
 */
export function getCurrentNavHeight(){
    if (!isServerSide() && document){
        return parseInt(document.getElementById('top-nav').offsetHeight);
    }
    return null;
}


/**
 * May be bound to access this.props.href (if available) as fallback.
 * @deprecated
 */
export function getWindowPath(mounted, href = null){
    var windowLocation = getWindowLocation.call(this, mounted, href);
    if (!windowLocation) return null;
    return (windowLocation.pathname || '/') + (windowLocation.search || '') + (windowLocation.hash || '');
}

/**
 * May be bound to access this.props.href (if available) as fallback.
 * @deprecated
 */
export function getWindowURL(mounted, href = null){
    return getWindowLocation.call(this, mounted, href).href;
}


/**
 * May be bound to access this.props.href (if available) as fallback.
 * @deprecated
 */
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
