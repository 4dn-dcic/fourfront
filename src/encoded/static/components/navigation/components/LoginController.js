'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { JWT, ajax, navigate, isServerSide, analytics, object, layout } from './../../util';
import Alerts from './../../alerts';

/** Imported in componentDidMount. */
let Auth0Lock = null;

// Manual mock re: https://github.com/facebook/create-react-app/issues/1064
if (!require.ensure) {
    console.error("No require.ensure present - \nFine if within an NPM test, error if in browser/webpack context.");
    require.ensure = (deps, cb) => cb(require);
}

/** Controls Login process, also shows Registration Modal */
export class LoginController extends React.PureComponent {

    static propTypes = {
        'updateUserInfo'      : PropTypes.func.isRequired,
        'session'             : PropTypes.bool.isRequired,
        'href'                : PropTypes.string.isRequired,
        'id'                  : PropTypes.string,
        'windowWidth'         : PropTypes.number,
        'schemas'             : PropTypes.object,
        'auth0ClientID'       : PropTypes.string.isRequired,
        'auth0Domain'         : PropTypes.string.isRequired,
        'auth0Options'        : PropTypes.object,
        'children'            : PropTypes.node.isRequired
    };

    static defaultProps = {
        // Login / logout actions must be deferred until Auth0 is ready.
        // TODO: these (maybe) should be read in from base and production.ini
        'auth0ClientID' : 'DPxEwsZRnKDpk0VfVAxrStRKukN14ILB',
        'auth0Domain' : 'hms-dbmi.auth0.com',
        'auth0Options' : {
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
            languageDictionary: { title: "Log in" },
            theme: {
                logo: '/static/img/4dn_logo.svg',
                icon: '/static/img/4dn_logo.svg',
                primaryColor: '#009aad'
            },
            allowedConnections: ['github', 'google-oauth2']
        }
    };

    constructor(props){
        super(props);
        this.showLock = _.throttle(this.showLock.bind(this), 1000, { trailing: false });
        this.loginCallback = this.loginCallback.bind(this);
        this.loginErrorCallback = this.loginErrorCallback.bind(this);
        this.onRegistrationComplete = this.onRegistrationComplete.bind(this);
        this.onRegistrationCancel = this.onRegistrationCancel.bind(this);
        this.state = {
            "isRegistrationModalVisible" : false,
            "isLoading" : false // Whether are currently performing login/registration request.
        };
    }

    componentDidMount () {
        const { auth0ClientID, auth0Domain, auth0Options } = this.props;
        require.ensure(["auth0-lock"], (require) => {
            // As of 9.11.0, auth0-js (dependency of Auth0Lock) cannot work outside of browser context.
            // We import it here in separate bundle instead to avoid issues during server-side render.
            Auth0Lock = require("auth0-lock").default;
            this.lock = new Auth0Lock(auth0ClientID, auth0Domain, auth0Options);
            this.lock.on("authenticated", this.loginCallback);
        }, "auth0-lock-bundle");
    }

    showLock(evtKey, e){
        if (!this.lock || !this.lock.show) return; // Not yet mounted
        this.lock.show();
    }

