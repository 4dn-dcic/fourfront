'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { Nav, NavDropdown, Dropdown } from 'react-bootstrap';

import { JWT, isServerSide, object, console } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { LoginController, LogoutController } from '@hms-dbmi-bgm/shared-portal-components/src/components/navigation/components/LoginController';

import { LoginNavItem, LogoutDropdownItem } from './LoginNavItem';



/**
 * @typedef {Object} Action
 * @property {string|function} url - URL of action. If function, takes in currentHref as parameter.
 * @property {string} title Title of action.
 * @property {boolean|function} active - Whether action is currently active.
 */

/**
 * React-Bootstrap Dropdown with User Action menu items.
 *
 * @todo Refactor this into a BigDropdown menu.
 */
export const UserActionDropdownMenu = React.memo(function UserActionDropdownMenu(props){
    const { session, href, updateUserInfo } = props;
    let acctBtn = null;

    if (session){
        const { details: userDetails = {}, user_actions: userActions = [] } = JWT.getUserInfo() || {};
        const { first_name: acctTitle = "Account", email } = userDetails;
        const acctIcon = (typeof email === 'string' && email.indexOf('@') > -1 && (
            object.itemUtil.User.gravatar(email, 30, { 'className' : 'account-icon-image' }, 'mm')
        )) || <i className="account-icon icon icon-user-o" />;
        const cls = 'user-account-item is-logged-in is-dropdown' + (acctIcon && acctIcon.type === 'img' ? ' has-image' : '');

        const renderedActions = _.map(userActions, function(action){
            return (
                <Dropdown.Item key={action.id} href={getActionURL(action, href)} onClick={actionToMenuItemOnClick}
                    className="global-entry" active={isActionActive(action, href)} data-no-cache="true">
                    { action.title }
                </Dropdown.Item>
            );
        });

        acctBtn = (
            <NavDropdown className={cls} title={
                <React.Fragment>
                    { acctIcon }
                    <span className="text-ellipsis-container">{ acctTitle }</span>
                </React.Fragment>
            } label="context">
                { renderedActions }
                <LogoutController updateUserInfo={updateUserInfo}>
                    <LogoutDropdownItem/>
                </LogoutController>
            </NavDropdown>
        );
    } else {
        acctBtn = (
            <LoginController {..._.pick(props, 'session', 'href', 'updateUserInfo', 'overlaysContainer', 'schemas', 'windowWidth')}>
                <LoginNavItem key="login-register" className="user-account-item" />
            </LoginController>
        );
    }

    return <Nav className="navbar-acct">{ acctBtn }</Nav>;
});
UserActionDropdownMenu.propTypes = {
    'session'         : PropTypes.bool.isRequired,      /** Passed in by App */
    'href'            : PropTypes.string.isRequired,    /** Passed in by Redux store */
    'updateUserInfo'  : PropTypes.func.isRequired,      /** Passed in by App */
    'mounted'         : PropTypes.bool                  /** Passed in by Navigation */
};



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


function actionToMenuItemOnClick(e){
    return e.target && typeof e.target.blur === 'function' && e.target.blur();
}
