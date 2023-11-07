import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { UserRegistrationModal } from './UserRegistrationModal';
import { JWT, console, navigate } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { event as trackEvent, setUserID } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/analytics';
import { load, fetch } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/ajax';

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
        this.onRegistrationComplete = this.onRegistrationComplete.bind(this);
        this.onLogin = this.onLogin.bind(this);
        this.state = {
            id: 'loginbtn',
            unverifiedUserEmail: props.context['@graph'][0],
            showLock: false,
            isLoading: false
        };
    }

    onRegistrationComplete() {
        const { updateAppSessionState } = this.props;

        Promise.race([
            // At this point a http-only cookie session token will be stored under jwtToken
            fetch('/session-properties'),
            new Promise(function (resolve, reject) {
                setTimeout(function () { reject({ 'description': 'timed out', 'type': 'timed-out' }); }, 30000); /* 30 seconds */
            })
        ])
            .then((response) => {
                // this may not be needed?
                console.log('got response from session properties', response);
                if (response.code || response.status) throw response;
                return response;
            })
            .then((userInfoResponse) => {
                const {
                    details: {
                        email: userEmail = null
                    } = {},
                    user_actions = []
                } = userInfoResponse;

                if (!userEmail) {
                    throw new Error("Did not receive user details from /session-properties, login failed.");
                }

                // Fetch user profile and (outdated/to-revisit-later) use their primary lab as the eventLabel.
                const profileURL = (_.findWhere(user_actions, { 'id': 'profile' }) || {}).href;
                if (profileURL) {
                    this.setState({ "isLoading": false });

                    JWT.saveUserInfoLocalStorage(userInfoResponse);
                    updateAppSessionState(); // <- this function (in App.js) is now expected to call `Alerts.deQueue(Alerts.LoggedOut);`
                    console.info('Login completed');

                    // Register an analytics event for UI login.
                    // This is used to segment public vs internal audience in Analytics dashboards.
                    load(profileURL, (profile) => {
                        if (typeof successCallback === 'function') {
                            successCallback(profile);
                        }
                        if (typeof onLogin === 'function') {
                            onLogin(profile);
                        }

                        const { uuid: userId, groups = null } = profile;

                        setUserID(userId);

                        trackEvent('Authentication', 'UILogin', {
                            eventLabel: "Authenticated ClientSide",
                            name: userId,
                            userId,
                            userGroups: groups && (JSON.stringify(groups.sort()))
                        });

                        // Attempt to preserve hash, if any, but don't scroll to it.
                        const windowHash = '/';//(window && window.location && window.location.hash) || '';
                        navigate(windowHash, { "inPlace" : true, "dontScrollToTop" : !!(windowHash) });

                    }, 'GET', () => {
                        throw new Error('Request to profile URL failed.');
                    });
                } else {
                    console.log('in failed user profile fetch');
                    throw new Error('No profile URL found in user_actions.');
                }
            }).catch((error) => {
                // Handle Errors
                console.log(error);

                this.setState({ "isLoading": false });
                setUserID(null);

                if (typeof errorCallback === "function") {
                    errorCallback(error);
                }
            });
    }

    onLogin(profile){
        console.log("Logged in", profile);
    }

    render() {
        return <UserRegistrationModal {... this.state} onRegistrationComplete={this.onRegistrationComplete} onLogin={this.onLogin} />;
    }
}