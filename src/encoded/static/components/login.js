'use strict';
var React = require('react');

var Login = React.createClass({
    contextTypes: {
        session: React.PropTypes.object
    },
    getInitialState: function() {
    	return {
            isOpen: false
        };
    },
    render: function() {
        var session = this.context.session;
        var userActionRender;
        // first case is if user is not logged in
        if (!(session && session['auth.userid'])) {
		userActionRender = <LoginRenderer {...this.props} onClick={this.showLock} isRefreshing={this.handleToggle} />
        } else { //if logged in give them a logout link
            userActionRender = <a href="#" onClick={this.handleToggleOut}  data-trigger="logout" className="global-entry">Log out</a>;
        }
        return (
            <div>{userActionRender}</div>
        );
    },
});

// Component that contains auth0 functions
var LoginRenderer = React.createClass({
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
            	redirect: false
            },
            // TODO add theme : logo
            socialButtonStyle: 'big',
            languageDictionary: {
            	title: "Log in"
            },
            theme: {
                logo: '/static/img/4dn_logo.svg'
            },
            allowedConnections: ['google-oauth2']
        });
        this.lock.on("authenticated", this.handleAuth0Login);
    },

	showLock: function(e) {
        e.preventDefault();
		this.lock.show();
	},

    handleAuth0Login: function(authResult, retrying){
        var accessToken = authResult.accessToken;
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
            if (!response.ok) throw response;
            return response.json();
        })
        .then(session_properties => {},
        function(error) {
            console.log("got an error: ", error.statusText);
        });
    },

    render: function () {
    	return (
            <div>
                <a id="loginbtn" href="" className="global-entry" onClick={this.showLock}>Log in</a>
            </div>
           );
       },
});
module.exports = Login;
