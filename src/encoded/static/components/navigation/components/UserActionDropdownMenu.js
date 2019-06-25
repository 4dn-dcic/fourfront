'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { DropdownItem } from './../../forms/components/DropdownButton';
import { Nav, NavDropdown } from 'react-bootstrap';
import { JWT, isServerSide, navigate, object } from './../../util';
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
    performLogout(eventKey, eventObject){
        const { updateUserInfo } = this.props;

        // Removes both idToken (cookie) and userInfo (localStorage)
        JWT.remove();

        // Refetch page context without our old JWT to hide any forbidden content.
        updateUserInfo();
        navigate('', { 'inPlace':true });

        if (typeof document !== 'undefined'){
            // Dummy click event to close dropdown menu, bypasses document.body.onClick handler (app.js -> App.prototype.handeClick)
            document.dispatchEvent(new MouseEvent('click'));
        }
    }

    /** Shown for logged in users. */
    listUserActionsAsMenuItems(){
        const { listActionsFor, href } = this.props;
        const actions = _.map(listActionsFor('user'), function(action){
            return actionToMenuItem(action, href, { "data-no-cache" : true });
        });

        actions.push(
            <DropdownItem id="logoutbtn" onSelect={this.performLogout} className="global-entry">
                Log Out
            </DropdownItem>
        );

        return actions;
    }

    render() {
        const { session } = this.props;
        let acctBtn = null;

        if (session){
            const userDetails = JWT.getUserDetails();
            const acctTitle = (userDetails && userDetails.first_name) || "Account";
            const acctIcon = (userDetails && typeof userDetails.email === 'string' && userDetails.email.indexOf('@') > -1 && (
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
 * @param {string} currentHref - Current URI, if available.
 * @returns {boolean} Whether this action is to be displayed as active or not.
 */
export function isActionActive(action, currentHref){
    const hrefParts = url.parse(currentHref);
    const hrefPath = (hrefParts.pathname || '/') + (hrefParts.search || '');
    return (
        (typeof action.active === 'function' && action.active(hrefPath)) ||
        (getActionURL(action, currentHref) === hrefPath)
    );
}

/**
 * Gets URL for an action. Handles cases where `action.url` is a function rather than a string and executes it.
 *
 * @param {Action} action - Action to test.
 * @param {string} currentHref - Current URI, if available.
 * @returns {string} URL of action, or `#` if none available.
 */
export function getActionURL(action, currentHref){
    if (typeof action.url === 'string')     return action.url;
    if (typeof action.href === 'string')    return action.href;

    const hrefParts = url.parse(currentHref);
    if (typeof action.url === 'function')   return action.url(hrefParts);
    if (typeof action.href === 'function')  return action.href(hrefParts);
    return '#';
}

/**
 * Renders out a React-Bootstrap MenuItem for an action.
 *
 * @param {Action} action - Action to test.
 * @param {string} currentHref - Current URI, if available.
 * @param {Object} extraProps - Any extra props to add to MenuItem.
 * @returns {JSX.Element} A MenuItem instance.
 */
export function actionToMenuItem(action, currentHref, extraProps){
    return (
        <DropdownItem key={action.id} href={getActionURL(action, currentHref)} onClick={actionToMenuItem.onClick}
            className="global-entry" active={isActionActive(action, currentHref)} {...extraProps}>
            { action.title }
        </DropdownItem>
    );
}
actionToMenuItem.onClick = function(e){
    return e.target && typeof e.target.blur === 'function' && e.target.blur();
};



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
