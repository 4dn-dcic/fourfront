// Render a simple static error page with a link to return to the homepage

import React from 'react';

export default class ErrorPage extends React.Component {
    render() {
        var homelink;
        if(this.props.currRoute == 'home'){
            homelink = <a href="/">Return</a>;
        }else{
            homelink = <a href="/home">Return</a>;
        }
        var errorMessage;
        if(this.props.status == 'invalid_login'){
            errorMessage = (
                <div>
                    <h3>The account you provided is not valid. {homelink} to the homepage.</h3>
                    <h5>
                        Please note: our authentication system will automatically
                        attempt to log you in through your selected provider if you are
                        already logged in there. If you have an account with 4DN, please make sure
                        that you are logged in to the provider (e.g. google) with the matching email address.
                    </h5>
                    <h5>Access is restricted to 4DN consortium members.</h5>
                    <h5><a href="mailto:4DN.DCIC.support@hms-dbmi.atlassian.net">Request an account.</a></h5>
                </div>
            );
        }else if(this.props.status == 'not_found'){
            errorMessage = <h3>The page you've requested does not exist. {homelink} to the homepage.</h3>;
        }else if(this.props.status == 'forbidden'){
            errorMessage = <h3>Access was denied to this resource. If you have an account, try logging in. {homelink} to the homepage.</h3>;
        }else{
            errorMessage = <h3>The page you've requested does not exist or you have found an error. {homelink} to the homepage.</h3>;
        }
        return(
            <div className="error-page">
                {errorMessage}
            </div>
        );
    }
}
