'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Nav from 'react-bootstrap/esm/Nav';
import { layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { UserRegistrationModal } from './UserRegistrationModal';


export const LoginNavItem = React.memo(function LoginNavItem(props){
    const { id = 'loginbtn', isRegistrationModalVisible, showLock, isLoading } = props;
    return (
        <React.Fragment>
            <Nav.Link key="login-reg-btn" active={isRegistrationModalVisible} onClick={showLock} className="user-account-item" id={id}>
                { isLoading ? (
                    <i className="account-icon icon icon-spin icon-circle-notch fas align-middle"/>
                ) : (
                    <React.Fragment>
                        <i className="account-icon icon icon-user fas align-middle" />
                        <span>Log In</span>
                        <span className="d-none d-xl-inline"> / Register</span>
                    </React.Fragment>
                )}
            </Nav.Link>
            { isRegistrationModalVisible ? <UserRegistrationModal {...props} /> : null }
        </React.Fragment>
    );
});
LoginNavItem.propTypes = {
    'session'       : PropTypes.bool.isRequired,
    'href'          : PropTypes.string.isRequired,
    'id'            : PropTypes.string,
    'windowWidth'   : PropTypes.number,
    ...UserRegistrationModal.propTypes
};

/**
 * Somewhat 'wrap-around' but arguably likely cleanest way to open Auth0 login dialog modal
 * and not require to move up and pass down login-related stuff like `showLock()`.
 */
export const onLoginNavItemClick = function(e) {
    e.preventDefault();
    const btnElem = document.getElementById("loginbtn");
    if (btnElem && typeof btnElem.click === "function"){
        // See https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/click
        btnElem.click();
    }
    return false;
};
