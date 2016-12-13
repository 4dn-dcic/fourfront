'use strict';
var React = require('react');
var store = require('../store');
var JWT = require('./objectutils').JWT;
var { MenuItem } = require('react-bootstrap');
var Alerts = require('./alerts');

// Component that contains auth0 functions
var Login = React.createClass({
    contextTypes: {
    	fetch: React.PropTypes.func,
    	session: React.PropTypes.bool,
        navigate: React.PropTypes.func,
        updateUserInfo: React.PropTypes.func
    },

    componentWillMount: function () {
        const isClient = typeof window !== 'undefined';
        var lock_;
        if (isClient) {
            lock_ = require('auth0-lock').default;
        }else{
            return;
        }
        // Login / logout actions must be deferred until Auth0 is ready.
        // TODO: these should be read in from base and production.ini
        this.lock = new lock_('DPxEwsZRnKDpk0VfVAxrStRKukN14ILB',
            'hms-dbmi.auth0.com', {
            auth: {
            	redirect: false,
                responseType: 'token',
                params: {scope: 'openid email'}
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
    },

	showLock: function(eventKey, e) {
		this.lock.show();
	},

    logout: function (eventKey, e) {
        JWT.remove();
        console.log('Logging out');
        if (!this.context.session) return;
        if (typeof this.props.navCloseMobileMenu === 'function') this.props.navCloseMobileMenu();

        this.context.fetch('/logout?redirect=false')
        .then(data => {
            if(typeof document !== 'undefined'){

                // Dummy click event to close dropdown menu, bypasses document.body.onClick handler (app.js -> App.prototype.handeClick)
                document.dispatchEvent(new MouseEvent('click'));

                // TODO: should logout redirect to home?
                this.context.updateUserInfo();
                this.context.navigate('', {'inPlace':true});
            }
        });
    },

    handleAuth0Login: function(authResult, retrying){
        var idToken = authResult.idToken; //JWT
        if (!idToken) return;

        JWT.save(idToken); // We just got token from Auth0 so probably isn't outdated.

        this.context.fetch('/login', {
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
            this.context.updateUserInfo();
            Alerts.deQueue(Alerts.LoggedOut);
            this.context.navigate('', {'inPlace':true}, this.lock.hide.bind(this.lock));
        }, error => {
            console.log("got an error: ", error.description);
            console.log(error);
            store.dispatch({
                type: {'context':error}
            });
            this.lock.hide.bind(this.lock);
        });

    },

    render: function () {
        if (this.props.invisible) return null;
        if (this.context.session){
            return (
                <MenuItem id="logoutbtn" onSelect={this.logout} className="global-entry">
                    Log Out
                </MenuItem>
            );    
        }
        return (
            <MenuItem id="loginbtn" onSelect={this.showLock} className="global-entry">
                Log In
            </MenuItem>
        );
        /* For old nav
        return (this.context.session ?
            <a href="#" className="global-entry" onClick={this.logout}>Log out</a>
            :
            <a id="loginbtn" href="" className="global-entry" onClick={this.showLock}>Log in</a>
        );
        */
    },
});
module.exports = Login;
