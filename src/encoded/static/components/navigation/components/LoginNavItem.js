'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { NavItem } from 'react-bootstrap';

import { DropdownItem } from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/components/DropdownButton';
import { layout } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { UserRegistrationModal } from './UserRegistrationModal';


export const LoginNavItem = React.memo(function LoginNavItem(props){
    const { windowWidth, id, isRegistrationModalVisible, showLock, isLoading } = props;
    const gridState = layout.responsiveGridState(windowWidth);
    return (
        <React.Fragment>
            <NavItem key="login-reg-btn" active={isRegistrationModalVisible} onClick={showLock} className="user-account-item" id={id}>
                { isLoading ? (
                    <span className="pull-right"><i className="account-icon icon icon-spin icon-circle-o-notch" style={{ verticalAlign : 'middle' }}/></span>
                ) : (
                    <React.Fragment>
                        <i className="account-icon icon icon-user-o" />
                        { gridState === 'lg' ? "Log In / Register" : "Log In" }
                    </React.Fragment>
                )}
            </NavItem>
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
