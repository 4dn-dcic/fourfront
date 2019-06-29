'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { NavItem } from 'react-bootstrap';
import { DropdownItem } from './../../forms/components/DropdownButton';
import { layout } from './../../util';
import { UserRegistrationModal } from './UserRegistrationModal';

/** SPECIFIC to 4DN/CGAP - NOT COMMON */

export const LoginNavItem = React.memo(function LoginNavItem(props){
    const { windowWidth, id, isRegistrationModalVisible, showLock, isLoading } = props;
    const gridState = layout.responsiveGridState(windowWidth);
    const cls = "nav-item user-account-item" + (isRegistrationModalVisible ? " active" : '');
    return (
        <React.Fragment>
            <li className={cls} id={id} onClick={showLock}>
                { isLoading ? (
                    <span className="pull-right">
                        <i className="account-icon icon icon-spin icon-circle-o-notch" style={{ verticalAlign : 'middle' }}/>
                    </span>
                ) : (
                    <a href="#" className="nav-link">
                        <i className="account-icon icon icon-user-o" />
                        { gridState === 'lg' ? "Log In / Register" : "Log In" }
                    </a>
                )}
            </li>
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
