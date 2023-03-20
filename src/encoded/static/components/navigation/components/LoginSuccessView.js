import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import * as JWT from '@hms-dbmi-bgm/shared-portal-components/es/components/util/json-web-token';
import { event as trackEvent, setUserID } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/analytics';
import { load, fetch, promise as ajaxPromise } from '@hms-dbmi-bgm/shared-portal-components/es/components/util/ajax';
import { Alerts } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/Alerts';
import { navigate } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { ItemDetailList } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/ItemDetailList';


/**
 * Component that essentially handles the "callback" interaction previously done by
 * the UI. The interaction in the Redis state now proceeds as follows:
 *      1. The UI renders the Auth0Lock component in 'code' mode
 *      2. The user logs in via the Auth0Lock and transmits the code to the back-end 
 *         via GET /callback?code=abcdefg...
 *      3. The back-end calls into Auth0 to get JWT and returns a session token to
 *         the browser, returning a success response
 *      4. This component loads, triggering the acquisition of /session-properties
 *         and thus the population of the user_info in local storage
 */
export default class LoginSuccessView extends React.PureComponent {

    static propTypes = {
        'readyToRedirect': PropTypes.bool
    };
    
    constructor(props) {
        super(props);
        this.state = {
            readyToRedirect: false
        };
    }

    /**
     * This component is meant to be loaded upon navigating the /callback
     * Once that has happened, we should have stored a jwtToken as a cookie that 
     * we can use to make authenticated requests ie: the below calls should return
     * clean responses if the user successfully logged in and error out appropriately if
     * they did not.
     */
    componentDidMount() {
        Promise.race([
            // At this point a http-only cookie session token will be stored under jwtToken
            fetch('/session-properties'),
            new Promise(function(resolve, reject){
                setTimeout(function(){ reject({ 'description' : 'timed out', 'type' : 'timed-out' }); }, 30000); /* 30 seconds */
            })
        ])
        .then((response) => {
            // this may not be needed?
            if (response.code || response.status) throw response;
            return response;
        })
        .then((userInfoResponse) => {
            const {
                details: {
                    email: userEmail = null
                } = {},
                user_actions = []
            } = userInfoResponse;

            if (!userEmail) {
                throw new Error("Did not receive user details from /session-properties, login failed.");
            }

            // Fetch user profile and (outdated/to-revisit-later) use their primary lab as the eventLabel.
            const profileURL = (_.findWhere(user_actions, { 'id' : 'profile' }) || {}).href;
            if (profileURL){
                this.setState({ "isLoading" : false });

                JWT.saveUserInfoLocalStorage(userInfoResponse);
                updateAppSessionState(); // <- this function (in App.js) is now expected to call `Alerts.deQueue(Alerts.LoggedOut);`
                console.info('Login completed');

                // Register an analytics event for UI login.
                // This is used to segment public vs internal audience in Analytics dashboards.
                load(profileURL, (profile)=>{
                    if (typeof successCallback === 'function'){
                        successCallback(profile);
                    }
                    if (typeof onLogin === 'function'){
                        onLogin(profile);
                    }

                    const { uuid: userId, groups = null } = profile;

                    setUserID(userId);

                    trackEvent('Authentication', 'UILogin', {
                        eventLabel : "Authenticated ClientSide",
                        name: userId,
                        userId,
                        userGroups: groups && (JSON.stringify(groups.sort()))
                    });

                }, 'GET', ()=>{
                    throw new Error('Request to profile URL failed.');
                });
            } else {
                throw new Error('No profile URL found in user_actions.');
            }
            }).catch((error)=>{
                // Handle Errors
                console.log(error);

                this.setState({ "isLoading" : false });
                setUserID(null);

                if (typeof errorCallback === "function") {
                    errorCallback(error);
                }
            });
        this.setState({
            readyToRedirect: true
        });
    }

    render() {
        var { context, schemas } = this.props;
        if (this.state.readyToRedirect) {
            navigate("/", {}, (resp)=>{
                // Show alert on new Item page
                Alerts.queue({
                    'title'     : 'Success',
                    'message'   : 'You are now logged in.',
                    'style'     : 'success'
                });
            });
        }
        // This needs styling, maybe a spinning loader? Will look into later
        return (
            <div className="view-item mt-25 container" id="content">
                {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                <ItemDetailList context={context} schemas={schemas} />
            </div>
        );
      }
}
