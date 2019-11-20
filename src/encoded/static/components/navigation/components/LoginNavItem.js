'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import DropdownItem from 'react-bootstrap/es/DropdownItem';
import Nav from 'react-bootstrap/es/Nav';
import { layout } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { UserRegistrationModal } from './UserRegistrationModal';


export const LoginNavItem = React.memo(function LoginNavItem(props){
    const { id, isRegistrationModalVisible, showLock, isLoading } = props;
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


export const LogoutDropdownItem = React.memo(function LogoutDropdownItem({ performLogout }){
    return (
        <DropdownItem id="logoutbtn" onClick={performLogout} className="global-entry">
            Log Out
        </DropdownItem>
    );
});
