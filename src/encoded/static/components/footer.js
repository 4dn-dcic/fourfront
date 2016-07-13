'use strict';
var React = require('react');
var Modal = require('react-bootstrap/lib/Modal');
var OverlayMixin = require('react-bootstrap/lib/OverlayMixin');

var LoginFields = React.createClass({

	getInitialState: function() {
		return {username: '', password: ''};
	},
	handleUsernameChange: function(e) {
		this.setState({username: e.target.value});
	},
	handlePasswordChange: function(e) {
		this.setState({password: e.target.value});
	},
	handleSubmit: function(e) {
		e.preventDefault();
		var username = this.state.username.trim();
		var password = this.state.password.trim();
		if (!username || !password) {
			return;
		}
		this.props.onLogin({username: username, password: password});
		this.setState({username: '', password: ''});
	},
	render: function() {
		var clr = {'color':'red'};
		return (

				<div>
				<label>Username:</label>
				<input type="text" class="form-control" style={clr}
							 placeholder="Username"
							 onChange={this.handleUsernameChange}
							 value={this.state.username} />

				<label>Password</label>
				<input type="password" class="form-control" style={clr}
							 placeholder="Password"
							 onChange={this.handlePasswordChange}
							 value={ this.state.password } />
						 <button id="loginbtn" class="btn btn_primary" onClick={ this.handleSubmit }>Poop</button>
				<button id="loginbtn" class="btn btn_primary" onClick={ this.handleSubmit }>Login</button>
				</div>
		);
	},
})


var LoginForm = React.createClass({
	contextTypes: {
			fetch: React.PropTypes.func,
			session: React.PropTypes.object,
      navigate: React.PropTypes.func
	},

	loginToServer: function(data) {
			console.log(data);
			fetch('/login', {
				method: "POST",
				body: JSON.stringify(data),
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "same-origin"
      })
      .then(response => {
        if (!response.ok) throw response;
        return response.json();
      })
      .then(session_properties => {
          console.log("got session props as", session_properties);
          this.context.session['auth.userid'] = data.username;
          var next_url = window.location.href;
          if (window.location.hash == '#logged-out') {
              next_url = window.location.pathname + window.location.search;
          }
          this.context.navigate(next_url, {replace: true});
        },function(error) {
				console.log("we got an error during login", error);
      })
	},
	render: function() {
		return (
				<form>
				  <LoginFields onLogin={this.loginToServer} />
				</form>
		);
	},
});

var Footer = React.createClass({
	contextTypes: {
        session: React.PropTypes.object
    },

    propTypes: {
        version: React.PropTypes.string // App version number
    },
    render: function() {
        var session = this.context.session;
        var disabled = !session;
        var userActionRender;

        if (!(session && session['auth.userid'])) {

            //userActionRender = <a href="#" data-trigger="login" disabled={disabled}>Submitter sign-in</a>;
						userActionRender = <LoginForm />
        } else {
            userActionRender = <a href="#" data-trigger="logout">Submitter sign out</a>;
        }
        return (
            <footer id="page-footer">
                <div className="container">
                    <div className="row">
                        <div className="app-version">{this.props.version}</div>
                    </div>
                </div>
                <div className="page-footer">
                    <div className="container">
                        <div className="row">
                            <div className="col-sm-6 col-sm-push-6">
                                <ul className="footer-links">
									<li><LoginBoxes /></li>
                                    <li><a href="mailto:encode-help@lists.stanford.edu">Contact</a></li>
                                    <li><a href="http://www.stanford.edu/site/terms.html">Terms of Use</a></li>
									{/* Enable footer login bar...*/}
	                                {/* <li id="user-actions-footer">{userActionRender}</li>*/}
                                </ul>
                                <p className="copy-notice">&copy;{new Date().getFullYear()} Harvard University.</p>
                            </div>
                            <div className="col-sm-6 col-sm-pull-6">
                                <ul className="footer-logos">
                                    <li><a href="https://commonfund.nih.gov/4dnucleome/index"><img src="/static/img/4DN-logo.png" alt="4DN" id="encode-logo" height="60px" width="106px" /></a></li>
                                    <li><a href="http://hms.harvard.edu"><img src="/static/img/Harvard-logo.png" alt="Harvard" id="ucsc-logo" width="160px" height="40px" /></a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        );
    }

/*
CARL'S CODE ------------------------------
*/

});
var LoginBoxes = React.createClass({
  mixins: [OverlayMixin],
  getInitialState: function() {
  	return {username: '', password: '', isOpen: false};
  },
  usernameFill: function(v) {
  	this.setState({username: v});
  },
  passwordFill: function(v) {
  	this.setState({password: v});
  },
  handleToggle: function () {
	  this.setState({
		  isOpen: !this.state.isOpen
	  });
  },
  handleSubmit: function(e){
    e.preventDefault();
    var username = this.state.username.trim();
	var password = this.state.password.trim();
  	if (username === '' || password === '') {
    	return;
    }
    // do something
    this.setState({username: '', password: ''});
    console.log('EXIT THE PAGE NOW');
  },
  render: function () {
	return (
	  <div>
		  <a className="btn btn-info btn-sm" onClick={this.handleToggle}>Log in</a>
	 </div>
 );
 },

	 renderOverlay: function () {
         if (!this.state.isOpen) {
             return <span/>;
         }
         return (
	  <Modal onRequestHide={this.handleToggle} dialogClassName="login-modal">
        <div className="login-box">
        	<h1 className="title">Your Account</h1>
      		<label className="fill-label">Username:</label>
        	<TextBox default="Username" fill={this.usernameFill} tType="text"/>
        	<label className="fill-label">Password:</label>
        	<TextBox default="Password" fill={this.passwordFill} tType="password"/>
        	<ul className="links">
            	<li><button id="loginbtn" className="sexy-btn"
	                onClick={this.handleSubmit}><span>Sign in</span></button></li>
				<li><form action='http://google.com'><button id="regbtn" className="sexy-btn">
					<span>Register</span></button></form></li>
				<li><form action='http://google.com'><button id="passbtn" className="sexy-btn">
					<span>Change password</span></button></form></li>
				{/*<li><a href="https://www.google.com/">Register</a></li>
	            <li><a href="https://www.google.com/">New password</a></li>*/}
	            <li><button id="closebtn" className="sexy-btn"
	                onClick={this.handleToggle}><span>Close</span></button></li>
        	</ul>
      	</div>
  	   </Modal>
    );
  },
});

var TextBox = React.createClass({
  getInitialState: function() {
  	return({data: ''});
  },
  handleFill: function(e) {

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
module.exports = Footer;
