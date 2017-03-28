'use strict';
var React = require('react');
var ReactDOM = require('react-dom');
var jsonScriptEscape = require('../libs/jsonScriptEscape');
var globals = require('./globals');
var ErrorPage = require('./error');
var Navigation = require('./navigation');
var Action = require('./action');
var Footer = require('./footer');
var url = require('url');
var _ = require('underscore');
var store = require('../store');
var browse = require('./browse');
var origin = require('../libs/origin');
var serialize = require('form-serialize');
var { Filters, ajax, JWT, console, isServerSide, navigate, analytics } = require('./util');
var Alerts = require('./alerts');
var jwt = require('jsonwebtoken');
var { FacetCharts } = require('./facetcharts');
var ChartDataController = require('./viz/chart-data-controller');
var ChartDetailCursor = require('./viz/ChartDetailCursor');
var makeTitle = require('./item-pages/item').title;
var ReactTooltip = require('react-tooltip');

/**
 * The top-level component for this application.
 *
 * @module {Component} app
 */

/**
 * Used to temporarily store Redux store values for simultaneous dispatch.
 *
 * @memberof module:app
 */
var dispatch_dict = {};

/**
 * Top bar navigation & link schema definition.
 *
 * @memberof module:app
 */
var portal = {
    portal_title: '4DN Data Portal',
    global_sections: [
        {
            id: 'browse',
            sid:'sBrowse',
            title: 'Browse',
            //url: '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all',
            url : function(currentUrlParts){
                if (!currentUrlParts) return '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all'; // Default/fallback
                return Filters.filtersToHref(
                    store.getState().expSetFilters,
                    currentUrlParts.protocol + '//' + currentUrlParts.host + '/browse/'
                );
            },
            active : function(currentWindowPath){
                if (currentWindowPath && currentWindowPath.indexOf('/browse/') > -1) return true;
                return false;
            }
        },
        {id: 'help', sid:'sHelp', title: 'Help', children: [
            {id: 'gettingstarted', title: 'Getting started', url: '/help', children : [
                {id: 'metadatastructure', title: 'Metadata structure', url: '/help#metadata-structure'},
                {id: 'datasubmission', title: 'Data submission', url: '/help#data-submission'},
                {id: 'restapi', title: 'REST API', url: '/help#rest-api'},
            ]},
            {id: 'submitting-metadata', title: 'Submitting Metadata', url: '/help/submitting'},
            {id: 'about', title: 'About', url: '/about'}
        ]}
    ],
    user_section: [
            {id: 'login', title: 'Log in', url: '/'},
            {id: 'accountactions', title: 'Register', url: '/help'}
            // Remove context actions for now{id: 'contextactions', title: 'Actions', url: '/'}
    ]
};


// See https://github.com/facebook/react/issues/2323
var Title = React.createClass({
    render: function() {
        return <title {...this.props}>{this.props.children}</title>;
    },
    componentDidMount: function() {
        var node = document.querySelector('title');
        if (node && !node.getAttribute('data-reactid')) {
            node.setAttribute('data-reactid', this._rootNodeID);
        }
    }
});

/**
 * Creates a promise which completes after a delay, performing no network request.
 * Used to perform a promise.race to see if this timeout or a network requests completes first, which
 * then allows us to set app.state.slow and render a loading icon until long-running network request completes.
 */
class Timeout {
    constructor(timeout) {
        this.promise = new Promise(resolve => setTimeout(resolve.bind(undefined, this), timeout));
    }
}

/**
 * @alias module:app
 */
