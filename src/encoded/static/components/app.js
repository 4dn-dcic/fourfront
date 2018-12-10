'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import url from 'url';
import queryString from 'query-string';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
var serialize = require('form-serialize');
import { detect as detectBrowser } from 'detect-browser';
import jsonScriptEscape from '../libs/jsonScriptEscape';
import * as globals from './globals';
import ErrorPage from './static-pages/ErrorPage';
import { NavigationBar } from './navigation/NavigationBar';
import { Footer } from './footer';
import * as store from '../store';
import * as origin from '../libs/origin';
import { Filters, ajax, JWT, console, isServerSide, navigate, analytics, object, Schemas, layout, SEO, typedefs } from './util';
import Alerts from './alerts';
import { FacetCharts } from './facetcharts';
import { requestAnimationFrame } from './viz/utilities';
import { ChartDataController } from './viz/chart-data-controller';
import ChartDetailCursor from './viz/ChartDetailCursor';
import PageTitle from './PageTitle';

var { NavigateOpts } = typedefs;



/**
 * Used to temporarily store Redux store values for simultaneous dispatch.
 *
 * @private
 * @var
 * @type {Object}
 */
let dispatch_dict = {};

/**
 * Top bar navigation & link schema definition.
 *
 * @private
 * @constant
 * @type {Object}
 */
const portal = {
    "portal_title": '4DN Data Portal',
    "global_sections": [ // DEPRECATED ?
        {
            'id': 'browse-menu-item', 'sid':'sBrowse', 'title': 'Browse',
            'url' : function(hrefParts){
                return navigate.getBrowseBaseHref();
            },
            'active' : function(currentWindowPath){ return currentWindowPath && currentWindowPath.indexOf('/browse/') > -1; }
        },
        {
            'id': 'help-menu-item', 'sid':'sHelp', 'title': 'Help',
            'children': [
                { id: 'introduction-menu-item',     title: 'Introduction to 4DN Metadata',      url: '/help' },
                { id: 'getting-started-menu-item',  title: 'Data Submission - Getting Started', url: '/help/getting-started' },
                { id: 'cell-culture-menu-item',     title: 'Biosample Metadata',                url: '/help/biosample' },
                { id: 'web-submission-menu-item',   title: 'Online Submission',                 url: '/help/web-submission' },
                { id: 'spreadsheet-menu-item',      title: 'Spreadsheet Submission',            url: '/help/spreadsheet' },
                { id: 'rest-api-menu-item',         title: 'REST API',                          url: '/help/rest-api' },
                { id: 'about-menu-item',            title: 'About',                             url: '/about' }
            ]
        }
    ],
    "user_section": [
        {id: 'login-menu-item', title: 'Log in', url: '/'},
        {id: 'accountactions-menu-item', title: 'Register', url: '/help/user-guide/account-creation'}
        // Remove context actions for now{id: 'contextactions-menu-item', title: 'Actions', url: '/'}
    ]
};


// See https://github.com/facebook/react/issues/2323
class Title extends React.Component {

    componentDidMount() {
        var node = document.querySelector('title');
        if (node && this._rootNodeID && !node.getAttribute('data-reactid')) {
            node.setAttribute('data-reactid', this._rootNodeID);
        }
    }

    render() {
        return <title {...this.props}>{this.props.children}</title>;
    }

}


/**
 * Creates a promise which completes after a delay, performing no network request.
 * Used to perform a promise.race to see if this timeout or a network requests completes first, which
 * then allows us to set app.state.slow and render a loading icon until long-running network request completes.
 *
 * @private
 */
class Timeout {
    /**
     * @param {number} timeout - The length of time before this promise resolves.
     */
    constructor(timeout) {
        /**
         * Internal promise object which resolves after length of time as specified by `timeout`.
         *
         * @private
         */
        this.promise = new Promise(resolve => setTimeout(resolve.bind(undefined, this), timeout));
    }
}



/**
 * The root and top-most React component for our application.
 * This is wrapped by a Redux store and then rendered by either the server-side
 * NodeJS sub-process or by the browser.
 *
 * @see https://github.com/4dn-dcic/fourfront/blob/master/src/encoded/static/server.js
 * @see https://github.com/4dn-dcic/fourfront/blob/master/src/encoded/static/browser.js
 */
export default class App extends React.Component {

    /**
     * Defines time before a 'slow loading' indicator appears on page.
     *
     * @constant
     * @type {number}
     */
    static SLOW_REQUEST_TIME = 750

    /**
     * Immediately scrolls browser viewport to current window hash or to top of page.
     *
     * @returns {void} Nothing
     */
    static scrollTo() {
        var hash = window.location.hash;
        if (hash && document.getElementById(hash.slice(1))) {
            window.location.replace(hash);
        } else {
            window.scrollTo(0, 0);
        }
    }

    /**
     * Used in browser.js to collect prop values from server-side-rendered HTML
     * and then re-feed them into Redux store.
     *
     * @param {HTMLElement} document - HTML DOM element representing the document.
     * @param {string} [filter=null] - If set, filters down prop fields/values collected to only one(s) defined.
     * @returns {Object} Object keyed by field name with collected value as value.
     */
    static getRenderedPropValues(document, filter = null){
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
    }

    /**
     * Runs `App.getRenderedPropValues` and extends with `{ href }` from canonical link element.
     *
     * @param {HTMLElement} document - HTML DOM element representing the document.
     * @param {string} [filters=null] - If set, filters down prop fields/values collected to only one(s) defined.
     * @returns {Object} Object keyed by field name with collected value as value.
     */
    static getRenderedProps(document, filters = null) {
        return _.extend(App.getRenderedPropValues(document, filters), {
            'href' : document.querySelector('link[rel="canonical"]').getAttribute('href') // Ensure the initial render is exactly the same
        });
    }

    /**
     * @type {Object} propTypes
     * @property {*} [propTypes.sessionMayBeSet] - PropTypes definition.
     * @public
     * @constant
     * @member
     */
    static propTypes = {
        "sessionMayBeSet" : PropTypes.any,    // Whether Auth0 session exists or not.
    };

    /**
     * @type {Object} defaultProps
     * @property {boolean} [defaultProps.sessionMayBeSet=null] Whether user is currently likely to be logged in as determined by browser.js
     * @public
     * @constant
     * @member
     */
    static defaultProps = {
        'sessionMayBeSet' : null
    };

    /**
     * Does some initialization, checks if browser HistoryAPI is supported,
     * sets state.session according to JWT in current cookie, etc.
     *
     * @constructor
     * @member
     */
    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUpdate = this.componentWillUpdate.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.listActionsFor = this.listActionsFor.bind(this);
        this.currentAction = this.currentAction.bind(this);
        this.loadSchemas = this.loadSchemas.bind(this);

        // Global event handlers. These will catch events unless they are caught and prevented from bubbling up earlier.
        this.handleClick = this.handleClick.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handlePopState = this.handlePopState.bind(this);

        this.setIsSubmitting = this.setIsSubmitting.bind(this);
        this.stayOnSubmissionsPage = this.stayOnSubmissionsPage.bind(this);
        this.authenticateUser = this.authenticateUser.bind(this);
        this.updateUserInfo = this.updateUserInfo.bind(this);
        this.confirmNavigation = this.confirmNavigation.bind(this);
        this.navigate = this.navigate.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        this.render = this.render.bind(this);

        console.log('App Filters on Initial Page Load', Filters.currentExpSetFilters((props.context && props.context.filters) || null));

