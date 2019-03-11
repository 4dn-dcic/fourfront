'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { MenuItem } from 'react-bootstrap';
import Auth0Lock from 'auth0-lock';
import * as store from './../../../store';
import { JWT, ajax, navigate, isServerSide, analytics, object } from './../../util';
import jwt from 'jsonwebtoken';
import Alerts from './../../alerts';
import { UserRegistrationModal } from './../../forms/UserRegistrationForm';



/** Component that contains auth0 functions */
export class LoginMenuItem extends React.Component {

    static propTypes = {
        'updateUserInfo'      : PropTypes.func.isRequired,
        'session'             : PropTypes.bool.isRequired,
        'href'                : PropTypes.string.isRequired
    };

    constructor(props){
        super(props);
        this.showLock           = this.showLock.bind(this);
        this.logout             = this.logout.bind(this);
        this.loginCallback      = this.loginCallback.bind(this);
        this.onRegistrationComplete = this.onRegistrationComplete.bind(this);
        this.onRegistrationCancel = this.onRegistrationCancel.bind(this);
        this.state = {
            "userNotPresent" : false
        };
    }

    componentDidMount () {
        // Login / logout actions must be deferred until Auth0 is ready.
        // TODO: these should be read in from base and production.ini
        this.lock = new Auth0Lock(
            'DPxEwsZRnKDpk0VfVAxrStRKukN14ILB',
            'hms-dbmi.auth0.com', {
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
                theme: { logo: '/static/img/4dn_logo.svg' },
                allowedConnections: ['github', 'google-oauth2']
            }
        );
        this.lock.on("authenticated", this.loginCallback);
    }

    showLock(eventKey, e) {
        this.lock.show();
    }

    logout(eventKey, e) {
        var { session, updateUserInfo, setIsLoadingIcon } = this.props;

        // Removes both idToken (cookie) and userInfo (localStorage)
        JWT.remove();

        if (!session) return;

        // Refetch page context without our old JWT to hide any forbidden content.
        updateUserInfo();
        navigate('', {'inPlace':true});

        if (typeof document !== 'undefined'){
            // Dummy click event to close dropdown menu, bypasses document.body.onClick handler (app.js -> App.prototype.handeClick)
            document.dispatchEvent(new MouseEvent('click'));
        }

        // This is not needed and has been removed.
        // We can replace later on with explicit _browser_ navigation to hms-dbmi.auth0.com/v2/logout
        // in order to log out of affiliated services (SSO) (?).
        // ajax.fetch('/logout?redirect=false').then(data => { });
    }

    loginCallback(authResult, retrying){
        var { setIsLoadingIcon, href, updateUserInfo } = this.props;

        // First stage: we just have gotten JWT from the Auth0 widget but have not auth'd it against it our own system
        // to see if this is a valid user account or some random person who just logged into their Google account.
        var idToken = authResult.idToken; //JWT
        if (!idToken) return;

        JWT.save(idToken); // We just got token from Auth0 so probably isn't outdated.

        // Refresh the content/context of our page now that we have a JWT stored as a cookie!
        // It will return same page but with any auth'd page actions.
        navigate('', {'inPlace':true});

        setIsLoadingIcon(true);

        this.lock.hide();

        // Second stage: get this valid OAuth account (Google or w/e) auth'd from our end.
        Promise.race([
            ajax.fetch('/login', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer '+idToken },
                body: JSON.stringify({id_token: idToken})
            }),
            new Promise(function(resolve, reject){
                setTimeout(function(){ reject({ 'description' : 'timed out', 'type' : 'timed-out' }); }, 90000); /* 90 seconds */
            })
        ]).then(response => {
            // Add'l Error Check (will throw to be caught)
            if (response.code || response.status) throw response;
            return response;
        })
        .then((r) => {
            JWT.saveUserInfoLocalStorage(r);
            updateUserInfo();
            Alerts.deQueue(Alerts.LoggedOut);
            console.info('Login completed');
            setIsLoadingIcon(false);

            if (href && href.indexOf('/error/login-failed') !== -1){
                navigate('/', {'inPlace':true}); // Navigate home -- perhaps we should remove this and leave them on login failed page? idk
            }

            // Fetch user profile and use their primary lab as the eventLabel.
            var profileURL = (_.findWhere(r.user_actions || [], { 'id' : 'profile' }) || {}).href;
            var isAdmin = r.details && Array.isArray(r.details.groups) && r.details.groups.indexOf('admin') > -1;
            if (profileURL && !isAdmin){
                // Register an analytics event for UI login.
                // This is used to segment public vs internal audience in Analytics dashboards.
                ajax.load(profileURL, (profile)=>{
                    analytics.event('Authentication', 'UILogin', {
                        'eventLabel' : (profile.lab && object.itemUtil.atId(profile.lab)) || 'No Lab'
                    });
                });
            } else if (!profileURL){
                throw new Error('No profile URL found in user_actions.');
            }
        }).catch((error)=>{
            // Handle Errors
            console.error("Error during login: ", error.description);
            console.log(error);

            setIsLoadingIcon(false);

            if (!error.code && error.type === 'timed-out'){
                // Server or network error of some sort most likely.
                Alerts.queue(Alerts.LoginFailed);
            } else if (error.code === 403) {
                // Present a registration form
                //navigate('/error/login-failed');
                this.setState({ 'userNotPresent' : true });
            } else {
                // ? Fallback
                navigate('/', ()=>{
                    setTimeout(()=>{
                        Alerts.queue(Alerts.LoginFailed);
                    }, 1000);
                });
            }
            Alerts.deQueue(Alerts.LoggedOut);

        });

    }

    onRegistrationComplete(){
        // TODO: perform login by calling `this.loginCallback({ idToken : JWT.get() })`
        this.setState({ 'userNotPresent' : false });
    }

    onRegistrationCancel(){
        // TODO:
        this.setState({ 'userNotPresent' : false });
    }

    render() {
        var { session } = this.props,
            userNotPresent = this.state.userNotPresent;

        // If we're already logged in, show logout button.
        if (session) return (
            <MenuItem id="logoutbtn" onSelect={this.logout} className="global-entry">
                Log Out
            </MenuItem>
        );

        if (userNotPresent){
            // N.B. Signature is not verified here. Signature only gets verified by authentication endpoint.
            var token = JWT.get(),
                decodedToken = token && jwt.decode(token),
                unverifiedEmail = decodedToken && decodedToken.email,
                modalHeading = unverifiedEmail && (
                    <p className="text-400 mb-2">
                        Email <span className="text-600">{ unverifiedEmail }</span> does not exist. Please register below.
                    </p>
                );

            console.log('TT', decodedToken);
            return (
                <UserRegistrationModal onComplete={this.onRegistrationComplete}
                    onCancel={this.onRegistrationCancel} heading={modalHeading} email={unverifiedEmail} />
            );
            //return ReactDOM.createPortal(
            //    <UserRegistrationModal onComplete={this.onRegistrationComplete} />,
            //    overlaysContainer
            //);
        }

        return (
            <MenuItem id="loginbtn" onSelect={this.showLock} className="global-entry">
                Log In or Register
            </MenuItem>
        );
    }

}
