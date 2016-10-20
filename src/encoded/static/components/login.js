'use strict';
var React = require('react');

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

    // triggerLogout: function (event) {
    //      console.log('Logging out (persona)');
    //      var session = this.state.session;
    //      if (!(session && session['auth.userid'])) return;
    //      this.fetch('/logout?redirect=false', {
    //          headers: {'Accept': 'application/json'}
    //      })
    //      .then(response => {
    //          if (!response.ok) throw response;
    //          return response.json();
    //      })
    //      .then(data => {
    //          this.DISABLE_POPSTATE = true;
    //          var old_path = window.location.pathname + window.location.search;
    //          window.location.assign('/#logged-out');
    //          if (old_path == '/') {
    //              window.location.reload();
    //          }
    //      }, err => {
    //          parseError(err).then(data => {
    //              data.title = 'Logout failure: ' + data.title;
    //              store.dispatch({
    //                  type: {'context':data}
    //              });
    //          });
    //      });
    //  },

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
        var session = this.context.session;
        var toRender = (session && session['auth.userid']) ?
            <a href="" data-trigger="logout" className="global-entry">Log out</a>
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