        /**
         * Whether HistoryAPI is supported in current browser.
         * Assigned / determined in constructor.
         *
         * @type {boolean}
         */
        this.historyEnabled = !!(typeof window != 'undefined' && window.history && window.history.pushState);

        // Todo: Migrate session & user_actions to redux store?
        var session = false,
            user_actions = [];

        if (props.sessionMayBeSet !== null){ // Only provided from server
            if (props.sessionMayBeSet === false) session = false;
            if (props.sessionMayBeSet === true) session = true;
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
        navigate.registerCallbackFunction(Alerts.updateCurrentAlertsTitleMap.bind(this, null));

        if (this.props.context.schemas) Schemas.set(this.props.context.schemas);

        /**
         * Initial state of application.
         *
         * @type {Object}
         * @property {boolean}  state.session       Whether user is currently logged in or not. User details are retrieved using JWT utility.
         * @property {Object[]} state.user_actions  List of actions that are permitted for current user.
         * @property {Object[]} state.schemas       Current schemas; null until AJAX-ed in (may change).
         * @property {boolean}  state.isSubmitting  Whether there's a submission in progress. If true, alert is shown to prevent user from accidentally navigating away.
         * @property {boolean}  state.mounted       Whether app has been mounted into DOM in browser yet.
         */
        this.state = {
            'session'           : session,
            'user_actions'      : user_actions,
            'schemas'           : this.props.context.schemas || null,
            'isSubmitting'      : false,
            'mounted'           : false,
            'scrollState'       : null
        };

        console.log("App Initial State: ", this.state);
    }