var App = React.createClass({
    SLOW_REQUEST_TIME: 750,
    historyEnabled: !!(typeof window != 'undefined' && window.history && window.history.pushState),

    /**
     *  Session-related props 'sessionMayBeSet' is meant to provided by server-side only, then scraped and re-provided
     *  by client-side render in browser.js via @see App.getRendersPropValues(documentElement, [propNamesToGet]) to match server-side render.
     *  Similarly as to how is done for the redux store.
     */
    propTypes: {
        "sessionMayBeSet" : React.PropTypes.any,    // Whether Auth0 session exists or not.
    },

    getDefaultProps : function(){
        return {
            'sessionMayBeSet' : null
        }
    },

    getInitialState: function() {
        console.log('APP FILTERS', Filters.hrefToFilters(this.props.href));
        // Todo: Migrate session & user_actions to redux store?
        var session = false;
        var user_actions = [];

        if (this.props.sessionMayBeSet !== null){ // Only provided from server
            if (this.props.sessionMayBeSet === false) session = false;
            if (this.props.sessionMayBeSet === true) session = true;
            else session = false; // Else is null
        } else {
            session = !!(JWT.get('cookie')); // Same cookie sent to server-side to authenticate, so it must match.
        }

        // user_info.details is kept in sync to client-side via browser.js, user_info.user_actions is not.
        // Don't use user_actions unless session is also true.
        // user_actions is only set client-side upon login (it cannot expire unless logout).
        var user_info = JWT.getUserInfo();
        if (user_info && typeof user_info.user_actions !== 'undefined' && Array.isArray(user_info.user_actions)){
            user_actions = user_info.user_actions;
        }

        // Save navigate fxn and other req'd stuffs to GLOBAL navigate obj.
        // So that we may call it from anywhere if necessary without passing through props.
        navigate.setNavigateFunction(this.navigate);

        console.log("App Initial State: ", session, user_actions);

        return {
            'errors': [],
            'dropdownComponent': undefined,
            'content': undefined,
            'session': session,
            'user_actions': user_actions,
            'schemas': null,
            'uploads': {}
        };
    },

    // Dropdown context using React context mechanism.
    childContextTypes: {
        dropdownComponent: React.PropTypes.string,
        listActionsFor: React.PropTypes.func,
        currentResource: React.PropTypes.func,
        location_href: React.PropTypes.string,
        onDropdownChange: React.PropTypes.func,
        portal: React.PropTypes.object,
        hidePublicAudits: React.PropTypes.bool,
        fetch: React.PropTypes.func,
        session: React.PropTypes.bool,
        navigate: React.PropTypes.func,
        contentTypeIsJSON: React.PropTypes.func,
        updateUserInfo: React.PropTypes.func,
        schemas: React.PropTypes.object
    },

    // Retrieve current React context
    getChildContext: function() {
        return {
            dropdownComponent: this.state.dropdownComponent, // ID of component with visible dropdown
            listActionsFor: this.listActionsFor,
            currentResource: this.currentResource,
            location_href: this.props.href,
            onDropdownChange: this.handleDropdownChange, // Function to process dropdown state change
            portal: portal,
            hidePublicAudits: true, // True if audits should be hidden on the UI while logged out
            fetch: this.fetch,
            session: this.state.session,
            navigate: this.navigate,
            contentTypeIsJSON: this.contentTypeIsJSON,
            updateUserInfo: this.updateUserInfo,
            schemas : this.state.schemas
        };
    },

    listActionsFor: function(category) {
        if (category === 'context') {
            var context = this.currentResource();
            var name = this.currentAction();
            var context_actions = [];
            Array.prototype.push.apply(context_actions, context.actions || []);

            if (!name && context.default_page) {
                context = context.default_page;
                var actions = context.actions || [];
                for (var i = 0; i < actions.length; i++) {
                    var action = actions[i];
                    if (action.href[0] == '#') {
                        action.href = context['@id'] + action.href;
                    }
                    context_actions.push(action);
                }
            }
            return context_actions;
        }
        if (category === 'user_section') {
            return portal.user_section;
        }
        if (category === 'user') {
            return this.state.user_actions || [];
        }
        if (category === 'global_sections') {
            return portal.global_sections;
        }
    },

    currentResource: function() {
        return this.props.context;
    },

    currentAction: function() {
        var href_url = url.parse(this.props.href);
        var hash = href_url.hash || '';
        var name;
        if (hash.slice(0, 2) === '#!') {
            name = hash.slice(2);
        }
        return name;
    },

    loadSchemas : function(callback, forceFetch = false){
        if (this.state.schemas !== null && !forceFetch){
            // We've already loaded these successfully (hopefully)
            if (typeof callback === 'function') callback(this.state.schemas);
            return this.state.schemas;
        }
        ajax.promise('/profiles/?format=json').then(data => {
            if (this.contentTypeIsJSON(data)){
                this.setState({
                    schemas: data
                }, () => {
                    // Let Filters have access to schemas for own functions.
                    Filters.getSchemas = () => this.state.schemas;
                    // Rebuild tooltips because they likely use descriptions from schemas
                    ReactTooltip.rebuild();
                    if (typeof callback === 'function') callback(data);
                });
            }
        });
    },

    getStatsComponent : function(){
        if (!this.refs || !this.refs.navigation) return null;
        if (!this.refs.navigation.refs) return null;
        if (!this.refs.navigation.refs.stats) return null;
        return this.refs.navigation.refs.stats;
    },

    updateStats : function(currentCounts, totalCounts = null, callback = null){
        var statsComponent = this.getStatsComponent();
        if (statsComponent){
            if (totalCounts === null){
                return statsComponent.updateCurrentCounts(currentCounts, callback);
            } else {
                return statsComponent.updateCurrentAndTotalCounts(currentCounts, totalCounts, callback);
            }
        }
        return null;
    },

    // When current dropdown changes; componentID is _rootNodeID of newly dropped-down component
    handleDropdownChange: function(componentID) {
        // Use React _rootNodeID to uniquely identify a dropdown menu;
        // It's passed in as componentID
        this.setState({dropdownComponent: componentID});
    },

    handleAutocompleteChosenChange: function(chosen) {
        this.setState({autocompleteTermChosen: chosen});
    },

    handleAutocompleteFocusChange: function(focused) {
        this.setState({autocompleteFocused: focused});
    },

    handleAutocompleteHiddenChange: function(hidden) {
        this.setState({autocompleteHidden: hidden});
    },

    // Handle a click outside a dropdown menu by clearing currently dropped down menu
    handleLayoutClick: function(e) {
        if (this.state.dropdownComponent !== undefined) {
            this.setState({dropdownComponent: undefined});
        }
    },

    // If ESC pressed while drop-down menu open, close the menu
    handleKey: function(e) {
        if (e.which === 27) {
            if (this.state.dropdownComponent !== undefined) {
                e.preventDefault();
                this.handleDropdownChange(undefined);
            } else if (!this.state.autocompleteHidden) {
                e.preventDefault();
                this.handleAutocompleteHiddenChange(true);
            }
        } else if (e.which === 13 && this.state.autocompleteFocused && !this.state.autocompleteTermChosen) {
            e.preventDefault();
        }
    },

    /* Handle updating of info used on the /uploads page. Contains relevant
    item context and AWS UploadManager*/
    updateUploads: function(key, upload_info, del_key=false){
        var new_uploads = _.extend({}, this.state.uploads);
        if (del_key){
            delete new_uploads[key];
        }else{
            new_uploads[key] = upload_info;
        }
        this.setState({'uploads': new_uploads});
    },

    authenticateUser : function(callback = null){
        // check existing user_info in local storage and authenticate
        var idToken = JWT.get();
        if(idToken && (!this.state.session || !this.state.user_actions)){ // if JWT present, and session not yet set (from back-end), try to authenticate
            this.fetch('/login', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer '+idToken
                },
                body: JSON.stringify({id_token: idToken})
            })
            .then(response => {
                if (response.code || response.status || response.id_token !== idToken) throw response;
                return response;
            })
            .then(response => {
                JWT.saveUserInfo(response);
                this.updateUserInfo(callback);
            }, error => {
                // error, clear JWT token from cookie & user_info from localStorage (via JWT.remove())
                // and unset state.session & state.user_actions (via this.updateUserInfo())
                JWT.remove();
                this.updateUserInfo(callback);
            });
            return idToken;
        }
        return null;
    },

    // Once the app component is mounted, bind keydowns to handleKey function
    componentDidMount: function() {
        globals.bindEvent(window, 'keydown', this.handleKey);

        this.authenticateUser();
        // Load schemas into app.state, access them where needed via props (preferred, safer) or this.context.
        this.loadSchemas();

        var query_href;
        if(document.querySelector('link[rel="canonical"]')){
            query_href = document.querySelector('link[rel="canonical"]').getAttribute('href');
        }else{
            query_href = this.props.href;
        }
        if (this.props.href !== query_href){
            store.dispatch({
                type: {'href':query_href}
            });
        }
        if (this.historyEnabled) {
            var data = this.props.context;
            try {
                window.history.replaceState(data, '', window.location.href);
            } catch (exc) {
                // Might fail due to too large data
                window.history.replaceState(null, '', window.location.href);
            }
            // Avoid popState on load, see: http://stackoverflow.com/q/6421769/199100
            var register = window.addEventListener.bind(window, 'popstate', this.handlePopState, true);
            if (window._onload_event_fired) {
                register();
            } else {
                window.addEventListener('load', setTimeout.bind(window, register));
            }
        } else {
            window.onhashchange = this.onHashChange;
        }
        //window.onbeforeunload = this.handleBeforeUnload; // this.handleBeforeUnload is not defined

        // Load up analytics
        analytics.initializeGoogleAnalytics(analytics.getTrackingId(this.props.href));
    },

    componentDidUpdate: function (prevProps, prevState) {
        var key;
        if (this.props) {
            for (key in this.props) {
                if (this.props[key] !== prevProps[key]) {
                    console.log('changed props: %s', key);
                    if (key === 'href'){
                        // We need to rebuild tooltips after navigation to a different page.
                        ReactTooltip.rebuild();

                        // Register google analytics pageview event.
                        analytics.registerPageView(this.props[key]);
                    }
                }
            }
        }
        if (this.state) {
            if (prevState.session !== this.state.session && ChartDataController.isInitialized()){
                setTimeout(function(){
                    // Delay 100ms.
                    console.log("SYNCING CHART DATA");
                    ChartDataController.sync();
                }, 100);
            }
            for (key in this.state) {
                if (this.state[key] !== prevState[key]) {
                    console.log('changed state: %s', key, this.state[key]);
                }
            }
        }
    },

    // functions previously in persona, mixins.js
    fetch: function (url, options) {
        options = _.extend({credentials: 'same-origin'}, options);
        var http_method = options.method || 'GET';
        var headers = options.headers = _.extend({}, options.headers);
        // Strip url fragment.
        var url_hash = url.indexOf('#');
        if (url_hash > -1) {
            url = url.slice(0, url_hash);
        }
        var data = options.body ? options.body : null;
        var request = ajax.promise(url, http_method, headers, data, options.cache === false ? false : true);
        request.xhr_begin = 1 * new Date();
        request.then(response => {
            request.xhr_end = 1 * new Date();
        });
        return request;
    },

    updateUserInfo: function(callback = null){
        // get user actions (a function of log in) from local storage
        var userActions = [];
        var session = false;
        var userInfo = JWT.getUserInfo();
        if (userInfo){
            userActions = userInfo.user_actions;
            session = true;
        }

        var stateChange = {};
        if (!_.isEqual(userActions, this.state.user_actions)) stateChange.user_actions = userActions;
        if (session != this.state.session) stateChange.session = session;

        if (Object.keys(stateChange).length > 0){
            this.setState(stateChange, typeof callback === 'function' ? callback.bind(this, session, userInfo) : null);
        } else {
            if (typeof callback === 'function') callback(session, userInfo);
        }
    },

    // functions previously in navigate, mixins.js
    onHashChange: function (event) {
        // IE8/9
        store.dispatch({
            type: {'href':document.querySelector('link[rel="canonical"]').getAttribute('href')}
        });
    },

    handleClick: function(event) {
        // https://github.com/facebook/react/issues/1691
        if (event.isDefaultPrevented()) return;

        var target = event.target;
        var nativeEvent = event.nativeEvent;

        // SVG anchor elements have tagName == 'a' while HTML anchor elements have tagName == 'A'
        while (target && (target.tagName.toLowerCase() != 'a' || target.getAttribute('data-href'))) {
            target = target.parentElement;
        }
        if (!target) return;

        if (target.getAttribute('disabled')) {
            event.preventDefault();
            return;
        }

        // Ensure this is a plain click
        if (nativeEvent.which > 1 || nativeEvent.shiftKey || nativeEvent.altKey || nativeEvent.metaKey) return;

        // Skip links with a data-bypass attribute.
        if (target.getAttribute('data-bypass')) return;

        var href = target.getAttribute('href');
        if (href === null) href = target.getAttribute('data-href');
        if (href === null) return;

        // Skip javascript links
        if (href.indexOf('javascript:') === 0) return;

        // Skip external links
        if (!origin.same(href)) return;

        // Skip links with a different target
        if (target.getAttribute('target')) return;

        // Skip @@download links
        if (href.indexOf('/@@download') != -1) return;

        // Don't cache requests to user profile.
        var navOpts = {};
        if (target.getAttribute('data-no-cache')) navOpts.cache = false;

        // With HTML5 history supported, local navigation is passed
        // through the navigate method.
        if (this.historyEnabled) {
            event.preventDefault();
            this.navigate(href, navOpts);
            if (this.refs && this.refs.navigation){
                this.refs.navigation.closeMobileMenu();
            }
            if (target && target.blur) target.blur();
        }
    },

    // Submitted forms are treated the same as links
    handleSubmit: function(event) {
        var target = event.target;

        // Skip POST forms
        if (target.method != 'get') return;

        // Skip forms with a data-bypass attribute.
        if (target.getAttribute('data-bypass')) return;

        // Skip external forms
        if (!origin.same(target.action)) return;

        var options = {};
        var action_url = url.parse(url.resolve(this.props.href, target.action));
        options.replace = action_url.pathname == url.parse(this.props.href).pathname;
        var search = serialize(target);
        if (target.getAttribute('data-removeempty')) {
            search = search.split('&').filter(function (item) {
                return item.slice(-1) != '=';
            }).join('&');
        }
        var href = action_url.pathname;
        if (search) {
            href += '?' + search;
        }
        options.skipRequest = target.getAttribute('data-skiprequest');

        if (this.historyEnabled) {
            event.preventDefault();
            this.navigate(href, options);
        }
    },

    handlePopState: function (event) {
        if (this.DISABLE_POPSTATE) return;
        if (!this.confirmNavigation()) {
            window.history.pushState(window.state, '', this.props.href);
            return;
        }
        if (!this.historyEnabled) {
            window.location.reload();
            return;
        }
        var request = this.props.contextRequest;
        var href = window.location.href;
        if (event.state) {
            // Abort inflight xhr before dispatching
            if (request && this.requestCurrent) {
                // Abort the current request, then remember we've aborted it so that we don't render
                // the Network Request Error page.
                if (request && typeof request.abort === 'function'){
                    request.abort();
                    console.warn("Aborted previous request", request);
                }
                this.requestAborted = true;
                this.requestCurrent = false;
            }
            store.dispatch({
                type: {
                    'href': href,
                    'context': event.state
                }
            });

        }
        // Always async update in case of server side changes.
        this.navigate(href, {'replace': true});
    },

    // only navigate if href changes
    confirmNavigation: function(href, options) {
        if(options && options.inPlace && options.inPlace==true){
            return true;
        }
        if(href===this.props.href){
            return false;
        }
        return true;
    },

    navigate: function (href, options = {}, callback = null, fallbackCallback = null, includeReduxDispatch = {}) {
        // options.skipRequest only used by collection search form
        // options.replace only used handleSubmit, handlePopState, handlePersonaLogin

        var fragment;

        function setupRequest(targetHref){
            targetHref = url.resolve(this.props.href, targetHref);
            if (!options.skipConfirmCheck && !this.confirmNavigation(targetHref, options)) {
                return false;
            }
            // Strip url fragment.
            fragment = '';
            var href_hash_pos = targetHref.indexOf('#');
            if (href_hash_pos > -1) {
                fragment = targetHref.slice(href_hash_pos);
                targetHref = targetHref.slice(0, href_hash_pos);
            }
            href = targetHref;
            return true;
        }

        function doRequest(repeatIfError = false){

            if (!this.historyEnabled) {
                if (options.replace) {
                    window.location.replace(href + fragment);
                } else {
                    var old_path = ('' + window.location).split('#')[0];
                    window.location.assign(href + fragment);
                    if (old_path == href) {
                        window.location.reload();
                    }
                }
                return false;
            }

            if (this.props.contextRequest && this.requestCurrent && repeatIfError === true) {
                // Abort the current request, then remember we've aborted the request so that we
                // don't render the Network Request Error page.
                if (this.props.contextRequest && typeof this.props.contextRequest.abort === 'function') this.props.contextRequest.abort();
                this.requestAborted = true;
                this.requestCurrent = false;
            }

            if (options.skipRequest) {
                if (options.replace) {
                    window.history.replaceState(window.state, '', href + fragment);
                } else {
                    window.history.pushState(window.state, '', href + fragment);
                }
                if (!options.skipUpdateHref) {
                    store.dispatch({
                        type: {'href':href + fragment}
                    });
                }
                return null;
            }

            var request = this.fetch(
                href,
                {
                    'headers': {}, // Filled in by ajax.promise
                    'cache' : options.cache === false ? false : true
                }
            );

            this.requestCurrent = true; // Remember we have an outstanding GET request
            var timeout = new Timeout(this.SLOW_REQUEST_TIME);

            Promise.race([request, timeout.promise]).then(v => {
                if (v instanceof Timeout) {
                    console.log('TIMEOUT!!!');
                    // TODO: implement some other type of slow? A: YES
                    // store.dispatch({
                    //     type: {'slow':true}
                    // });
                    this.setState({ 'slowLoad' : true });
                } else {
                    // Request has returned data
                    this.requestCurrent = false;
                }
            });

            var promise = request.then((response)=>{
                // Check/handle server-provided error code/message(s).

                if (response.code === 403){

                    var jwtHeader = null;
                    try {
                        jwtHeader = request.xhr.getResponseHeader('X-Request-JWT');
                    } catch(e) {
                        // Some browsers may not support getResponseHeader. Fallback to 403 response detail which only
                        // replaces unauth'd response if request Content-Type = application/json
                        console.error(e);
                    }

                    if ( // Bad or expired JWT
                        (response.detail === "Bad or expired token.") ||
                        (jwtHeader === 'expired')
                    ){
                        JWT.remove();

                        // Wait until request(s) complete before setting notification (callback is called later in promise chain)
                        var oldCallback = callback;
                        callback = function(response){
                            Alerts.queue(Alerts.LoggedOut);
                            if (typeof oldCallback === 'function') oldCallback(response);
                        }.bind(this);
                    }

                    // Update state.session after (possibly) removing expired JWT.
                    // Also, may have been logged out in different browser window so keep state.session up-to-date BEFORE a re-request
                    this.updateUserInfo();

                    if (repeatIfError) {
                        setTimeout(function(){
                            if (href.indexOf('/users/') !== -1){ // ToDo: Create&store list of private pages other than /users/<...>
                                // Redirect to home if on a 'private' page (e.g. user profile).
                                if (setupRequest.call(this, '/')) doRequest.call(this, false);
                            } else {
                                // Otherwise redo request after any other error handling (unset JWT, etc.).
                                doRequest.call(this, false);
                            }
                        }.bind(this), 0);
                        throw new Error('HTTPForbidden');   // Cancel out of this request's promise chain
                    } else {
                        console.error("Authentication-related error -", response); // Log error & continue down promise chain.
                    }

                } else { // Not a 403 error
                    // May have been logged out in different browser window so keep state.session up-to-date
                    this.updateUserInfo();
                }
                return response;
            })
            .then(response => {
                this.requestCurrent = false;
                // navigate normally to URL of unexpected non-JSON response so back button works.
                if (!this.contentTypeIsJSON(response)) {
                    if (options.replace) {
                        window.location.replace(href + fragment);
                    } else {
                        var old_path = ('' + window.location).split('#')[0];
                        window.location.assign(href + fragment);
                        return;
                    }
                }
                if (options.replace) {
                    window.history.replaceState(null, '', href + fragment);
                } else {
                    window.history.pushState(null, '', href + fragment);
                }
                dispatch_dict.href = href + fragment;

                return response;
            })
            .then(response => this.receiveContextResponse(response,includeReduxDispatch))
            .then(response => {
                this.state.slowLoad && this.setState({'slowLoad' : false});
                if (typeof callback == 'function'){
                    callback(response);
                }
            });

            if (!options.replace && !options.dontScrollToTop) {
                promise = promise.then(this.scrollTo);
            }

            promise.catch((err)=>{
                // Unset these for future requests.
                this.requestAborted = false;
                this.requestCurrent = false;
                this.state.slowLoad && this.setState({'slowLoad' : false});
                if (typeof fallbackCallback == 'function'){
                    fallbackCallback(err);
                }
                // Err could be an XHR object if could not parse JSON.
                if (
                    typeof err.status === 'number' &&
                    [502, 503, 504, 505, 598, 599, 444, 499, 522, 524].indexOf(err.status) > -1
                ) {
                    // Bad connection
                    Alerts.queue(Alerts.ConnectionError);
                } else if (err.message !== 'HTTPForbidden'){
                    console.error('Error in App.navigate():', err);
                    throw err; // Bubble it up.
                } else {
                    console.info("Logged Out");
                }
            });
            console.info('Navigating > ', request);
            dispatch_dict.contextRequest = request;
            return request;
        }

        if (setupRequest.call(this, href)){
            var request = doRequest.call(this, true);
            if (request === null){
                if (typeof callback === 'function') callback();
            }
            return request;
        } else {
            return null; // Was handled by setupRequest (returns false)
        }

    },

    receiveContextResponse: function (data, extendDispatchDict = {}) {
        // title currently ignored by browsers
        try {
            window.history.replaceState(data, '', window.location.href);
        } catch (exc) {
            // Might fail due to too large data
            window.history.replaceState(null, '', window.location.href);
        }
        // Set up new properties for the page after a navigation click. First disable slow now that we've
        // gotten a response. If the requestAborted flag is set, then a request was aborted and so we have
        // the data for a Network Request Error. Don't render that, but clear the requestAboerted flag.
        // Otherwise we have good page data to render.
        // dispatch_dict.slow = false;
        if (!this.requestAborted) {
            // Real page to render
            dispatch_dict.context = data;
        } else {
            // data holds network error. Don't render that, but clear the requestAborted flag so we're ready
            // for the next navigation click.
            this.requestAborted = false;
        }
        store.dispatch({
            type: _.extend({},dispatch_dict,extendDispatchDict)
        });
        dispatch_dict={};
        return data;
    },

    contentTypeIsJSON: function(content) {
        var isJson = true;
        try{
            var json = JSON.parse(JSON.stringify(content));
        }catch(err){
            isJson = false;
        }
        return isJson;
    },

    scrollTo: function() {
        var hash = window.location.hash;
        if (hash && document.getElementById(hash.slice(1))) {
            window.location.replace(hash);
        } else {
            window.scrollTo(0, 0);
        }
    },

    render: function() {
        console.log('render app');
        var context = this.props.context;
        var content;
        var href_url = url.parse(this.props.href);
        // Switching between collections may leave component in place
        var key = context && context['@id'] && context['@id'].split('?')[0];
        var current_action = this.currentAction();

        if (!current_action && context.default_page) {
            context = context.default_page;
        }

        var errors = this.state.errors.map(function (error) {
            return <div className="alert alert-error"></div>;
        });

        var appClass = 'done';
        if (this.props.slow) {
            appClass = 'communicating';
        }

        var canonical = this.props.href;

        if (context.canonical_uri) {
            if (href_url.host) {
                canonical = (href_url.protocol || '') + '//' + href_url.host + context.canonical_uri;
            } else {
                canonical = context.canonical_uri;
            }
        }
        // add static page routing
        var title;
        var routeList = canonical.split("/");
        var lowerList = [];
        var scrollList = [];
        var actionList = [];
        routeList.map(function(value) {
            if (value.includes('#') && value.charAt(0) !== "#"){
                var navSplit = value.split("#");
                lowerList.push(navSplit[0].toLowerCase());
                if (navSplit[1].charAt(0) === '!'){
                    actionList.push(navSplit[1].toLowerCase());
                }else{
                    scrollList.push(navSplit[1].toLowerCase());
                }
            }else if(value.charAt(0) !== "!" && value.length > 0){
                // test for edit handle
                if (value == '#!edit'){
                    actionList.push('edit');
                }else if (value == '#!create'){
                    actionList.push('create');
                }else if (value == '#!clone'){
                    actionList.push('clone');
                }else{
                    lowerList.push(value.toLowerCase());
                }
            }
        });
        var currRoute = lowerList.slice(1); // eliminate http
        // check error status
        var status;
        if(context.code && context.code == 404){
            // check to ensure we're not looking at a static page
            var route = currRoute[currRoute.length-1];
            if(route != 'help' && route != 'about' && route != 'home' && route != 'uploads' && route != 'submissions'){
                status = 'not_found';
            }
        }else if(context.code && context.code == 403){
            if(context.title && (context.title == 'Login failure' || context.title == 'No Access')){
                status = 'invalid_login';
            }else if(context.title && context.title == 'Forbidden'){
                status = 'forbidden';
            }
        }
        // first case is fallback
        if (canonical === "about:blank"){
            title = portal.portal_title;
            content = null;
        // error catching
        }else if(status){
            content = <ErrorPage currRoute={currRoute[currRoute.length-1]} status={status}/>;
            title = 'Error';
        }else if(actionList.length == 1){
            // check if the desired action is allowed per user (in the context)

            var contextActionNames = this.listActionsFor('context').map(function(act){
                return act.name || '';
            });
            // see if desired actions is not allowed for current user
            if (!_.contains(contextActionNames, actionList[0])){
                content = <ErrorPage status={'forbidden'}/>;
                title = 'Action not permitted';
            }else{
                ContentView = globals.content_views.lookup(context, current_action);
                if (ContentView){
                    content = (
                        <Action
                            context={context}
                            schemas={this.state.schemas}
                            expSetFilters={this.props.expSetFilters}
                            uploads={this.state.uploads}
                            updateUploads={this.updateUploads}
                            expIncompleteFacets={this.props.expIncompleteFacets}
                            session={this.state.session}
                            key={key}
                            navigate={this.navigate}
                            href={this.props.href}
                            edit={actionList[0] == 'edit'}
                            create={actionList[0] == 'create'}
                        />
                    );
                    title = makeTitle({'context': context});
                    if (title && title != 'Home') {
                        title = title + ' – ' + portal.portal_title;
                    } else {
                        title = portal.portal_title;
                    }
                }else{
                    // Handle the case where context is not loaded correctly
                    content = <ErrorPage status={null}/>;
                    title = 'Error';
                }
            }
        }else if (context) {
            var ContentView = globals.content_views.lookup(context, current_action);
            if (ContentView){
                content = (
                    <ContentView
                        context={context}
                        schemas={this.state.schemas}
                        expSetFilters={this.props.expSetFilters}
                        expIncompleteFacets={this.props.expIncompleteFacets}
                        uploads={this.state.uploads}
                        updateUploads={this.updateUploads}
                        session={this.state.session}
                        key={key}
                        navigate={this.navigate}
                        href={this.props.href}
                    />
                );
                title = context.display_title || context.title || context.name || context.accession || context['@id'];
                if (title && title != 'Home') {
                    title = title + ' – ' + portal.portal_title;
                } else {
                    title = portal.portal_title;
                }
            } else {
                // Handle the case where context is not loaded correctly
                content = <ErrorPage status={null}/>;
                title = 'Error';
            }
        }
        // Google does not update the content of 301 redirected pages
        var base;
        if (({'http://data.4dnucleome.org/': 1})[canonical]) {
            base = canonical = 'http://data.4dnucleome.org/';
            this.historyEnabled = false;

        }
        return (
            <html lang="en">
                <head>
                    <meta charSet="utf-8"/>
                    <meta httpEquiv="Content-Type" content="text/html, charset=UTF-8"/>
                    <meta httpEquiv="X-UA-Compatible" content="IE=edge"/>
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
                    <meta name="google-site-verification" content="t0PnhAqm80xyWalBxJHZdld9adAk40SHjUyPspYNm7I" />
                    <Title>{title}</Title>
                    {base ? <base href={base}/> : null}
                    <link rel="canonical" href={canonical} />
                    <script async src='//www.google-analytics.com/analytics.js'></script>
                    <link href="https://fonts.googleapis.com/css?family=Work+Sans:200,300,400,500,600,700" rel="stylesheet" />
                    <link href="https://fonts.googleapis.com/css?family=Yrsa" rel="stylesheet" />
                    <script data-prop-name="user_details" type="application/ld+json" dangerouslySetInnerHTML={{
                        __html: jsonScriptEscape(JSON.stringify(JWT.getUserDetails())) /* Kept up-to-date in browser.js */
                    }}></script>
                    <script data-prop-name="inline" type="application/javascript" charSet="utf-8" dangerouslySetInnerHTML={{__html: this.props.inline}}></script>
                    <link rel="stylesheet" href="/static/css/style.css" />
                    <link href="/static/font/ss-gizmo.css" rel="stylesheet" />
                    <link href="/static/font/ss-black-tie-regular.css" rel="stylesheet" />
                </head>
                <body onClick={this.handleClick} onSubmit={this.handleSubmit}>
                    <script data-prop-name="context" type="application/ld+json" dangerouslySetInnerHTML={{
                        __html: '\n\n' + jsonScriptEscape(JSON.stringify(this.props.context)) + '\n\n'
                    }}></script>
                    <script data-prop-name="alerts" type="application/ld+json" dangerouslySetInnerHTML={{
                        __html: jsonScriptEscape(JSON.stringify(this.props.alerts))
                    }}></script>
                    <script data-prop-name="expSetFilters" type="application/ld+json" dangerouslySetInnerHTML={{
                        __html: jsonScriptEscape(JSON.stringify(Filters.convertExpSetFiltersTerms(this.props.expSetFilters, 'array')))
                    }}></script>
                    <div id="slow-load-container" className={this.state.slowLoad ? 'visible' : null}>
                        <div className="inner">
                            <i className="icon icon-circle-o-notch"/>
                            { /*<img src="/static/img/ajax-loader.gif"/>*/ }
                        </div>
                    </div>
                    <div id="slot-application">
                        <div id="application" className={appClass}>
                            <div className="loading-spinner"></div>
                            <div id="layout" onClick={this.handleLayoutClick} onKeyPress={this.handleKey}>
                                <Navigation
                                    href={this.props.href}
                                    session={this.state.session}
                                    expSetFilters={this.props.expSetFilters}
                                    ref="navigation"
                                />
                                <div id="content" className="container">
                                    <FacetCharts
                                        href={this.props.href}
                                        context={this.props.context}
                                        expSetFilters={this.props.expSetFilters}
                                        navigate={this.navigate}
                                        updateStats={this.updateStats}
                                        schemas={this.state.schemas}
                                        session={this.state.session}
                                    />
                                    <Alerts alerts={this.props.alerts} />
                                    { content }
                                </div>
                                {errors}
                                <div id="layout-footer"></div>
                            </div>
                            <Footer version={this.props.context.app_version} />
                        </div>
                    </div>
                    <ReactTooltip effect="solid" ref="tooltipComponent" afterHide={()=>{
                        var _tooltip = this.refs && this.refs.tooltipComponent;
                        // Grab tip & unset style.left and style.top using same method tooltip does internally.
                        var node = ReactDOM.findDOMNode(_tooltip);
                        node.style.left = null;
                        node.style.top = null;
                    }} />
                    <ChartDetailCursor
                        href={this.props.href}
                        verticalAlign="center" /* cursor position relative to popover */
                        //debugStyle /* -- uncomment to keep this Component always visible so we can style it */
                    />
                </body>
            </html>
        );
    },

    statics: {
        getRenderedPropValues : function(document, filter = null){
            var returnObj = {};
            var script_props;
            if (typeof filter === 'string') script_props = document.querySelectorAll('script[data-prop-name="' + filter + '"]');
            else script_props = document.querySelectorAll('script[data-prop-name]');
            for (var i = 0; i < script_props.length; i++) {
                var elem = script_props[i];
                var prop_name = elem.getAttribute('data-prop-name');
                if (filter && Array.isArray(filter)){
                    if (filter.indexOf(prop_name) === -1) continue;
                }
                var elem_value = elem.text;
                var elem_type = elem.getAttribute('type') || '';
                if (elem_type == 'application/json' || elem_type.slice(-5) == '+json') {
                    elem_value = JSON.parse(elem_value);
                }
                //if (elem.getAttribute('data-prop-name') === 'user_details' && !filter){
                    // pass; don't include as is not a redux prop
                //} else {
                    returnObj[prop_name] = elem_value;
                //}
            }
            return returnObj;
        },
        getRenderedProps: function (document, filters = null) {
            return _.extend(App.getRenderedPropValues(document, filters), {
                'href' : document.querySelector('link[rel="canonical"]').getAttribute('href') // Ensure the initial render is exactly the same
            });
        }
    }
});

module.exports = App;
