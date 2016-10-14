// Render a simple static error page with a link to return to the homepage

var React = require('react');

var ErrorPage = module.exports = React.createClass({
    render: function() {
        var homelink = <a href="/">here</a>;
        return(
            <div className="error-page">
                <h3>This page does not exist or you have found an error. Please click {homelink} to return to the homepage.</h3>
            </div>
        );
    }
});

/* TODO: @carl where do I now put custom error messages? */