    /**
     * Perform various actions once component is mounted which depend on browser environment:
     *
     * - Add URI hash from window.location.hash/href to Redux store (doesn't get sent server-side).
     * - Bind 'handlePopState' function to window popstate event (e.g. back/forward button navigation).
     * - Initializes Google Analytics
     * - Exposes 'API' from browser window object via property {Object} 'fourfront' which has reference to Alerts, JWT, navigate, and this app component.
     * - Emits an event from browser window named 'fourfrontinitialized', letting any listeners (parent windows, etc.) know that JS of this window has initialized. Posts message with same 'eventType' as well.
     * - Shows browser suggestion alert if not using Chrome, Safari, Firefox.
     * - Sets state.mounted to be true.
     * - Clears out any UTM URI parameters three seconds after mounting (giving Google Analytics time to pick them up).
     *
     * @private
     */
    componentDidMount() {
        var { href, context } = this.props;

        // Load up analytics
        analytics.initializeGoogleAnalytics( analytics.getTrackingId(href), context );

        // Authenticate user if not yet handled server-side w/ cookie and rendering props.
        this.authenticateUser();
        // Load schemas into app.state, access them where needed via props (preferred, safer) or this.context.
        this.loadSchemas();

        // The href prop we have was from serverside. It would not have a hash in it, and might be shortened.
        // Here we grab full-length href from window and update props.href (via Redux), if it is different.
        var queryHref = href;
        // Technically these two statements should be exact same. Props.href is put into <link...> (see render() ). w.e.
        if (document.querySelector('link[rel="canonical"]')){
            queryHref = document.querySelector('link[rel="canonical"]').getAttribute('href');
        }
        // Grab window.location.href w/ query_href as fallback.
        queryHref = globals.windowHref(queryHref);
        if (href !== queryHref){
            store.dispatch({
                type: {'href':queryHref}
            });
        }

        if (this.historyEnabled) {
            try {
                window.history.replaceState(context, '', window.location.href);
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
        window.onbeforeunload = this.handleBeforeUnload;

        // Save some stuff to global window variables so we can access it in tests:
        // Normally would call this 'window.app' but ENCODE already sets this in browser.js to be the top-level Redux provider (not really useful, remove?)
        window.fourfront = _.extend(window.fourfront || {}, {
            'app'       : this,
            'alerts'    : Alerts,
            'JWT'       : JWT,
            'navigate'  : navigate
        });

        // Detect browser and save it to state. Show alert to inform people we're too ~lazy~ under-resourced to support MS Edge to the max.
        var browserInfo = detectBrowser(),
            mounted     = true;

        console.log('BROWSER', browserInfo);

        if (browserInfo && typeof browserInfo.name === 'string' && ['chrome', 'firefox', 'safari'].indexOf(browserInfo.name) === -1){
            Alerts.queue({
                'title' : 'Browser Suggestion',
                'message' : (
                    <div>
                        <p className="mb-0">
                            <a href="https://www.google.com/chrome/" target="_blank" className="text-500">Google Chrome</a> or <a href="https://www.mozilla.org/en-US/firefox/" target="_blank" className="text-500">Mozilla Firefox</a> are
                            the recommended browser(s) for using the 4DN Data Portal.
                        </p>
                        <p className="mb-0">
                            Microsoft Edge, Safari, etc. should work for a majority of portal functions but are not explicitly supported and may present some glitches, e.g. during submission.
                        </p>
                    </div>
                ),
                'style' : 'warning'
            });
        }

        // Post-mount stuff
        this.setState({ mounted, browserInfo }, () => {

            console.log('App is mounted, dispatching fourfrontinitialized event.');
            // DEPRECATED:
            // Emit event from our window object to notify that fourfront JS has initialized.
            // This is to be used by, e.g. submissions view which might control a child window.
            window.dispatchEvent(new Event('fourfrontinitialized'));
            // CURRENT: If we have parent window, post a message to it as well.
            if (window.opener) window.opener.postMessage({ 'eventType' : 'fourfrontinitialized' }, '*');

            // If we have UTM URL parameters in the URI, attempt to set history state (& browser) URL to exclude them after a few seconds
            // after Google Analytics may have stored proper 'source', 'medium', etc. (async)
            var urlParts = url.parse(queryHref, true),
                paramsToClear = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
            if (urlParts.query && _.any(paramsToClear, function(prm){ return typeof urlParts.query[prm] !== 'undefined'; })){
                setTimeout(()=>{
                    var queryToSet = _.clone(urlParts.query);
                    _.forEach(paramsToClear, function(prm){ typeof queryToSet[prm] !== 'undefined' && delete queryToSet[prm]; });
                    var nextUrl = (
                        urlParts.protocol + '//' + urlParts.host +
                        urlParts.pathname + (_.keys(queryToSet).length > 0 ? '?' + queryString.stringify(queryToSet) : '')
                    );
                    if (nextUrl !== queryHref && this.historyEnabled){
                        try {
                            window.history.replaceState(context, '', nextUrl);
                        } catch (exc) {
                            // Might fail due to too large data
                            window.history.replaceState(null, '', nextUrl);
                        }
                        console.info('Replaced UTM params in URI:', queryHref, nextUrl);
                    }
                }, 3000);
            }
        });
    }

    /** @ignore */
    componentWillUpdate(nextProps, nextState){
        if (nextState.schemas !== this.state.schemas){
            Schemas.set(nextState.schemas);
        }
    }

    /** @ignore */
    componentDidUpdate(prevProps, prevState) {
        var key;

        if (this.props.href !== prevProps.href){ // We navigated somewhere else.

            // Register google analytics pageview event.
            analytics.registerPageView(this.props.href, this.props.context);

            // We need to rebuild tooltips after navigation to a different page.
            ReactTooltip.rebuild();

        }


        for (key in this.props) {
            if (this.props[key] !== prevProps[key]) {
                console.log('changed props: %s', key);
            }
        }
        for (key in this.state) {
            if (this.state[key] !== prevState[key]) {
                console.log('changed state: %s', key);
            }
        }

        if (prevState.session !== this.state.session && ChartDataController.isInitialized()){
            setTimeout(function(){
                console.log("SYNCING CHART DATA");
                ChartDataController.sync();
            }, 0);
        }

    }

    /**
     * Calculates some actions available, given a category.
     * Potentially deprecated-ish.
     *
     * @todo Potentially remove. Or document more.
     * @public
     * @param {string} category - Usually one of "user", "context", "user_section", "global_sections".
     * @returns {{ href: string }[]} - List of actions available for category.
     */
    listActionsFor(category) {
        if (category === 'context') {
            var context = this.props.context;
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
            if (!this.state.mounted) return [];
            return this.state.user_actions;
        }
        if (category === 'global_sections') {
            return portal.global_sections;
        }
    }

    /**
     * Calculates current action, if any, from URL hash.
     *
     * @public
     * @returns {!string} Current action if any, or null.
     */
    currentAction() {
        var href_url = url.parse(this.props.href);
        var hash = href_url.hash || '';
        var name;
        if (hash.slice(0, 2) === '#!') {
            name = hash.slice(2);
        }
        return name || null;
    }

    /**
     * If no schemas yet stored in our state, we AJAX them in from `/profiles/?format=json`.
     *
     * @public
     * @param {function} [callback=null] - If defined, will be executed upon completion of load, with schemas passed in as first argument.
     * @param {boolean} [forceFetch=false] - If true, will ignore any previously-fetched schemas and fetch new ones.
     * @returns {void}
     */
    loadSchemas(callback = null, forceFetch = false){
        if (this.state.schemas !== null && !forceFetch){
            // We've already loaded these successfully (hopefully)
            if (typeof callback === 'function') callback(this.state.schemas);
            console.info('Schemas available already.');
            return this.state.schemas;
        }
        ajax.promise('/profiles/?format=json').then(data => {
            if (object.isValidJSON(data)){
                this.setState({
                    schemas: data
                }, () => {
                    // Rebuild tooltips because they likely use descriptions from schemas
                    ReactTooltip.rebuild();
                    if (typeof callback === 'function') callback(data);
                    console.info('Loaded schemas');
                });
            }
        });
    }

    /**
     * Intercepts a click on a hyperlink HTML element
     * and navigates to its target href if is an internal link.
     * Skips for download links, external links, etc.
     *
     * @private
     * @param {React.SyntheticEvent} event React SyntheticEvent for click MouseEvent.
     */
    handleClick(event) {
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

            var navOpts      = {},
                hrefParts    = url.parse(href),
                pHrefParts   = url.parse(this.props.href),
                hrefHash     = hrefParts.hash,
                targetOffset = target.getAttribute('data-target-offset'),
                noCache      = target.getAttribute('data-no-cache');

            // Don't cache requests to user profile.
            if (noCache) navOpts.cache = false;

            if ((!hrefParts.path || hrefParts.path === pHrefParts.path) && hrefParts.hash !== pHrefParts.hash){
                navOpts.skipRequest = navOpts.dontScrollToTop = true;
            }

            navigate(href, navOpts, function(){

                if (targetOffset) targetOffset = parseInt(targetOffset);
                if (!targetOffset || isNaN(targetOffset)) targetOffset = 112;

                if (hrefHash && typeof hrefHash === 'string' && hrefHash.length > 1 && hrefHash[1] !== '!'){
                    hrefHash = hrefHash.slice(1); // Strip out '#'
                    setTimeout(layout.animateScrollTo.bind(null, hrefHash, 750, targetOffset), 100);
                }
            });

            if (this.refs && this.refs.navigation){
                this.refs.navigation.closeMobileMenu();
            }

            if (target && target.blur) target.blur();
        }
    }

    /**
     * Intercepts a form submission on a form HTML element
     * and performs it via AJAX. Similar to handling of hyperlinks.
     *
     * @private
     * @param {React.SyntheticEvent} event Form submission event.
     */
    handleSubmit(event) {
        var target      = event.target, // A form DOM element reference
            hrefParts   = url.parse(this.props.href);

        // Skip POST forms
        if (target.method !== 'get') return;

        // Skip forms with a data-bypass attribute.
        if (target.getAttribute('data-bypass')) return;

        // Skip external forms
        if (!origin.same(target.action)) return;

        var actionUrlParts  = url.parse(url.resolve(this.props.href, target.action)),
            search          = serialize(target),
            href            = actionUrlParts.pathname,
            currentAction   = this.currentAction(),
            navOptions      = {
                'replace'       : actionUrlParts.pathname == hrefParts.pathname,
                'skipRequest'   : target.getAttribute('data-skiprequest')
            };

        if (target.getAttribute('data-removeempty')) {
            search = _.map(
                _.filter(search.split('&'), function (item) {
                    return item.slice(-1) != '=';
                }),
                function(item){
                    var split = item.split('=');
                    return split[0] + '=' + encodeURIComponent(split[1]).replace(/(')/g, "%27");
                }
            ).join('&');
        }

        // Append form name:vals as stringified URI params (`search`).
        if (search) href += '?' + search;

        // If we're submitting search form in selection mode, preserve selection mode at next URL.
        if (currentAction === 'selection') href += '#!' + currentAction;

        if (this.historyEnabled) {
            event.preventDefault();
            navigate(href, navOptions);
        } // Else is submitted as normal browser HTTP GET request if event.preventDefault() not called.
    }

    /**
     * Handles a history change event.
     *
     * @private
     * @param {React.SyntheticEvent} event - A popstate event.
     */
    handlePopState(event) {
        if (this.DISABLE_POPSTATE) return;
        var href = window.location.href; // Href which browser just navigated to, but maybe not yet set to this.props.href

        if (!this.confirmPopState(href)){
            try {
                // Undo what we just did (hit the back button) by re-adding it to history and returning (not performing actual naivgate backward)
                window.history.pushState(event.state, '', this.props.href);
            } catch (e){ // Too large
                console.warn('error pushing state (current, popped:)', this.props.context, event.state);
                window.history.pushState(null, '', this.props.href);
            }
            return;
        }
        /*
        if (!this.confirmNavigation(href)) { // Is this necessary still? It shouldn't ever return false at this stage, only in like doRequest().
            var d = {
                'href': href
            };
            if (event.state){
                d.context = event.state;
            }
            store.dispatch({
                type: d
            });
            return;
        }
        */
        if (!this.historyEnabled) {
            window.location.reload();
            return;
        }
        var request = this.props.contextRequest;
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
        navigate(href, {'replace': true});
    }

    /**
     * Grabs JWT from local cookie and, if not already authenticated or are missing 'user_actions',
     * perform authentication via AJAX to grab user actions, updated JWT token, and save to localStorage.
     *
     * @private
     * @param {function} [callback=null] Optional callback to be ran upon completing authentication.
     * @returns {void}
     */
    authenticateUser(callback = null){
        // check existing user_info in local storage and authenticate
        var idToken = JWT.get();
        if (idToken && (!this.state.session || !this.state.user_actions)){ // if JWT present, and session not yet set (from back-end), try to authenticate
            console.info('AUTHENTICATING USER; JWT PRESENT BUT NO STATE.SESSION OR USER_ACTIONS'); // This is very unlikely due to us rendering re: session server-side.
            ajax.promise('/login', 'POST', {
                'Authorization' : 'Bearer ' + idToken
            }, JSON.stringify({id_token: idToken}))
            .then(response => {
                if (response.code || response.status || response.id_token !== idToken) throw response;
                return response;
            })
            .then(response => {
                JWT.saveUserInfo(response);
                this.updateUserInfo(callback);
                analytics.event('Authentication', 'ExistingSessionLogin', {
                    'eventLabel' : 'Authenticated ClientSide'
                });
            }, error => {
                // error, clear JWT token from cookie & user_info from localStorage (via JWT.remove())
                // and unset state.session & state.user_actions (via this.updateUserInfo())
                JWT.remove();
                this.updateUserInfo(callback);
            });
            return idToken;
        } else if (idToken && this.state.session && this.state.user_actions){
            console.info('User is logged in already, continuing session.');
            analytics.event('Authentication', 'ExistingSessionLogin', {
                'eventLabel' : 'Authenticated ServerSide'
            });
        }
        return null;
    }

    /**
     * Tests that JWT is present along with user info and user actions, and if so, updates `state.session`.
     * Called by `authenticateUser` as well as Login.
     *
     * @public
     * @param {function} [callback=null] Optional callback to be ran upon completing authentication.
     * @returns {void}
     */
    updateUserInfo(callback = null){
        // get user actions (a function of log in) from local storage
        var userActions = [],
            session     = false,
            userInfo    = JWT.getUserInfo();

        if (userInfo){
            userActions = userInfo.user_actions;
            var currentToken = JWT.get(); // We definitively use Cookies for JWT. It can be unset by response headers from back-end.
            if (currentToken) session = true;
            else if (this.state.session === true) {
                Alerts.queue(Alerts.LoggedOut);
            }
        }

        var stateChange = {};
        if (!_.isEqual(userActions, this.state.user_actions)) stateChange.user_actions = userActions;
        if (session !== this.state.session) stateChange.session = session;

        if (Object.keys(stateChange).length > 0){
            this.setState(stateChange, typeof callback === 'function' ? callback.bind(this, session, userInfo) : null);
        } else {
            if (typeof callback === 'function') callback(session, userInfo);
        }
    }

    /**
     * Updates Redux store with non-hash version of URI. For IE8/9 only.
     *
     * @deprecated
     * @private
     * @param {React.SyntheticEvent} event An event.
     * @returns {void}
     */
    onHashChange(event) {
        store.dispatch({
            type: {'href':document.querySelector('link[rel="canonical"]').getAttribute('href')}
        });
    }

    /**
     * Rules to prevent browser from changing to 'href' via back/forward buttons.
     *
     * @private
     * @param {string} href - Next href.
     * @returns {boolean} Whether to proceed with browser navigation.
     */
    confirmPopState(href){
        if (this.stayOnSubmissionsPage(href)) return false;
        return true;
    }

    /**
     * Only navigate if href changes unless is inPlace navigation, if don't need to stay on submissions
     * view, etc.
     *
     * @private
     * @param {string} href - New URI we're navigating to.
     * @param {Object} [options] - Options for navigation request.
     * @returns {boolean}
     */
    confirmNavigation(href, options) {

        // check if user is currently on submission page
        // if so, warn them about leaving
        if (this.stayOnSubmissionsPage(href)){
            return false;
        }

        if(options && options.inPlace && options.inPlace==true){
            return true;
        }

        if(href===this.props.href){
            return false;
        }
        /*
        var partsNew = url.parse(href),
            partsOld = url.parse(this.props.href);

        if (partsNew.path === partsOld.path && !globals.isHashPartOfHref(null, partsNew)){
            return false;
        }
        */
        return true;
    }

    /**
     * Check this.state.isSubmitting to prompt user if navigating away
     * from the submissions page.
     *
     * @param {string} [href=null] - Href we are navigating to (in case of navigate, confirmNavigation) or have just navigated to (in case of popState event).
     * @returns {boolean}
     */
    stayOnSubmissionsPage(href = null) {
        // can override state in options
        // override with replace, which occurs on back button navigation
        if(this.state.isSubmitting){
            if (typeof href === 'string'){
                if (href.indexOf('#!edit') > -1 || href.indexOf('#!create') > -1 || href.indexOf('#!clone') > -1){
                    // Cancel out if we are "returning" to edit or create (submissions page) href.
                    return false;
                }
            }
            var msg = 'Leaving will cause all unsubmitted work to be lost. Are you sure you want to proceed?';
            if(confirm(msg)){
                // we are no longer submitting
                this.setIsSubmitting(false);
                return false;
            }else{
                // stay
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * Should not be called directly - aliased to global function `util.navigate` during App constructor.
     * Function which is used/called to navigate us around the portal in single-page-application (AJAX)
     * fashion.
     *
     * @alias navigate
     * @private
     * @param {string} href                 URI we're attempting to navigate to.
     * @param {NavigateOpts} [options={}]   Options for the navigation request.
     * @param {function} [callback=null]    Optional callback, accepting response JSON as first argument.
     * @param {function} [fallbackCallback=null] - Optional callback to be called in case request fails.
     * @param {Object} [includeReduxDispatch={}] - Optional extra data to save to Redux store along with the next response.
     * @returns {void}
     */
    navigate(href, options = {}, callback = null, fallbackCallback = null, includeReduxDispatch = {}) {
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
                return false; // Unlike 'null', skips callback b.c. leaving page anyway.
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
                    try {
                        window.history.replaceState(this.props.context, '', href + fragment);
                    } catch (exc) {
                        console.warn('Data too big, saving null to browser history in place of props.context.');
                        window.history.replaceState(null, '', href + fragment);
                    }
                } else {
                    try {
                        window.history.pushState(this.props.context, '', href + fragment);
                    } catch (exc) {
                        console.warn('Data too big, saving null to browser history in place of props.context.');
                        window.history.pushState(null, '', href + fragment);
                    }
                }
                var stuffToDispatch = _.clone(includeReduxDispatch);
                if (!options.skipUpdateHref) {
                    stuffToDispatch.href = href + fragment;
                }
                if (_.keys(stuffToDispatch).length > 0){
                    store.dispatch({
                        'type': stuffToDispatch
                    });
                }
                return null;
            }

            var request = ajax.fetch(href, { 'cache' : options.cache === false ? false : true });

            this.requestCurrent = true; // Remember we have an outstanding GET request
            var timeout = new Timeout(App.SLOW_REQUEST_TIME);

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

                console.info("Fetched new context", response);

                if (response.code === 403){

                    var jwtHeader = null;
                    try {
                        jwtHeader = request.xhr.getResponseHeader('X-Request-JWT');
                    } catch(e) {
                        // Some browsers may not support getResponseHeader. Fallback to 403 response detail which only
                        // replaces unauth'd response if request Content-Type = application/json
                        console.error(e);
                    }

                    if (response.detail === "Bad or expired token." || jwtHeader === 'expired'){ // Bad or expired JWT
                        JWT.remove();

                        // Wait until request(s) complete before setting notification (callback is called later in promise chain)
                        var oldCallback = callback;
                        callback = (response) => {
                            Alerts.queue(Alerts.LoggedOut);
                            if (typeof oldCallback === 'function') oldCallback(response);
                        };
                    }

                    // Update state.session after (possibly) removing expired JWT.
                    // Also, may have been logged out in different browser window so keep state.session up-to-date BEFORE a re-request
                    this.updateUserInfo();

                    if (repeatIfError) {
                        if (href.indexOf('/users/') !== -1){ // ToDo: Create&store list of private pages other than /users/<...>
                            // Redirect to home if on a 'private' page (e.g. user profile).
                            if (setupRequest.call(this, '/')) doRequest.call(this, false);
                        } else {
                            // Otherwise redo request after any other error handling (unset JWT, etc.).
                            doRequest.call(this, false);
                        }
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
                if (!object.isValidJSON(response)) {
                    if (options.replace) {
                        window.location.replace(href + fragment);
                    } else {
                        window.location.assign(href + fragment);
                    }
                    return;
                }

                var hrefToSet = (request && request.xhr && request.xhr.responseURL) || href; // Get correct URL from XHR, in case we hit a redirect during the request.
                dispatch_dict.href = hrefToSet + fragment;

                return response;
            })
            .then(response => this.receiveContextResponse(response, includeReduxDispatch, options))
            .then(response => {
                this.state.slowLoad && this.setState({'slowLoad' : false});
                if (typeof callback === 'function'){
                    callback(response);
                }
                if (response.code === 404){
                    // This may not be caught as a server or network error.
                    // If is explicit 404 (vs just 0 search results), pyramid will send it as 'code' property.
                    analytics.exception('Page Not Found - ' + href);
                }
            });

            if (!options.replace && !options.dontScrollToTop) {
                promise = promise.then(App.scrollTo);
            }

            promise.catch((err)=>{
                // Unset these for future requests.
                this.requestAborted = false;
                this.requestCurrent = false;
                this.state.slowLoad && this.setState({'slowLoad' : false});
                if (typeof fallbackCallback == 'function'){
                    fallbackCallback(err);
                }

                console.error('Error in App.navigate():', err);

                if (err.status === 500){
                    analytics.exception('Server Error: ' + err.status + ' - ' + href);
                }

                if (err.status === 404){
                    analytics.exception('Page Not Found - ' + href);
                }

                // Err could be an XHR object if could not parse JSON.
                if (err.message === 'HTTPForbidden'){
                    // An error may be thrown in Promise response chain with this message ("HTTPForbidden") if received a 403 status code in response
                    if (typeof callback === 'function'){
                        callback(err);
                    }
                    return request; // We return out so this request href isn't set.
                } else if (typeof err.status === 'number' && [502, 503, 504, 505, 598, 599, 444, 499, 522, 524].indexOf(err.status) > -1) {
                    // Bad connection
                    Alerts.queue(Alerts.ConnectionError);
                    analytics.exception('Network Error: ' + err.status + ' - ' + href);
                } else {
                    Alerts.queue(Alerts.ConnectionError);
                    analytics.exception('Unknown Network Error: ' + err.status + ' - ' + href);
                    throw err; // Unknown/unanticipated error: Bubble it up.
                }

                // Possibly not needed: If no major JS error thrown, add entry in Browser History so that back/forward buttons still works after hitting a 404 or similar.
                // title currently ignored by browsers
                if (options.replace){
                    try {
                        window.history.replaceState(err, '', href + fragment);
                    } catch (exc) {
                        console.warn('Data too big, saving null to browser history in place of props.context.');
                        window.history.replaceState(null, '', href + fragment);
                    }
                } else {
                    try {
                        window.history.pushState(err, '', href + fragment);
                    } catch (exc) {
                        console.warn('Data too big, saving null to browser history in place of props.context.');
                        window.history.pushState(null, '', href + fragment);
                    }
                }

            });
            console.info('Navigating > ', request);
            dispatch_dict.contextRequest = request;
            return request;
        }

        if (setupRequest.call(this, href)){
            var request = doRequest.call(this, true);
            if (request === null){
                if (typeof callback === 'function') setTimeout(callback, 100);
            }
            return request;
        } else {
            return null; // Was handled by setupRequest (returns false)
        }

    }

    /**
     * This function is called by `App.navigate` upon completing request.
     * Redux store is updated with new JSON response here.
     *
     * @private
     * @param {JSONContentResponse} data - Next JSON response.
     * @param {Object} extendDispatchDict - Additional keys/values to save to Redux along with next response.
     * @param {Object} requestOptions - Navigation options that were passed to `App.navigate`.
     * @returns {JSONContentResponse} Data which was received and saved.
     */
    receiveContextResponse (data, extendDispatchDict = {}, requestOptions = {}) {
        // title currently ignored by browsers
        if (requestOptions.replace){
            try {
                window.history.replaceState(data, '', dispatch_dict.href);
            } catch (exc) {
                console.warn('Data too big, saving null to browser history in place of props.context.');
                window.history.replaceState(null, '', dispatch_dict.href);
            }
        } else {
            try {
                window.history.pushState(data, '', dispatch_dict.href);
            } catch (exc) {
                console.warn('Data too big, saving null to browser history in place of props.context.');
                window.history.pushState(null, '', dispatch_dict.href);
            }
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
    }

    /**
     * Set 'isSubmitting' in state. works with handleBeforeUnload
     *
     * @public
     * @param {boolean} bool - Value to set.
     * @param {function} [callback=null] - Optional callback to execute after updating state.
     */
    setIsSubmitting(bool, callback=null){
        this.setState({'isSubmitting': bool}, callback);
    }

    /**
     * Catch and alert user navigating away from page if in submission process.
     *
     * @private
     * @param {React.SyntheticEvent} e Window beforeunload event.
     * @returns {string|void} Dialog text which is to be shown to user.
     */
    handleBeforeUnload(e){
        if(this.state.isSubmitting){
            var dialogText = 'Leaving will cause all unsubmitted work to be lost. Are you sure you want to proceed?';
            e.returnValue = dialogText;
            return dialogText;
        }
    }

    /**
     * Renders the entire HTML of the application.
     *
     * @private
     * @returns {JSX.Element} An `<html>` element.
     */
    render() {
        var { context, lastCSSBuildTime } = this.props,
            canonical       = this.props.href,
            href_url        = url.parse(canonical),
            routeList       = href_url.pathname.split("/"),
            routeLeaf       = routeList[routeList.length - 1],
            key             = context && context['@id'] && context['@id'].split('?')[0], // Switching between collections may leave component in place
            currentAction   = this.currentAction();

        var content, title, status; // Rendered values

        if (!currentAction && context.default_page) {
            context = context.default_page;
        }

        // `canonical` is meant to refer to the definitive URI for current resource.
        // For example, https://data.4dnucleome.org/some-item, http://data.4dnucleome.org/some-item, http://www.data.4dnucleome.org/some-item
        // refer to same item, and `canonical` URL is the one that should be used when referring to or citing "/some-item".
        // In our case, it is "https://data.4dnucleome.org/"; this canonical code may be deprecated as we always redirect to https and
        // [wwww.]4dnuclome.org is a separate domain/site.

        if (context.canonical_uri) {
            if (href_url.host) {
                canonical = (href_url.protocol || '') + '//' + href_url.host + context.canonical_uri;
            } else {
                canonical = context.canonical_uri;
            }
        }

        // check error status

        var isPlannedSubmissionsPage = href_url.pathname.indexOf('/planned-submissions') > -1; // TEMP EXTRA CHECK WHILE STATIC_PAGES RETURN 404 (vs 403)
        if (context.code && (context.code === 403 || (isPlannedSubmissionsPage && context.code === 404))){
            if (isPlannedSubmissionsPage){
                status = 'forbidden';
            } else if (context.title && (context.title.toLowerCase() === 'login failure' || context.title === 'No Access')){
                status = 'invalid_login';
            } else if (context.title && context.title === 'Forbidden'){
                status = 'forbidden';
            }
        } else if (context.code && context.code === 404){
            // check to ensure we're not looking at a static page
            if (routeLeaf != 'help' && routeLeaf != 'about' && routeLeaf !== 'home' && routeLeaf !== 'submissions'){
                status = 'not_found';
            }
        } else if (routeLeaf == 'submissions' && !_.contains(_.pluck(this.state.user_actions, 'id'), 'submissions')){
            status = 'forbidden'; // attempting to view submissions but it's not in users actions
        }

        // Object of common props passed to all content_views.
        var commonContentViewProps = {
            'context'           : context,
            'schemas'           : this.state.schemas,
            'session'           : this.state.session,
            'href'              : this.props.href,
            'navigate'          : this.navigate,
            'key'               : key,
            'uploads'           : this.state.uploads,
            'updateUploads'     : this.updateUploads,
            'listActionsFor'    : this.listActionsFor,
            'updateUserInfo'    : this.updateUserInfo,
            'browseBaseState'   : this.props.browseBaseState,
            'currentAction'     : currentAction,
            'setIsSubmitting'   : this.setIsSubmitting
        };

        if (canonical === "about:blank"){   // first case is fallback
            title = portal.portal_title;
            content = null;
        } else if (status) {                // error catching
            content = <ErrorPage currRoute={routeLeaf} status={status}/>;
            title = 'Error';
        } else if (context) {               // What should occur (success)

            var ContentView = globals.content_views.lookup(context, currentAction);

            // Set browser window title.
            title = object.itemUtil.getTitleStringFromContext(context);
            if (title && title != 'Home') {
                title = title + ' – ' + portal.portal_title;
            } else {
                title = portal.portal_title;
            }

            if (!ContentView){ // Handle the case where context is not loaded correctly
                content = <ErrorPage status={null}/>;
                title = 'Error';
            } else if (currentAction && _.contains(['edit', 'add', 'create'], currentAction)) { // Handle content edit + create action permissions

                var contextActionNames = _.filter(_.pluck(this.listActionsFor('context'), 'name'));
                // see if desired actions is not allowed for current user
                if (!_.contains(contextActionNames, currentAction)){
                    content = <ErrorPage status="forbidden" />;
                    title = 'Action not permitted';
                }
            }

            if (!content) { // No overriding cases encountered. Proceed to render appropriate view for our context.
                content = <ContentView {...commonContentViewProps} />;
            }
        } else {
            throw new Error('No context is available. Some error somewhere.');
        }
        // Google does not update the content of 301 redirected pages
        // We technically should never hit this condition as we redirect http to https, however leaving in
        // as not 100% certain.
        var base;
        if (({'http://data.4dnucleome.org/': 1})[canonical]) {
            base = canonical = 'https://data.4dnucleome.org/';
            this.historyEnabled = false;
        }

        var isLoading = this.props.contextRequest && this.props.contextRequest.xhr && this.props.contextRequest.xhr.readyState < 4,
            baseDomain = (href_url.protocol || '') + '//' + href_url.host,
            bodyElementProps = _.extend({}, this.state, this.props, {
                baseDomain, isLoading, currentAction,
                'updateUserInfo' : this.updateUserInfo,
                'listActionsFor' : this.listActionsFor,
                'onBodyClick'    : this.handleClick,
                'onBodySubmit'   : this.handleSubmit,
                'hrefParts'      : href_url,
                'children'       : content
            });

        // `lastCSSBuildTime` is used for both CSS and JS because is most likely they change at the same time on production from recompiling

        return (
            <html lang="en">
                <head>
                    <meta charSet="utf-8"/>
                    <meta httpEquiv="Content-Type" content="text/html, charset=UTF-8"/>
                    <meta httpEquiv="X-UA-Compatible" content="IE=edge"/>
                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
                    <meta name="google-site-verification" content="sia9P1_R16tk3XW93WBFeJZvlTt3h0qL00aAJd3QknU" />
                    <Title>{title}</Title>
                    {base ? <base href={base}/> : null}
                    <link rel="canonical" href={canonical} />
                    <script data-prop-name="user_details" type="application/json" dangerouslySetInnerHTML={{
                        __html: jsonScriptEscape(JSON.stringify(JWT.getUserDetails())) /* Kept up-to-date in browser.js */
                    }}/>
                    <script data-prop-name="lastCSSBuildTime" type="application/json" dangerouslySetInnerHTML={{ __html: lastCSSBuildTime }}/>
                    <link rel="stylesheet" href={'/static/css/style.css?build=' + (lastCSSBuildTime || 0)} />
                    <link href="/static/font/ss-gizmo.css" rel="stylesheet" />
                    <link href="/static/font/ss-black-tie-regular.css" rel="stylesheet" />
                    <SEO.CurrentContext context={context} hrefParts={href_url} baseDomain={baseDomain} />
                    <link href="https://fonts.googleapis.com/css?family=Mada:200,300,400,500,600,700,900|Yrsa|Source+Code+Pro:300,400,500,600" rel="stylesheet"/>
                    <script async type="application/javascript" src={"/static/build/bundle.js?build=" + (lastCSSBuildTime || 0)} charSet="utf-8" />
                    <script async type="application/javascript" src="//www.google-analytics.com/analytics.js" />
                    {/* <script data-prop-name="inline" type="application/javascript" charSet="utf-8" dangerouslySetInnerHTML={{__html: this.props.inline}}/> <-- SAVED FOR REFERENCE */}
                </head>
                <BodyElement {...bodyElementProps} />
            </html>
        );
    }

}

/**
 * This component provides some extra layout properties to certain components.
 * Namely, it handles, stores, and passes down state related to scrolling up/down the page.
 * This prevents needing to have numerous window scroll event listeners living throughout the app.
 *
 * @public
 * @class
 * @listens {Event} Window scroll events.
 * @listens {Event} Window resize events.
 * @todo Perhaps grab and pass down windowInnerWidth, windowInnerHeight, and/or similar props as well.
 */
class BodyElement extends React.PureComponent {

    /**
     * Instantiates the BodyElement component, binds functions.
     */
    constructor(props){
        super(props);
        this.onResize = _.debounce(this.onResize.bind(this), 300);
        this.onTooltipAfterHide = this.onTooltipAfterHide.bind(this);
        this.setupScrollHandler = this.setupScrollHandler.bind(this);

        this.registerWindowOnResizeHandler = this.registerWindowOnResizeHandler.bind(this);
        this.registerWindowOnScrollHandler = this.registerWindowOnScrollHandler.bind(this);
        this.addToBodyClassList         = this.addToBodyClassList.bind(this);
        this.removeFromBodyClassList    = this.removeFromBodyClassList.bind(this);
        this.toggleFullScreen           = this.toggleFullScreen.bind(this);

        /**
         * State object for BodyElement.
         *
         * @type {Object}
         * @property {boolean} state.scrolledPastTop        Whether window has been scrolled past 0.
         * @property {boolean} state.scrolledPastEighty     Whether window has been scrolled past 80px.
         * @property {number} state.windowWidth             Window inner width.
         * @property {number} state.windowHeight            Window inner height.
         * @property {string[]} state.classList             List of additional classNames that are added to the body element.
         */
        this.state = {
            'scrolledPastTop'       : null,
            'scrolledPastEighty'    : null,
            //'scrollTop'             : null // Not used, too many state updates if were to be.
            'windowWidth'           : null,
            'windowHeight'          : null,
            'classList'             : [],
            'hasError'              : false,
            'errorInfo'             : null,
            'isFullscreen'          : false
        };

        /**
         * Holds event handlers for window scroll event.
         * @private
         */
        this.scrollHandlers = [];
        /**
         * Holds event handlers for window resize event.
         * @private
         */
        this.resizeHandlers = [];
    }

    /**
     * Initializes scroll event handler & loading of help menu tree.
     *
     * @private
     * @returns {void}
     */
    componentDidMount(){
        if (window && window.fourfront) window.fourfront.bodyElem = this;
        this.setupScrollHandler();
        window.addEventListener('resize', this.onResize);
        this.onResize();
    }

    componentDidUpdate(pastProps){
        if (pastProps.href !== this.props.href){

            // Remove tooltip if still lingering from previous page
            var _tooltip    = this.refs && this.refs.tooltipComponent,
                domElem     = ReactDOM.findDOMNode(_tooltip);

            if (!domElem) return;

            var className = domElem.className || '',
                classList = className.split(' '),
                isShowing = classList.indexOf('show') > -1;

            if (isShowing){
                domElem.className = _.without(classList, 'show').join(' ');
            }

        }
    }

    /**
     * Unbinds event listeners.
     * Probably not needed but lets be safe & cleanup.
     *
     * @private
     * @returns {void}
     */
    componentWillUnmount(){
        window.removeEventListener("scroll", this.throttledScrollHandler);
        delete this.throttledScrollHandler;
        window.removeEventListener('resize', this.onResize);
    }

    /**
     * Catches exceptions in NavBar and similar 'outer' component areas.
     *
     * @private
     * @returns {void}
     */
    componentDidCatch(err, info){
        this.setState({ 'hasError' : true, 'errorInfo' : info }, ()=>{
            analytics.exception('Client Error - ' + this.props.href + ': ' + err, true);
            // Unset app.historyEnabled so that user may navigate backward w/o JS.
            if (window && window.fourfront && window.fourfront.app){
                window.fourfront.app.historyEnabled = false;
            }
        });
    }

    /**
     * Function passed down as a prop to content views to register window on scroll handlers.
     *
     * @public
     * @param {function} scrollHandlerFxn - Callback function which accepts a 'scrollTop' (number) and 'scrollVector' (number) param.
     * @returns {function} A function to call to unregister newly registered handler.
     */
    registerWindowOnScrollHandler(scrollHandlerFxn){
        var exists = this.scrollHandlers.indexOf(scrollHandlerFxn);// _.findIndex(this.scrollHandlers, scrollHandlerFxn);
        if (exists > -1) {
            console.warn('Function already registered.', scrollHandlerFxn);
            return null;
        } else {
            this.scrollHandlers.push(scrollHandlerFxn);
            console.info("Registered scroll handler", scrollHandlerFxn);
            return () => {
                var idxToRemove = this.scrollHandlers.indexOf(scrollHandlerFxn);
                if (idxToRemove === -1){
                    console.warn('Function no longer registered.', scrollHandlerFxn);
                    return false;
                }
                this.scrollHandlers.splice(idxToRemove, 1);
                console.info('Unregistered function from scroll events', scrollHandlerFxn);
                return true;
            };
        }
    }


    /**
     * Function passed down as a prop to content views to register window on resize handlers.
     *
     * @public
     * @param {function} resizeHandlerFxn - Callback function which accepts a 'dims' ({ windowWidth: number, windowHeight: number }) and 'pastDims' param.
     * @returns {function} A function to call to unregister newly registered handler.
     */
    registerWindowOnResizeHandler(resizeHandlerFxn){
        var exists = this.resizeHandlers.indexOf(resizeHandlerFxn);
        if (exists > -1) {
            console.warn('Function already registered.', resizeHandlerFxn);
            return null;
        } else {
            this.resizeHandlers.push(resizeHandlerFxn);
            console.info("Registered resize handler", resizeHandlerFxn);
            return () => {
                var idxToRemove = this.resizeHandlers.indexOf(resizeHandlerFxn);
                if (idxToRemove === -1){
                    console.warn('Function no longer registered.', resizeHandlerFxn);
                    return false;
                }
                this.resizeHandlers.splice(idxToRemove, 1);
                console.info('Unregistered function from resize events', resizeHandlerFxn);
                return true;
            };
        }
    }

    /**
     * Adds param `className` to `state.classList`. Passed down through props for child components to be able to adjust
     * body className in response to user interactions, such as setting a full screen state.
     *
     * @public
     * @param {string}   className      ClassName to add to class list.
     * @param {function} [callback]     Optional callback to be executed after state change.
     * @returns {void}
     */
    addToBodyClassList(className, callback){
        this.setState(function(currState){
            var classList   = currState.classList,
                foundIdx    = classList.indexOf(className);
            if (foundIdx > -1){
                console.warn('ClassName already set', className);
                return null;
            } else {
                classList = classList.slice(0);
                classList.push(className);
                console.info('Adding "' + className + '" to body classList');
                return { classList };
            }
        }, callback);
    }

    /**
     * Removes param `className` from `state.classList`. Passed down through props for child components to be able to adjust
     * body className in response to user interactions, such as removing a full screen state.
     *
     * @public
     * @param {string}   className      ClassName to remove from class list.
     * @param {function} [callback]     Optional callback to be executed after state change.
     * @returns {void}
     */
    removeFromBodyClassList(className, callback){
        this.setState(function(currState){
            var classList   = currState.classList,
                foundIdx    = classList.indexOf(className);
            if (foundIdx === -1){
                console.warn('ClassName not in list', className);
                return null;
            } else {
                classList = classList.slice(0);
                classList.splice(foundIdx, 1);
                console.info('Removing "' + className + '" from body classList');
                return { classList };
            }
        }, callback);
    }


    /**
     * Updates windowWidth and windowHeight dimensions in this.state, if different.
     * @private
     * @returns {void}
     */
    onResize(e){
        var dims, pastDims;
        this.setState(function(currState, currProps){
            var nextState = {};
            dims = this.getViewportDimensions();
            pastDims = _.pick(currState, 'windowWidth', 'windowHeight');
            if (dims.windowWidth !== currState.windowWidth)     nextState.windowWidth = dims.windowWidth;
            if (dims.windowHeight !== currState.windowHeight)   nextState.windowHeight = dims.windowHeight;
            if (_.keys(nextState).length > 0){
                return nextState;
            }
            return null;
        }, ()=>{
            console.info('Window resize detected.', dims);
            if (this.resizeHandlers.length > 0){
                _.forEach(this.resizeHandlers, (resizeHandlerFxn) => resizeHandlerFxn(dims, pastDims, e) );
            }
        });
    }

    /**
     * Calculates and returns width and height of viewport.
     *
     * @private
     * @returns {{ windowWidth: number, windowHeight: number }} Object with windowWidth and windowHeight properties.
     */
    getViewportDimensions(){
        if (isServerSide()) return;

        var scrollElem      = (window.document && window.document.scrollingElement) || null,
            windowWidth     = (scrollElem && (scrollElem.clientWidth || scrollElem.offsetWidth)) || window.innerWidth,
            windowHeight    = (scrollElem && (scrollElem.clientHeight || scrollElem.offsetHeight)) || window.innerHeight;
            //documentHeight  = (widthElem && widthElem.scrollHeight); Not relevant re: resizing.

        return { windowWidth, windowHeight };
    }

    /**
     * Attaches event listeners to the `window` object and passes down 'registerOnWindowEvent' functions as props which children down the rendering tree can subscribe to.
     * Updates `state.scrolledPastTop` and `<body/>` element className depending on window current scroll top.
     *
     * @private
     * @listens {Event} Window scroll events.
     * @returns {void}
     */
    setupScrollHandler(){
        if (!(typeof window !== 'undefined' && window && document && document.body && typeof document.body.scrollTop !== 'undefined')){
            return null;
        }

        var lastScrollTop = 0,
            windowWidth = this.state.windowWidth || null,
            handleScroll = (e) => {

                // TODO: Maybe this.setState(function(currState){ ...stuf... }), but would update maybe couple of times extra...

                var stateChange = {},
                    currentScrollTop = layout.getPageVerticalScrollPosition(),
                    scrollVector = currentScrollTop - lastScrollTop;

                lastScrollTop = currentScrollTop;

                if ( // Fixed nav takes effect at medium grid breakpoint or wider.
                    ['xs','sm'].indexOf(layout.responsiveGridState(windowWidth)) === -1 && (
                        (currentScrollTop > 20 && scrollVector >= 0) ||
                        (currentScrollTop > 80)
                    )
                ){
                    if (!this.state.scrolledPastTop){
                        stateChange.scrolledPastTop = true;
                    }
                    if (currentScrollTop > 80){
                        stateChange.scrolledPastEighty = true;
                    }
                } else {
                    if (this.state.scrolledPastTop){
                        stateChange.scrolledPastTop = false;
                        stateChange.scrolledPastEighty = false;
                    }
                }

                if (this.scrollHandlers.length > 0){
                    _.forEach(this.scrollHandlers, (scrollHandlerFxn) => scrollHandlerFxn(currentScrollTop, scrollVector, e) );
                }

                if (_.keys(stateChange).length > 0){
                    this.setState(stateChange);
                }
            };

        // We add as property of class instance so we can remove event listener on unmount, for example.
        this.throttledScrollHandler = _.throttle(requestAnimationFrame.bind(window, handleScroll), 10);

        window.addEventListener("scroll", this.throttledScrollHandler);
        setTimeout(this.throttledScrollHandler, 100, null);
    }

    /**
     * Is executed after ReactTooltip is hidden e.g. via moving cursor away from an element.
     * Used to unset lingering style.left and style.top property values which may interfere with placement
     * of the next visible tooltip.
     *
     * @private
     * @returns {void}
     */
    onTooltipAfterHide(){
        var _tooltip    = this.refs && this.refs.tooltipComponent,
            domElem     = ReactDOM.findDOMNode(_tooltip);

        if (!domElem) {
            console.error("Cant find this.refs.tooltipComponent in BodyElement component.");
            return;
        }
        // Grab tip & unset style.left and style.top using same method tooltip does internally.
        domElem.style.left = domElem.style.top = null;
    }

    toggleFullScreen(isFullscreen, callback){
        if (typeof isFullscreen === 'boolean'){
            this.setState({ isFullscreen }, callback);
        } else {
            this.setState(function(currState){
                return { 'isFullscreen' : !currState.isFullscreen };
            }, callback);
        }
    }

    renderErrorState(){
        return (
            <body>
                <div id="slot-application">
                    <div id="application" className="done error">
                        <div id="layout">
                            <div id="pre-content-placeholder"/>
                            { ContentErrorBoundary.errorNotice() }
                            <div id="layout-footer"/>
                        </div>
                    </div>
                </div>
            </body>
        );
    }

    /**
     * Renders out the body layout of the application.
     *
     * @private
     */
    render(){
        var {
                onBodyClick, onBodySubmit, context, alerts,
                currentAction, hrefParts, isLoading, slowLoad,
                children
            } = this.props,
            { scrolledPastEighty, scrolledPastTop, windowWidth, windowHeight, classList, hasError, isFullscreen } = this.state,
            appClass = slowLoad ? 'communicating' : 'done',
            bodyClassList = (classList && classList.slice(0)) || [],
            registerWindowOnResizeHandler = this.registerWindowOnResizeHandler,
            registerWindowOnScrollHandler = this.registerWindowOnScrollHandler,
            addToBodyClassList            = this.addToBodyClassList,
            removeFromBodyClassList       = this.removeFromBodyClassList,
            toggleFullScreen              = this.toggleFullScreen;

        if (hasError) return this.renderErrorState();

        if (isLoading)          bodyClassList.push('loading-request');
        if (scrolledPastTop)    bodyClassList.push('scrolled-past-top');
        if (scrolledPastEighty) bodyClassList.push('scrolled-past-80');
        if (isFullscreen)       bodyClassList.push('is-full-screen');

        return (
            <body data-current-action={currentAction} onClick={onBodyClick} onSubmit={onBodySubmit} data-path={hrefParts.path}
                data-pathname={hrefParts.pathname} className={(bodyClassList.length > 0 && bodyClassList.join(' ')) || null}>

                <script data-prop-name="context" type="application/json" dangerouslySetInnerHTML={{
                    __html: jsonScriptEscape(JSON.stringify(context))
                }}/>
                <script data-prop-name="alerts" type="application/json" dangerouslySetInnerHTML={{
                    __html: jsonScriptEscape(JSON.stringify(alerts))
                }}/>

                <div id="slow-load-container" className={slowLoad ? 'visible' : null}>
                    <div className="inner">
                        <i className="icon icon-circle-o-notch"/>
                    </div>
                </div>

                <div id="slot-application">
                    <div id="application" className={appClass}>
                        <div id="layout">
                            <NavigationBar {...{ portal, windowWidth, windowHeight }} ref="navigation"
                                {..._.pick(this.props, 'href', 'currentAction', 'session', 'schemas', 'browseBaseState',
                                    'context', 'updateUserInfo', 'listActionsFor')}/>

                            <div id="pre-content-placeholder"/>

                            <PageTitle {..._.pick(this.props, 'context', 'href', 'alerts', 'session', 'schemas', 'currentAction')}
                                windowWidth={windowWidth} />

                            <div id="facet-charts-container" className="container">
                                <FacetCharts {..._.pick(this.props, 'context', 'href', 'session', 'schemas')}{...{ windowWidth, windowHeight, navigate }} />
                            </div>

                            <div className="container" id="content">
                                { React.cloneElement(children, {
                                    windowWidth, windowHeight, registerWindowOnResizeHandler, registerWindowOnScrollHandler,
                                    addToBodyClassList, removeFromBodyClassList, toggleFullScreen, isFullscreen
                                }) }
                            </div>

                            <div id="layout-footer"/>
                        </div>
                        <Footer version={context.app_version} />
                    </div>
                </div>

                <ReactTooltip effect="solid" ref="tooltipComponent" afterHide={this.onTooltipAfterHide} globalEventOff="click" key="tooltip" />

                <ChartDetailCursor {..._.pick(this.props, 'href', 'schemas')}
                    verticalAlign="center" /* cursor position relative to popover */
                    //debugStyle /* -- uncomment to keep this Component always visible so we can style it */
                />

            </body>
        );
    }

}

class ContentErrorBoundary extends React.Component {

    static errorNotice(){
        return (
            <div className="error-boundary container" id="content">
                <hr/>
                <div className="mb-2 mt-2">
                    <h3 className="text-400">A client-side error has occured, please go back or try again later.</h3>
                </div>
            </div>
        );
    }

    constructor(props){
        super(props);
        this.state = { 'hasError' : false, 'errorInfo' : null };
    }

    componentDidCatch(err, info){
        this.setState({ 'hasError' : true, 'errorInfo' : info }, ()=>{
            analytics.exception('Client Error - ' + this.props.href + ': ' + err, true);
        });
    }

    /**
     * Unsets the error state if we navigate to a different view/href .. which normally should be different ContentView.
     */
    componentWillReceiveProps(nextProps){
        if (nextProps.href !== this.props.href){
            this.setState(function(currState){
                if (currState.hasError) {
                    return {
                        'hasError' : false,
                        'errorInfo' : null
                    };
                }
                return {};
            });
        }
    }

    render(){
        if (this.state.hasError){
            return ContentErrorBoundary.errorNotice();
        }

        return <div className="container" id="content">{ this.props.children }</div>;
    }
}
