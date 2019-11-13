'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { Nav, NavDropdown, Dropdown } from 'react-bootstrap';

import { JWT, isServerSide, object, console } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { LoginController, LogoutController } from '@hms-dbmi-bgm/shared-portal-components/es/components/navigation/components/LoginController';
import { memoizedUrlParse } from './../../globals';

import { LoginNavItem, LogoutDropdownItem } from './LoginNavItem';
import { BigDropdownNavItem, BigDropdownIntroductionWrapper } from './BigDropdown';


const auth0Options = {
    auth: {
        sso: false,
        redirect: false,
        responseType: 'token',
        params: {
            scope: 'openid email',
            prompt: 'select_account'
        }
    },
    socialButtonStyle: 'big',
    theme: {
        logo: '/static/img/4dn_logo.svg',
        icon: '/static/img/4dn_logo.svg',
        primaryColor: '#009aad'
    },
    allowedConnections: ['github', 'google-oauth2'],
    languageDictionary : {
        title: "Log In"
    }
};

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
export const AccountNav = React.memo(function AccountNav(props){
    const { session, updateUserInfo, schemas, ...passProps } = props;
    const { windowWidth, href } = passProps;

    if (!session) { // Render login button
        return (
            <Nav className="navbar-acct">
                <LoginController {...{ updateUserInfo, auth0Options }}>
                    <LoginNavItem {...{ schemas, session, href, windowWidth }} key="login-register" className="user-account-item" />
                </LoginController>
            </Nav>
        );
    }

    const { details: userDetails = {}, user_actions: userActions = [] } = JWT.getUserInfo() || {};
    const { first_name: acctTitle = "Account", email } = userDetails;
    const acctIcon = (typeof email === 'string' && email.indexOf('@') > -1 && (
        object.itemUtil.User.gravatar(email, 30, { 'className' : 'account-icon-image' }, 'mm')
    )) || <i className="account-icon icon icon-user fas" />;
    const cls = 'user-account-item is-logged-in is-dropdown' + (acctIcon && acctIcon.type === 'img' ? ' has-image' : '');
    const navItemTitle = (
        <React.Fragment>
            { acctIcon }
            { acctTitle }
        </React.Fragment>
    );

    // `navItemProps` contains: href, windowHeight, windowWidth, isFullscreen, testWarning, mounted, overlaysContainer
    return (
        <Nav className="navbar-acct">
            <BigDropdownNavItem {...passProps} {...{ windowWidth, href }} id="account-menu-item"
                navItemContent={navItemTitle} className={cls}>
                <UserActionsMenu {...{ userActions, href, updateUserInfo, userDetails, windowWidth }}/>
            </BigDropdownNavItem>
        </Nav>
    );
});
AccountNav.propTypes = {
    'session'         : PropTypes.bool.isRequired,      /** Passed in by App */
    'href'            : PropTypes.string.isRequired,    /** Passed in by Redux store */
    'updateUserInfo'  : PropTypes.func.isRequired,      /** Passed in by App */
    'mounted'         : PropTypes.bool                  /** Passed in by Navigation */
};


function UserActionsMenu(props){
    const { userActions, href, updateUserInfo, userDetails, onMenuItemClick, windowWidth, windowHeight } = props;
    const { first_name: firstName = "Account", last_name: lastName = null } = userDetails;
    const introTitle = firstName + (lastName ? " " + lastName : "");

    const viewProfileAction = _.findWhere(userActions, { id: "profile" });
    const viewProfileURL = (viewProfileAction && viewProfileAction.href) || "/me";
    const renderedActions = userActions.map(function(action, idx){
        const { id: actionID, title: actionTitle } = action;
        const targetHref = getActionURL(action, href);
        const isActive = isActionActive(action, href);
        let prepend = null;
        if (actionID === "impersonate") {
            prepend = <i className="icon icon-fw icon-user-secret fas mr-07"/>;
        }
        if (actionID === "profile") {
            prepend = <i className="icon icon-fw icon-user fas mr-07"/>;
        }
        if (actionID === "submissions") {
            prepend = <i className="icon icon-fw icon-file-import fas mr-07"/>;
        }
        return (
            <div className={"level-1-title-container" + (isActive ? " active" : "")} key={actionID}>
                <a className="level-1-title text-medium d-block" href={getActionURL(action, href)}
                    onClick={onMenuItemClick} id={"menutree-linkto-" + targetHref.replace(/\//g, '_')} >
                    { prepend }
                    <span>{ actionTitle }</span>
                </a>
            </div>
        );
    });

    const introBlock = (
        <BigDropdownIntroductionWrapper titleIcon="user fas" className="mb-0 border-0" {...{ windowWidth, windowHeight }}>
            <h4 className="mb-0 mt-0 text-ellipsis-container">
                <a href={viewProfileURL} onClick={onMenuItemClick}>
                    { introTitle }
                </a>
            </h4>
            <div className="description">
                Manage your account
            </div>
        </BigDropdownIntroductionWrapper>
    );

    return (
        <React.Fragment>
            <div className="tree-menu-container row justify-content-between">
                <div className="col-12 col-lg-6 align-self-center">
                    { introBlock }
                </div>
                <div className="help-menu-tree level-1-no-child-links level-1 col-12 col-lg-4 mt-2">
                    { renderedActions }
                    <LogoutController updateUserInfo={updateUserInfo}>
                        <LogoutLink/>
                    </LogoutController>
                </div>
            </div>
        </React.Fragment>
    );
}

function LogoutLink({ performLogout }){
    return (
        <div className="level-1-title-container">
            <a className="level-1-title text-medium d-block" onClick={performLogout} id="logoutbtn" href="#">
                <i className="icon icon-fw icon-sign-out-alt fas mr-07"/>
                <span>Log Out</span>
            </a>
        </div>
    );
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
    const hrefParts = memoizedUrlParse(currentHref);
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

    const hrefParts = memoizedUrlParse(currentHref);
    if (typeof action.url === 'function')   return action.url(hrefParts);
    if (typeof action.href === 'function')  return action.href(hrefParts);
    return '#';
}


function actionToMenuItemOnClick(e){
    return e.target && typeof e.target.blur === 'function' && e.target.blur();
}
