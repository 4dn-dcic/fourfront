'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';
import { JWT, console, layout, isServerSide, navigate, Filters, object, ajax } from './../../util';
import * as store from './../../../store';
import { LoginNavItem } from './LoginNavItem';


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
        'updateUserInfo'  : PropTypes.func.isRequired,      /** Passed in by App */
        'mounted'         : PropTypes.bool                  /** Passed in by Navigation */
    };

    constructor(props){
        super(props);
        this.performLogout = this.performLogout.bind(this);
        this.listUserActionsAsMenuItems = this.listUserActionsAsMenuItems.bind(this);
        this.state = { 'isLoading' : false };
    }

    /**
     * Removes JWT from cookies, as well as userInfo from localStorage
     * and then refreshes current view/href via navigate fxn.
     */
    performLogout(eventKey, e){
        var { session, updateUserInfo } = this.props;

        // Removes both idToken (cookie) and userInfo (localStorage)
        JWT.remove();

        if (!session) return;

        // Refetch page context without our old JWT to hide any forbidden content.
        updateUserInfo();
        navigate('', {'inPlace':true});

        if (typeof document !== 'undefined'){
            // Dummy click event to close dropdown menu, bypasses document.body.onClick handler (app.js -> App.prototype.handeClick)
            document.dispatchEvent(new MouseEvent('click'));
        }
    }

    /** Shown for logged in users. */
    listUserActionsAsMenuItems(){
        var { mounted, listActionsFor, href } = this.props;

        var actions = _.map(listActionsFor('user'), function(action){
            return actionToMenuItem(action, mounted, href, {"data-no-cache" : true});
        });

        actions.push(
            <MenuItem id="logoutbtn" onSelect={this.performLogout} className="global-entry">
                Log Out
            </MenuItem>
        );

        return actions;
    }

    render() {
        const session = this.props.session;
        let acctBtn = null;

        if (session){
            var userDetails = JWT.getUserDetails(),
                acctTitle = (userDetails && userDetails.first_name) || "Account",
                acctIcon = (userDetails && typeof userDetails.email === 'string' && userDetails.email.indexOf('@') > -1 && (
                    object.itemUtil.User.gravatar(userDetails.email, 30, { 'className' : 'account-icon-image' }, 'mm')
                )) || <i className="account-icon icon icon-user-o" />;
            acctBtn = (
                <NavDropdown className={'user-account-item is-logged-in is-dropdown' + (acctIcon && acctIcon.type === 'img' ? ' has-image' : '')}
                    title={<React.Fragment>{ acctIcon }{ acctTitle }</React.Fragment>} id="user_account_nav_button" label="context">
                    { this.listUserActionsAsMenuItems() }
                </NavDropdown>
            );
        } else {
            acctBtn = <LoginNavItem {..._.pick(this.props, 'session', 'href', 'updateUserInfo', 'overlaysContainer', 'schemas', 'windowWidth')} key="login-register" id="user_account_nav_button" />;
        }

        return <Nav className="navbar-acct" pullRight>{ acctBtn }</Nav>;
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
