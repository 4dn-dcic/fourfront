'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as store from '../store';
import { JWT, ajax, navigate, isServerSide } from './util';
import { MenuItem } from 'react-bootstrap';
import Alerts from './alerts';
import Auth0Lock from 'auth0-lock';

/** Component that contains auth0 functions */
export default class Login extends React.Component {

    static propTypes = {
        updateUserInfo      : PropTypes.func.isRequired,
        session             : PropTypes.bool.isRequired,
        navCloseMobileMenu  : PropTypes.func.isRequired,
        href                : PropTypes.string.isRequired
    }

    constructor(props){
        super(props);
        this.componentWillMount = this.componentWillMount.bind(this);
        this.showLock           = this.showLock.bind(this);
        this.logout             = this.logout.bind(this);
        this.handleAuth0Login   = this.handleAuth0Login.bind(this);
        this.render             = this.render.bind(this);
    }

    componentWillMount () {
        if (isServerSide()) {
            return;
        }

        // Login / logout actions must be deferred until Auth0 is ready.
        // TODO: these should be read in from base and production.ini
        this.lock = new Auth0Lock(
            'DPxEwsZRnKDpk0VfVAxrStRKukN14ILB',
            'hms-dbmi.auth0.com', {
                auth: {
                    sso: false,
                    redirect: false,
                    responseType: 'token',
                    params: {scope: 'openid email', prompt: 'select_account'}
                },
                socialButtonStyle: 'big',
                languageDictionary: { title: "Log in" },
                theme: { logo: '/static/img/4dn_logo.svg' },
                allowedConnections: ['github', 'google-oauth2']
            }
        );
        this.lock.on("authenticated", this.handleAuth0Login);
    }

    showLock(eventKey, e) {
        this.lock.show();
    }

    logout(eventKey, e) {
        JWT.remove();
        console.log('Logging out');
        if (!this.props.session) return;
        if (typeof this.props.navCloseMobileMenu === 'function') this.props.navCloseMobileMenu();

        this.props.setIsLoadingIcon(true);
        ajax.fetch('/logout?redirect=false')
        .then(data => {
            if(typeof document !== 'undefined'){

                // Dummy click event to close dropdown menu, bypasses document.body.onClick handler (app.js -> App.prototype.handeClick)
                document.dispatchEvent(new MouseEvent('click'));

                this.props.updateUserInfo();
                this.props.setIsLoadingIcon(false);
                navigate('', {'inPlace':true});
            }
        });
    }

    handleAuth0Login(authResult, retrying){
        // First stage: we just have gotten JWT from Auth0 but have not auth'd it against it our own system to see if is a valid user account or some random person who just logged into their Google account.
        var idToken = authResult.idToken; //JWT
        if (!idToken) return;

        JWT.save(idToken); // We just got token from Auth0 so probably isn't outdated.

        navigate('', {'inPlace':true}); // Refresh the content of our page now that we have a JWT stored as a cookie! It will return same page but with any auth'd page actions.

        this.props.setIsLoadingIcon(true);
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
            this.props.updateUserInfo();
            Alerts.deQueue(Alerts.LoggedOut);
            console.info('Login completed');
            this.props.setIsLoadingIcon(false);
            if (this.props.href && this.props.href.indexOf('/error/login-failed') !== -1){
                navigate('/', {'inPlace':true}); // Navigate home -- perhaps we should remove this and leave them on login failed page? idk
            }
        }).catch((error)=>{
            // Handle Errors
            console.error("Error during login: ", error.description);
            console.log(error);

            this.props.setIsLoadingIcon(false);

            if (!error.code && error.type === 'timed-out'){
                Alerts.queue(Alerts.LoginFailed);
            } else if (error.code === 403) {
                navigate('/error/login-failed');
            } else {
                navigate('/', ()=>{
                    setTimeout( Alerts.queue.bind(Alerts, Alerts.LoginFailed), 1000);
                });
            }
            Alerts.deQueue(Alerts.LoggedOut);

        });

    }

    render() {
        if (this.props.invisible) return null;
        if (this.props.session) return (
            <MenuItem id="logoutbtn" onSelect={this.logout} className="global-entry">
                Log Out
            </MenuItem>
        );
        else return (
            <MenuItem id="loginbtn" onSelect={this.showLock} className="global-entry">
                Log In
            </MenuItem>
        );
    }

}
