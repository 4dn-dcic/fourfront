'use strict';
var React = require('react');
var Modal = require('react-bootstrap/lib/Modal');
var OverlayMixin = require('react-bootstrap/lib/OverlayMixin');

var Login = React.createClass({
    contextTypes: {
        session: React.PropTypes.object
    },

    render: function() {
        var session = this.context.session;
        var disabled = !session;
        var userActionRender;

        // first case is if user is not logged in
        if (!(session && session['auth.userid'])) {
						userActionRender = <LoginBoxes/>
        } else { //if logged in give them a logout link
            userActionRender = <a href="#" data-trigger="logout">Sign out</a>;
        }
        return (<div>{userActionRender}</div>);
    }
});

// LoginBox Popup
var LoginBoxes = React.createClass({
	contextTypes: {
			fetch: React.PropTypes.func,
			session: React.PropTypes.object,
      navigate: React.PropTypes.func
	},
  mixins: [OverlayMixin],
  getInitialState: function() {
  	return {username: '', password: '', isOpen: false, errormsg: ''};
  },
  usernameFill: function(v) {
  	this.setState({username: v});
  },
  passwordFill: function(v) {
  	this.setState({password: v});
  },
  handleToggle: function (e) {
      e.preventDefault();
      this.setState({
		  isOpen: !this.state.isOpen
	  });
  },
	loginToServer: function(data) {
			console.log(data);
			// clear any error messages
			this.setState({errormsg : ""});

			// update error msg from fetch
			var updateError = function(msg) {
				this.setState({errormsg : msg});
			}

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
    this.setState({username: '', password: ''});
  },
  render: function () {
		/* href="" will cause mouse pointer to change to the finger on hover */
	return (
	       <a id="loginbtn" href="" onClick={this.handleToggle}>Sign in</a>
 );
 },

	 renderOverlay: function () {
         if (!this.state.isOpen) {
             console.log('something happened!');
             return <span/>;
         }
				 var error_span = '';
				 if (this.state.errormsg) {
					 error_span = <div className="error">{this.state.errormsg}</div>;
				 }
         return (
	  <Modal onRequestHide={this.handleToggle} dialogClassName="login-modal">
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
