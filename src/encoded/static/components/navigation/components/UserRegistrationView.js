import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { UserRegistrationModal } from './UserRegistrationModal';


/**
 * Component that is rendered when a user does not successfully log in and needs
 * to be shown the registration modal. The caller should have an email in the @graph
 * of the response (see /callback in authentication.py)
 */
export default class UserRegistrationView extends React.PureComponent {

    static propTypes = {
        ...UserRegistrationModal.propTypes
    };

    constructor(props) {
        super(props);
        this.state = {
            id: 'loginbtn',
            unverifiedUserEmail: props.context['@graph'][0],
            showLock: false,
            isLoading: false
        };
    }

    render() {
        return <UserRegistrationModal {... this.state} />;
    }
}