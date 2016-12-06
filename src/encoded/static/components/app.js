'use strict';
var React = require('react');
var jsonScriptEscape = require('../libs/jsonScriptEscape');
var globals = require('./globals');
var HomePage = require('./home');
var ErrorPage = require('./error');
var Navigation = require('./navigation');
var HelpPage = require('./help');
var AboutPage = require('./about');
var Footer = require('./footer');
var url = require('url');
var _ = require('underscore');
var store = require('../store');
var browse = require('./browse');
var origin = require('../libs/origin');
var serialize = require('form-serialize');
var { ajaxLoad, ajaxPromise, JWT, console, responsiveGridState } = require('./objectutils');
var jwt = require('jsonwebtoken');
var dispatch_dict = {}; //used to store value for simultaneous dispatch

var portal = {
    portal_title: '4DN Data Portal',
    global_sections: [
        {id: 'browse', sid:'sBrowse', title: 'Browse', url: '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all'},
        {id: 'help', sid:'sHelp', title: 'Help', children: [
            {id: 'gettingstarted', title: 'Getting started', url: '/help'},
            {id: 'metadatastructure', title: 'Metadata structure', url: '/help#metadata-structure'},
            {id: 'datasubmission', title: 'Data submission', url: '/help#data-submission'},
            {id: 'restapi', title: 'REST API', url: '/help#rest-api'},
            {id: 'about', title: 'About', url: '/about/'}
        ]}
    ],
    user_section: [
            {id: 'login', title: 'Log in', url: '/'},
            {id: 'accountactions', title: 'Register', url: '/help/'}
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

class Timeout {
    constructor(timeout) {
        this.promise = new Promise(resolve => setTimeout(resolve.bind(undefined, this), timeout));
    }
}


// App is the root component, mounted on document.body.
// It lives for the entire duration the page is loaded.
// App maintains state for the
var App = React.createClass({
    SLOW_REQUEST_TIME: 250,
    historyEnabled: !!(typeof window != 'undefined' && window.history && window.history.pushState),

    getInitialState: function() {
        return {
            errors: [],
            dropdownComponent: undefined,
            content: undefined,
            //session: !!(JWT.get('cookie')), // ToDo : Make this work for faster app state change on page load
            session: false,
            user_actions: [],
            schemas: null
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
        ajaxPromise('/profiles/?format=json').then(data => {
            if (this.contentTypeIsJSON(data)){
                this.setState({
                    schemas: data
                }, () => {
                    if (typeof callback === 'function') callback(data);
                });
            }
        });
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

    authenticateUser : function(callback = null){
        // check existing user_info in local storage and authenticate
        var idToken = JWT.get();
        if(idToken){ // if JWT present, try to authenticate
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
                if (typeof callback === 'function') callback(response);
            }, error => {
                //error, clear localStorage and session
                JWT.remove();
                if (typeof callback === 'function') callback(error);
            });
            return idToken;
        }
        return null;
    },

    // Once the app component is mounted, bind keydowns to handleKey function
    componentDidMount: function() {
        globals.bindEvent(window, 'keydown', this.handleKey);

        this.authenticateUser(this.updateUserInfo);
        this.loadSchemas(); // Load schemas into app.state, access them where needed via props (preferred, safer) or this.context.

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
    },

    componentDidUpdate: function (prevProps, prevState) {
        var key;
        if (this.props) {
            for (key in this.props) {
                if (this.props[key] !== prevProps[key]) {
                    console.log('changed props: %s', key);
                }
            }
        }
        if (this.state) {
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
        var request = ajaxPromise(url, http_method, headers, data);
        request.xhr_begin = 1 * new Date();
        request.then(response => {
            request.xhr_end = 1 * new Date();
        });
        return request;
    },

    updateUserInfo: function(){
        // get user actions (a function of log in) from local storage
        var userActions = [];
        var session = false;
        if(typeof(Storage) !== 'undefined'){ // check if localStorage supported
            if(localStorage && localStorage.user_info){
                var userInfo = JSON.parse(localStorage.getItem('user_info'));
                userActions = userInfo.user_actions;
                session = true;
            }
        }
        if (!_.isEqual(userActions, this.state.user_actions) || !_.isEqual(session, this.state.session)){
            this.setState({user_actions:userActions, session:session});
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

        // With HTML5 history supported, local navigation is passed
        // through the navigate method.
        if (this.historyEnabled) {
            event.preventDefault();
            this.navigate(href);
            if (this.refs && this.refs.navigation){
                this.refs.navigation.closeMobileMenu();
            }
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
                if (request && typeof request.abort === 'function') request.abort();
                this.requestAborted = true;
                this.requestCurrent = false;
            }
            store.dispatch({
                type: {'context': event.state}
            });
            store.dispatch({
                type: {'href': href}
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

    navigate: function (href, options, callback) {
        // options.skipRequest only used by collection search form
        // options.replace only used handleSubmit, handlePopState, handlePersonaLogin
        options = options || {};
        href = url.resolve(this.props.href, href);
        if (!this.confirmNavigation(href, options)) {
            return;
        }
        // Strip url fragment.
        var fragment = '';
        var href_hash_pos = href.indexOf('#');
        if (href_hash_pos > -1) {
            fragment = href.slice(href_hash_pos);
            href = href.slice(0, href_hash_pos);
        }
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
            return;
        }

        var request = this.props.contextRequest;

        console.log('navigate() > ',request);

        if (request && this.requestCurrent) {
            // Abort the current request, then remember we've aborted the request so that we
            // don't render the Network Request Error page.
            if (request && typeof request.abort === 'function') request.abort();
            this.requestAborted = true;
            this.requestCurrent = false;
        }

        if (options.skipRequest) {
            if (options.replace) {
                window.history.replaceState(window.state, '', href + fragment);
            } else {
                window.history.pushState(window.state, '', href + fragment);
            }
            store.dispatch({
                type: {'href':href + fragment}
            });
            return;
        }
        var userInfo = localStorage.getItem('user_info') || null;
        var idToken = userInfo ? JSON.parse(userInfo).id_token : null;
        var reqHeaders = {headers: {'Accept': 'application/json'}};
        if(userInfo && this.state.session){
            reqHeaders.headers['Authorization'] = 'Bearer '+idToken;
        }
        var reqHref = href.slice(-1) === '/' ? href + '/?format=json' : href + '&format=json';
        request = this.fetch(reqHref, reqHeaders);
        this.requestCurrent = true; // Remember we have an outstanding GET request
        var timeout = new Timeout(this.SLOW_REQUEST_TIME);
        Promise.race([request, timeout.promise]).then(v => {
            if (v instanceof Timeout) {
                console.log('TIMEOUT!!!');
                // TODO: implement some other type of slow?
                // store.dispatch({
                //     type: {'slow':true}
                // });

            } else {
                // Request has returned data
                this.requestCurrent = false;
            }
        });
        var promise = request.then(response => {
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

            if (typeof callback == 'function'){
                callback(response);
            }

            return response;
        })
        .then(this.receiveContextResponse);
        if (!options.replace) {
            promise = promise.then(this.scrollTo);
        }
        dispatch_dict.contextRequest = request;
        return request;
    },

    receiveContextResponse: function (data) {
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
            type: dispatch_dict
        });
        dispatch_dict={};
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
        routeList.map(function(value) {
            if (value.includes('#') && value.charAt(0) !== "#"){
                var navSplit = value.split("#");
                lowerList.push(navSplit[0].toLowerCase());
                scrollList.push(navSplit[1].toLowerCase());
            }else if(value.charAt(0) !== "!" && value.length > 0){
                lowerList.push(value.toLowerCase());
            }
        });
        var currRoute = lowerList.slice(1); // eliminate http
        // check error status
        var status;
        if(context.code && context.code == 404){
            // check to ensure we're not looking at a static page
            var route = currRoute[currRoute.length-1];
            if(route != 'help' && route != 'about' && route != 'home'){
                status = 'not_found';
            }
        }else if(context.code && context.code == 403){
            if(context.title && (context.title == 'Login failure' || context.title == 'no access')){
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
        }else if (currRoute[currRoute.length-1] === 'home' || (currRoute[currRoute.length-1] === href_url.host)){
            content = <HomePage session={this.state.session}/>;
            title = portal.portal_title;
        }else if (currRoute[currRoute.length-1] === 'help'){
            content = <HelpPage />;
            title = 'Help - ' + portal.portal_title;
        }else if (currRoute[currRoute.length-1] === 'about'){
            content = <AboutPage />;
            title = 'About - ' + portal.portal_title;
        }else if (context) {
            var ContentView = globals.content_views.lookup(context, current_action);
            if (ContentView){
                content = (
                    <ContentView
                        context={context}
                        schemas={this.state.schemas}
                        expSetFilters={this.props.expSetFilters}
                        expIncompleteFacets={this.props.expIncompleteFacets}
                    />
                );
                title = context.title || context.name || context.accession || context['@id'];
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
                    <meta httpEquiv="X-UA-Compatible" content="IE=edge"/>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                    <meta name="google-site-verification" content="t0PnhAqm80xyWalBxJHZdld9adAk40SHjUyPspYNm7I" />
                    <Title>{title}</Title>
                    {base ? <base href={base}/> : null}
                    <link rel="canonical" href={canonical} />
                    <script async src='//www.google-analytics.com/analytics.js'></script>
                    <link href="https://fonts.googleapis.com/css?family=Work+Sans:200,300,400,500,600,700" rel="stylesheet" />
                    <link href="https://fonts.googleapis.com/css?family=Yrsa" rel="stylesheet" />
                    <script data-prop-name="inline" dangerouslySetInnerHTML={{__html: this.props.inline}}></script>
                    <link rel="stylesheet" href="/static/css/style.css" />
                    <link href="/static/font/ss-gizmo.css" rel="stylesheet" />
                    <link href="/static/font/ss-black-tie-regular.css" rel="stylesheet" />
                </head>
                <body onClick={this.handleClick} onSubmit={this.handleSubmit}>
                    <script data-prop-name="context" type="application/ld+json" dangerouslySetInnerHTML={{
                        __html: '\n\n' + jsonScriptEscape(JSON.stringify(this.props.context)) + '\n\n'
                    }}></script>
                    <div id="slot-application">
                        <div id="application" className={appClass}>
                        <div className="loading-spinner"></div>
                            <div id="layout" onClick={this.handleLayoutClick} onKeyPress={this.handleKey}>
                                <Navigation href={ this.props.href } ref="navigation" />
                                <div id="content" className="container" key={key}>
                                    {content}
                                </div>
                                {errors}
                                <div id="layout-footer"></div>
                            </div>
                            <Footer version={this.props.context.app_version} />
                        </div>
                    </div>
                </body>
            </html>
        );
    },

    statics: {
        getRenderedProps: function (document) {
            // Ensure the initial render is exactly the same
            var docHref = document.querySelector('link[rel="canonical"]').getAttribute('href');
            if (store.getState().href !== docHref) { // Should be true (store (on front-end) seems blank @ this point)
                store.dispatch({
                    type: {'href':docHref}
                });
            }
            var props_dict = {};
            var script_props = document.querySelectorAll('script[data-prop-name]');
            for (var i = 0; i < script_props.length; i++) {
                var elem = script_props[i];
                var elem_value = elem.text;
                var elem_type = elem.getAttribute('type') || '';
                if (elem_type == 'application/json' || elem_type.slice(-5) == '+json') {
                    elem_value = JSON.parse(elem_value);
                }
                props_dict[ elem.getAttribute('data-prop-name')] = elem_value;
            }
            store.dispatch({
                type: props_dict
            });
        }
    }
});

module.exports = App;
