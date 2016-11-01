'use strict';
var React = require('react');
var store = require('../store');
var jwt = require('jsonwebtoken');

// Component that contains auth0 functions
var Login = React.createClass({
    contextTypes: {
    	fetch: React.PropTypes.func,
    	session: React.PropTypes.object,
        navigate: React.PropTypes.func
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
                params: {scope: 'openid email email_verified'}
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

	showLock: function(e) {
        e.preventDefault();
		this.lock.show();
	},

    logout: function (e) {
        e.preventDefault();
        console.log('Logging out');
        var session = this.context.session;
        if (!(session && session['auth.userid'])) return;
        this.context.fetch('/logout?redirect=false', {
            headers: {'Accept': 'application/json',
                'Content-Type': 'application/json'}
        })
        .then(data => {
            if(typeof(Storage) !== 'undefined'){ // check if localStorage supported
                localStorage.removeItem("user_actions");
            }
            if(typeof document !== 'undefined'){
                this.context.navigate('/');
            }
        });
    },

    handleAuth0Login: function(authResult, retrying){
        var accessToken = authResult.accessToken;
        var idToken = authResult.idToken; //JWT
        // this code not appropriate to push:
        process.env.JWT_SECRET = 'poopysecret';
        console.log('......');
        console.log('ID TOKEN.......',idToken);
        jwt.verify(idToken,new Buffer(process.env.JWT_SECRET, 'base64'),function(err,decoded){
            console.log('------VERIFIED');
        });
        if (!accessToken) return;
        this.context.fetch('/login', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({accessToken: accessToken})
        })
        .then(response => {
            this.lock.hide();
            if (response.code || response.status) throw response;
            return response;
        })
        .then(response => {
            if(typeof(Storage) !== 'undefined'){ // check if localStorage supported
                localStorage.setItem("user_actions", JSON.stringify(response.user_actions));
            }
            this.context.navigate('', {'inPlace':true});
        }, error => {
            console.log("got an error: ", error.description);
            console.log(error);
            store.dispatch({
                type: {'context':error}
            });
        });

    },

    render: function () {
        var session = this.context.session;
        var toRender = (session && session['auth.userid']) ?
            <a href="" className="global-entry" onClick={this.logout}>Log out</a>
            :
            <a id="loginbtn" href="" className="global-entry" onClick={this.showLock}>Log in</a>;
        return (
            <div>
                {toRender}
            </div>
           );
       },
});
module.exports = Login;
