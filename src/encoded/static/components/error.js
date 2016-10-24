// Render a simple static error page with a link to return to the homepage

var React = require('react');

var ErrorPage = module.exports = React.createClass({
    render: function() {
        var homelink = <a href="/">here</a>;
        var errorMessage;
        if(this.props.status == 403){
            errorMessage =  <div>
                                <h3>The account you provided is not valid. Please click {homelink} to return to the homepage.</h3>
                                <h5>Access is restricted to 4DN consortium members.</h5>
                                <h5><a href="mailto:4DN.DCIC.support@hms-dbmi.atlassian.net">Request an account.</a></h5>
                            </div>
        }else if(this.props.status == 404){
            errorMessage = <h3>The page you've requested does not exist. Please click {homelink} to return to the homepage.</h3>;
        // handle null status
        }else{
            errorMessage = <h3>The page you've requested does not exist or you have found an error. Please click {homelink} to return to the homepage.</h3>;
        }
        return(
            <div className="error-page">
                {errorMessage}
            </div>
        );
    }
});

/* TODO: @carl where do I now put custom error messages? */
