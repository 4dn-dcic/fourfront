'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { NavItem } from 'react-bootstrap';
import Auth0Lock from 'auth0-lock';
import { JWT, ajax, navigate, isServerSide, analytics, object, layout } from './../../util';
import Alerts from './../../alerts';
import { UserRegistrationModal, decodeJWT } from './../../forms/UserRegistrationForm';



/** Component that contains auth0 functions */
export class LoginNavItem extends React.Component {

    static propTypes = {
        'updateUserInfo'      : PropTypes.func.isRequired,
        'session'             : PropTypes.bool.isRequired,
        'href'                : PropTypes.string.isRequired
    };

    constructor(props){
        super(props);
        this.showLock           = _.throttle(this.showLock.bind(this), 1000, { trailing: false });
        this.loginCallback      = this.loginCallback.bind(this);
        this.loginErrorCallback = this.loginErroCallback.bind(this);
        this.onRegistrationComplete = this.onRegistrationComplete.bind(this);
        this.onRegistrationCancel = this.onRegistrationCancel.bind(this);
        this.state = {
            "showRegistrationModal" : false,
            "isLoading" : false // Whether are currently performing login/registration request.
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
                theme: {
                    logo: '/static/img/4dn_logo.svg',
                    icon: '/static/img/4dn_logo.svg',
                    primaryColor: '#009aad'
                },
                allowedConnections: ['github', 'google-oauth2']
            }
        );
        this.lock.on("authenticated", this.loginCallback);
    }

    showLock(evtKey, e){
        if (!this.lock || !this.lock.show) return; // Not yet mounted
        this.lock.show();
    }

    loginCallback(authResult, successCallback, errorCallback){
        var { href, updateUserInfo } = this.props;

        // First stage: we just have gotten JWT from the Auth0 widget but have not auth'd it against it our own system
        // to see if this is a valid user account or some random person who just logged into their Google account.
        var idToken = authResult.idToken; //JWT
        if (!idToken) return;

        JWT.save(idToken); // We just got token from Auth0 so probably isn't outdated.

        this.setState({ "isLoading" : true }, ()=>{

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

                this.setState({ "isLoading" : false });

                if (href && href.indexOf('/error/login-failed') !== -1){
                    navigate('/', {'inPlace':true}); // Navigate home -- perhaps we should remove this and leave them on login failed page? idk
                }

                // Fetch user profile and use their primary lab as the eventLabel.
                const profileURL = (_.findWhere(r.user_actions || [], { 'id' : 'profile' }) || {}).href;
                const isAdmin = r.details && Array.isArray(r.details.groups) && r.details.groups.indexOf('admin') > -1;

                if (profileURL){
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
                        navigate('', {'inPlace':true});
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

    loginErroCallback(error){
        if (!error.code && error.type === 'timed-out'){
            // Server or network error of some sort most likely.
            Alerts.queue(Alerts.LoginFailed);
        } else if (error.code === 403) {
            // Present a registration form
            //navigate('/error/login-failed');
            this.setState({ 'showRegistrationModal' : true });
        } else {
            Alerts.queue(Alerts.LoginFailed);
        }
    }

    onRegistrationComplete(){
        // TODO: perform login by calling `this.loginCallback({ idToken : JWT.get() })`
        //this.setState({ 'showRegistrationModal' : false });
        var token = JWT.get(),
            decodedToken = decodeJWT(token);

        this.loginCallback(
            { 'idToken' : token },
            (userProfile) => { // on success:
                this.setState({ 'showRegistrationModal' : false });
                var userDetails = JWT.getUserDetails(), // We should have this after /login
                    userProfileURL = userProfile && object.itemUtil.atId(userProfile),
                    userFullName = (
                        userDetails.first_name && userDetails.last_name &&
                        (userDetails.first_name + ' ' + userDetails.last_name)
                    ) || null,
                    msg = (
                        <ul className="mb-0">
                            <li>You are now logged in as <span className="text-500">{ userFullName }{ userFullName ? ' (' + decodedToken.email + ')' : decodedToken.email }</span>.</li>
                            <li>Please visit <b><a href={userProfileURL}>your profile</a></b> to edit your account settings or information.</li>
                        </ul>
                    );

                Alerts.queue({
                    "title"     : "Registered & Logged In",
                    "message"   : msg,
                    "style"     : 'success',
                    'navigateDisappearThreshold' : 2
                });
            },
            (err) => {
                this.setState({ 'showRegistrationModal' : false });
                JWT.remove(); // Cleanup any remaining JWT, just in case.
                Alerts.queue(Alerts.LoginFailed);
            }
        );
    }

    onRegistrationCancel(){
        // TODO:
        this.setState({ 'showRegistrationModal' : false });
    }

    render() {
        var { schemas, windowWidth, id } = this.props,
            { showRegistrationModal, isLoading } = this.state,
            gridState = layout.responsiveGridState(windowWidth),
            loginNavItem = (
                <NavItem key="login-reg-btn" active={showRegistrationModal} onClick={this.showLock} className="user-account-item" id={id}>
                    { isLoading ? (
                        <span className="pull-right"><i className="account-icon icon icon-spin icon-circle-o-notch" style={{ verticalAlign : 'middle' }}/></span>
                    ) : (
                        <React.Fragment>
                            <i className="account-icon icon icon-user-o" />
                            { gridState === 'lg' ? "Log In / Register" : "Log In" }
                        </React.Fragment>
                    )}
                </NavItem>
            ),
            userRegistrationModal = null;

        if (showRegistrationModal){
            // N.B. Signature is not verified here. Signature only gets verified by authentication endpoint.
            var token           = JWT.get(),
                decodedToken    = decodeJWT(token),
                unverifiedEmail = decodedToken.email,
                onExitLinkClick = (e) => {
                    e.preventDefault();
                    this.setState({ 'showRegistrationModal' : false }, this.showLock);
                },
                formHeading    = unverifiedEmail && (
                    <h4 className="text-400 mb-25 mt-05">
                        You have never logged in as <span className="text-600">{ unverifiedEmail }</span> before.
                        <br/>
                        Please <span className="text-500">register below</span> or <a href="#" className="text-500" onClick={onExitLinkClick}>use a different email address</a> if have an existing account.
                    </h4>
                );

            userRegistrationModal = (
                <UserRegistrationModal onComplete={this.onRegistrationComplete} schemas={schemas} jwtToken={token}
                    onCancel={this.onRegistrationCancel} formHeading={formHeading} />
            );
            //return ReactDOM.createPortal(
            //    <UserRegistrationModal onComplete={this.onRegistrationComplete} />,
            //    overlaysContainer
            //);
        }

        return (
            <React.Fragment>
                { loginNavItem }
                { userRegistrationModal }
            </React.Fragment>
        );
    }

}
