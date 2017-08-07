'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as store from '../store';
import { JWT, ajax, navigate, isServerSide } from './util';
import { MenuItem } from 'react-bootstrap';
import Alerts from './alerts';

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
        var lock_;
        if (isServerSide()) {
            return;
        } else {
            lock_ = require('auth0-lock').default;
        }
        // Login / logout actions must be deferred until Auth0 is ready.
        // TODO: these should be read in from base and production.ini
        this.lock = new lock_('DPxEwsZRnKDpk0VfVAxrStRKukN14ILB',
            'hms-dbmi.auth0.com', {
                auth: {
                    sso: false,
                    redirect: false,
                    responseType: 'token',
                    params: {scope: 'openid email', prompt: 'select_account'}
                },
                socialButtonStyle: 'big',
                languageDictionary: {
                    title: "Log in"
                },
                theme: {
                    logo: '/static/img/4dn_logo.svg'
                },
                allowedConnections: ['github', 'google-oauth2']
            });
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

        ajax.fetch('/logout?redirect=false')
        .then(data => {
            if(typeof document !== 'undefined'){

                // Dummy click event to close dropdown menu, bypasses document.body.onClick handler (app.js -> App.prototype.handeClick)
                document.dispatchEvent(new MouseEvent('click'));

                this.props.updateUserInfo();
                navigate('', {'inPlace':true});
            }
        });
    }

    handleAuth0Login(authResult, retrying){
        var idToken = authResult.idToken; //JWT
        if (!idToken) return;

        JWT.save(idToken); // We just got token from Auth0 so probably isn't outdated.

        ajax.fetch('/login', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer '+idToken },
            body: JSON.stringify({id_token: idToken})
        })
        .then(response => {
            if (response.code || response.status) throw response;
            return response;
        })
        .then(response => {
            JWT.saveUserInfoLocalStorage(response);
            this.props.updateUserInfo();
            Alerts.deQueue(Alerts.LoggedOut);
            if(this.props.href && this.props.href.indexOf('/error/login-failed') !== -1){
                navigate('/', {'inPlace':true}, this.lock.hide.bind(this.lock));
            }else{
                navigate('', {'inPlace':true}, this.lock.hide.bind(this.lock));
            }
        }, error => {
            console.log("got an error: ", error.description);
            console.log(error);
            var errorPageHref = '/';
            if (error.code === 403) {
                errorPageHref = '/error/login-failed';
            }
            navigate(errorPageHref);
            this.lock.hide.call(this.lock);
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