    loginCallback(authResult, successCallback, errorCallback){
        const { updateUserInfo } = this.props;

        // First stage: we just have gotten JWT from the Auth0 widget but have not auth'd it against it our own system
        // to see if this is a valid user account or some random person who just logged into their Google account.
        const { idToken } = authResult; //JWT
        if (!idToken) return;

        JWT.save(idToken); // We just got token from Auth0 so probably isn't outdated.

        this.setState({ "isLoading" : true }, ()=>{

            this.lock.hide();

            // Second stage: get this valid OAuth account (Google or w/e) auth'd from our end.
            Promise.race([
                ajax.fetch('/login', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer '+idToken },
                    body: JSON.stringify({ id_token: idToken })
                }),
                new Promise(function(resolve, reject){
                    setTimeout(function(){ reject({ 'description' : 'timed out', 'type' : 'timed-out' }); }, 90000); /* 90 seconds */
                })
            ])
                .then((response) => {
                    // Add'l Error Check (will throw to be caught)
                    if (response.code || response.status) throw response;
                    return response;
                })
                .then((r) => {
                    console.info('Received info from server about user via /login endpoint', r);

                    JWT.saveUserInfoLocalStorage(r);
                    updateUserInfo();
                    Alerts.deQueue(Alerts.LoggedOut);
                    console.info('Login completed');

                    // Fetch user profile and use their primary lab as the eventLabel.
                    const profileURL = (_.findWhere(r.user_actions || [], { 'id' : 'profile' }) || {}).href;
                    const isAdmin = r.details && Array.isArray(r.details.groups) && r.details.groups.indexOf('admin') > -1;

                    if (profileURL){
                        this.setState({ "isLoading" : false });

                        // Register an analytics event for UI login.
                        // This is used to segment public vs internal audience in Analytics dashboards.
                        ajax.load(profileURL, (profile)=>{
                            if (!isAdmin){ // Exclude admins from analytics tracking
                                analytics.event('Authentication', 'UILogin', {
                                    'eventLabel' : (profile.lab && object.itemUtil.atId(profile.lab)) || 'No Lab'
                                });
                            }
                            if (typeof successCallback === 'function'){
                                successCallback(profile);
                            }
                            // Refresh the content/context of our page now that we have a JWT stored as a cookie!
                            // It will return same page but with any auth'd page actions.
                            navigate('', { "inPlace" : true });
                        }, 'GET', ()=>{
                            throw new Error('Request to profile URL failed.');
                        });
                    } else {
                        throw new Error('No profile URL found in user_actions.');
                    }
                }).catch((error)=>{
                    // Handle Errors
                    console.error("Error during login: ", error.description);
                    console.log(error);

                    this.setState({ "isLoading" : false });
                    Alerts.deQueue(Alerts.LoggedOut);

                    // If is programatically called with error CB, let error CB handle everything.
                    var errorCallbackFxn = typeof errorCallback === 'function' ? errorCallback : this.loginErrorCallback;
                    errorCallbackFxn(error);
                });

        });

    }

    loginErrorCallback(error){
        if (!error.code && error.type === 'timed-out'){
            // Server or network error of some sort most likely.
            Alerts.queue(Alerts.LoginFailed);
        } else if (error.code === 401) {
            // Present a registration form
            //navigate('/error/login-failed');
            this.setState({ 'isRegistrationModalVisible' : true });
        } else {
            Alerts.queue(Alerts.LoginFailed);
        }
    }

    onRegistrationComplete(){
        const token = JWT.get();
        const decodedToken = JWT.decode(token);

        this.loginCallback(
            { 'idToken' : token },
            // Success callback -- shows "Success" Alert msg.
            (userProfile) => {
                const userDetails = JWT.getUserDetails(); // We should have this after /login
                const userProfileURL = userProfile && object.itemUtil.atId(userProfile);
                const userFullName = (
                    userDetails.first_name && userDetails.last_name &&
                    (userDetails.first_name + ' ' + userDetails.last_name)
                ) || null;
                const msg = (
                    <ul className="mb-0">
                        <li>You are now logged in as <span className="text-500">{ userFullName }{ userFullName ? ' (' + decodedToken.email + ')' : decodedToken.email }</span>.</li>
                        <li>Please visit <b><a href={userProfileURL}>your profile</a></b> to edit your account settings or information.</li>
                    </ul>
                );
                this.setState({ 'isRegistrationModalVisible' : false });
                // Moved out of setState callback because no guarantee that setState callback is fired
                // if component becomes unmounted (which occurs after login).
                Alerts.queue({
                    "title"     : "Registered & Logged In",
                    "message"   : msg,
                    "style"     : 'success',
                    'navigateDisappearThreshold' : 2
                });
            },
            (err) => {
                this.setState({ 'isRegistrationModalVisible' : false });
                JWT.remove(); // Cleanup any remaining JWT, just in case.
                Alerts.queue(Alerts.LoginFailed);
            }
        );
    }

    onRegistrationCancel(){
        // TODO:
        this.setState({ 'isRegistrationModalVisible' : false });
    }

    render(){
        const { children, ...passProps } = this.props;
        const { isLoading, isRegistrationModalVisible } = this.state;
        const { showLock, onRegistrationCancel, onRegistrationComplete } = this;
        return React.cloneElement(
            children,
            { isLoading, isRegistrationModalVisible, showLock, onRegistrationCancel, onRegistrationComplete, ...passProps }
        );
    }

}


export class LogoutController extends React.PureComponent {

    constructor(props){
        super(props);
        this.performLogout = this.performLogout.bind(this);
    }

    /**
     * Removes JWT from cookies, as well as userInfo from localStorage
     * and then refreshes current view/href via navigate fxn.
     *
     * @param {string} eventKey - Not needed.
     * @param {Event} eventObject - Not needed.
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

    render(){
        const { children, ...passProps } = this.props;
        return React.cloneElement(children, { performLogout : this.performLogout, ...passProps });
    }

}
