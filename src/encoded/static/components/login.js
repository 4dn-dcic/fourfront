'use strict';
var React = require('react');
var Modal = require('react-bootstrap').Modal;

var Login = React.createClass({
    contextTypes: {
        session: React.PropTypes.object
    },
    getInitialState: function() {
    	return {
            isOpen: false,
            message: ''
        };
    },
    componentWillMount: function () {
        // Login / logout actions must be deferred until Auth0 is ready.
				var lock_ = require('auth0-lock');
			  // TODO: these should be read in from base and production.ini
			  this.lock = new lock_.default('DPxEwsZRnKDpk0VfVAxrStRKukN14ILB', 
																			'hms-dbmi.auth0.com', {
				auth: {
					redirect: false
				},
				// TODO add theme : logo
				socialButtonStyle: 'big',
				languageDictionary: {
					title: "Log in to data.4dnucleome.org"
				},
				allowedConnections: ['github', 'google-oauth2']
				});
			  this.lock.on("authenticated", this.handleAuth0Login.bind(this));

        this.setState({session: session});
        store.dispatch({
            type: {'href':query_href, 'session_cookie': session_cookie}
        });
    },
		showLock: function() {
			console.log("in showLock", this.lock);
			this.lock.showLock()
		},
    handleToggle: function () {
        this.setState({
  		  isOpen: !this.state.isOpen,
          message: 'Signing in...'
  	  });
    },
    handleToggleOut: function () {
        this.setState({
  		  isOpen: !this.state.isOpen,
          message: 'Signing out...'
  	  });
    },
    render: function() {
        var session = this.context.session;
        var userActionRender;
        var message = this.state.message;
        // first case is if user is not logged in
        if (!(session && session['auth.userid'])) {
		userActionRender = <LoginBoxes onClick={this.showLock} isRefreshing={this.handleToggle} />
        } else { //if logged in give them a logout link
            userActionRender = <a href="#" onClick={this.handleToggleOut}  data-trigger="logout" className="global-entry">Sign out</a>;
        }
        return (
            <div>
                {userActionRender}
                <Modal show={this.state.isOpen} backdrop='static'>
                   <div className="login-box">
                      <h1 className="title">{message}</h1>
                   </div>
                </Modal>
            </div>
        );
    },
});

// LoginBox Popup
var LoginBoxes = React.createClass({
    contextTypes: {
    	fetch: React.PropTypes.func,
    	session: React.PropTypes.object,
        navigate: React.PropTypes.func
    },
    getInitialState: function() {
    	return {username: '', password: '', isOpen: false, errormsg: '',
						  lock: ''};
    },
	  componentDidMount: function() {
			  console.log("login componenet did mount")
					var Auth0Lock = require('auth0-lock').default
					//console.log(Auth0Lock)
					// TODO: these should be read in from base and production.ini
					this.lock = new Auth0Lock('DPxEwsZRnKDpk0VfVAxrStRKukN14ILB', 
																				'hms-dbmi.auth0.com', {
							auth: {
								redirect: false
							},
							// TODO add theme : logo
							socialButtonStyle: 'big',
							languageDictionary: {
								title: "Log in to data.4dnucleome.org"
							},
							allowedConnections: ['github', 'google-oauth2']
					});
					this.lock.on("authenticated", this.props.handleAuth0Login);
					console.log('lock is', this.lock);
				  this.setState({lock: this.lock});
		},
    usernameFill: function(v) {
    	this.setState({username: v});
    },
    passwordFill: function(v) {
    	this.setState({password: v});
    },
    handleToggle: function (e) {
        if(e){
            e.preventDefault();
        }
        this.setState({
            isOpen: !this.state.isOpen
        });
    },
    loginToServer: function(data) {
		// clear any error messages
        this.setState({errormsg : ""});
		fetch('/login', {
			method: "POST",
			body: JSON.stringify(data),
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "same-origin"
        })
        .then(response => {
            console.log("got response" + response.ok);
            if (!response.ok){
                console.log("we got an error during login");
                this.setState({errormsg : "Invalid Login"});
                throw response;
            }
            this.handleToggle();
            this.setState({username: '', password: ''});
            this.props.isRefreshing();
            return response.json();
        })
        .then(session_properties => {
            this.context.session['auth.userid'] = data.username;
            window.location.reload();
            /*var next_url = window.location.href;
            if (window.location.hash == '#logged-out') {
              next_url = window.location.pathname + window.location.search;
            }
            this.context.navigate(next_url, {replace: true});
            */
        },function(error) {
            console.log("got an error" + error);
        })
    },
    handleSubmit: function(e){
        e.preventDefault();
        var username = this.state.username.trim();
        var password = this.state.password.trim();
        if (username === '' || password === '') {
            return;
        }
        this.loginToServer({username: username, password: password});

    },
    render: function () {
			  console.log("in login boxes");
			  console.log(this.state.lock);
        var error_span = '';
        if (this.state.errormsg) {
       	    error_span = <div className="error">{this.state.errormsg}</div>;
        }
    	return (
            <div>
                <a id="loginbtn" href="" className="global-entry" onClick={this.state.lock.show}>Sign in</a>
                <Modal show={this.state.isOpen} onHide={this.handleToggle}>
                    <div className="login-box">
                        <h1 className="title">Your Account</h1>
                        {error_span}
                        <label className="fill-label">Username:</label>
                        <TextBox default="Username" fill={this.usernameFill} tType="text"/>
                        <label className="fill-label">Password:</label>
                        <TextBox default="Password" fill={this.passwordFill} tType="password"/>
                        <ul className="links">
                            <li><button id="popuploginbtn" className="sexy-btn"
                            onClick={this.handleSubmit}><span>Sign in</span></button></li>
                            <li><button id="closebtn" className="sexy-btn"
                            onClick={this.handleToggle}><span>Close</span></button></li>
                        </ul>
                    </div>
                </Modal>
            </div>
           );
       },
});

var TextBox = React.createClass({
  getInitialState: function() {
  	return({data: ''});
  },
  handleFill: function(e) {
    e.preventDefault();
  	this.setState({data: e.target.value});
    this.props.fill(e.target.value);
  },
  render: function() {
  	return(
    	<div>
    		<input type={this.props.tType} className="text-box"
    		placeholder={this.props.default} onChange={this.handleFill}
    		value={this.state.data} />
    	</div>
  	);
  },
});

module.exports = Login;
