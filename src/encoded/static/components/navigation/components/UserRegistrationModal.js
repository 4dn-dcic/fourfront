'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Modal } from 'react-bootstrap';

import { JWT, analytics } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import UserRegistrationForm from './../../forms/UserRegistrationForm';



export const UserRegistrationModal = React.memo(function UserRegistrationModal(props){
    const { schemas, onRegistrationCancel, showLock, onRegistrationComplete } = props;

    const token = JWT.get();
    // N.B. Signature is not verified here. Signature only gets verified by authentication endpoint.
    const decodedToken = token && JWT.decode(token);
    const unverifiedEmail = decodedToken && decodedToken.email;
    function onExitLinkClick(e){
        e.preventDefault();
        onRegistrationCancel();
        showLock();
    }

    if (!unverifiedEmail){
        // Error (maybe if user manually cleared cookies or localStorage... idk)
        return (
            <Modal show onHide={onRegistrationCancel}>
                <Modal.Header closeButton>
                    <Modal.Title>Missing Email</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>An error has occurred. Please try to login/register again.</p>
                </Modal.Body>
            </Modal>
        );
    }

    const isEmailAGmail = unverifiedEmail.slice(-10) === "@gmail.com";
    function onGoogleLinkClick(e){
        e.preventDefault();
        analytics.event('Authentication', 'CreateGoogleAccountLinkClick', { eventLabel : "None" });
        window.open(e.target.href);
    }
    const formHeading = (
        <div className="mb-3">
            <h4 className="text-400 mb-2 mt-05">
                You have never logged in as <span className="text-600">{ unverifiedEmail }</span> before.
            </h4>
            <ul>
                <li>
                    Please <span className="text-500">register below</span> or{' '}
                    <a href="#" className="text-500" onClick={onExitLinkClick}>use a different email address</a>{' '}
                    if you have an existing account.
                </li>
                { isEmailAGmail?
                    <li>
                        If you prefer, you can use your institutional email address as your account ID by creating a new google account at{' '}
                        <a href="https://accounts.google.com/signup/v2" target="_blank" rel="noopener noreferrer" onClick={onGoogleLinkClick}>
                            https://accounts.google.com/signup/v2
                        </a> and selecting &quot;Use my current email address instead&quot;.
                    </li>
                    : null }
            </ul>
        </div>
    );

    return (
        <Modal show size="lg" onHide={onRegistrationCancel}>
            <Modal.Header closeButton>
                <Modal.Title>Registration</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <UserRegistrationForm heading={formHeading} schemas={schemas} jwtToken={token}
                    onComplete={onRegistrationComplete} onCancel={onRegistrationCancel} />
            </Modal.Body>
        </Modal>
    );
});
UserRegistrationModal.propTypes = {
    'schemas'               : PropTypes.object,
    'isLoading'             : PropTypes.bool,
    'isRegistrationModalVisible' : PropTypes.bool,
    'showLock'              : PropTypes.func,
    'onRegistrationCancel'  : PropTypes.func,
    'onRegistrationComplete': PropTypes.func
};
