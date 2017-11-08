'use strict';
import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import url from 'url';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
var serialize = require('form-serialize');
var jwt = require('jsonwebtoken');
import jsonScriptEscape from '../libs/jsonScriptEscape';
import * as globals from './globals';
import ErrorPage from './static-pages/ErrorPage';
import Navigation from './navigation';
import SubmissionView from './submission/submission-view';
import Footer from './footer';
import * as store from '../store';
import * as origin from '../libs/origin';
import { Filters, ajax, JWT, console, isServerSide, navigate, analytics, object, Schemas, layout } from './util';
import Alerts from './alerts';
import { FacetCharts } from './facetcharts';
import { ChartDataController } from './viz/chart-data-controller';
import ChartDetailCursor from './viz/ChartDetailCursor';
import PageTitle from './PageTitle';

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
let dispatch_dict = {};

/**
 * Top bar navigation & link schema definition.
 *
 * @memberof module:app
 */
const portal = {
    portal_title: '4DN Data Portal',
    global_sections: [
        {
            id: 'browse-menu-item',
            sid:'sBrowse',
            title: 'Browse',
            //url: '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all',
            url : function(currentUrlParts){
                if (!currentUrlParts) return '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate'; // Default/fallback
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

        {id: 'help-menu-item', sid:'sHelp', title: 'Help', children: [
            {id: 'introduction-menu-item', title: 'Introduction to 4DN Metadata', url: '/help'},
            {id: 'getting-started-menu-item', title: 'Data Submission - Getting Started', url: '/help/getting-started'},
            {id: 'cell-culture-menu-item', title: 'Biosample Metadata', url: '/help/biosample'},
            {id: 'web-submission-menu-item', title: 'Online Submission', url: '/help/web-submission'},
            {id: 'spreadsheet-menu-item', title: 'Spreadsheet Submission', url: '/help/spreadsheet'},
            {id: 'rest-api-menu-item', title: 'REST API', url: '/help/rest-api'},
            {id: 'about-menu-item', title: 'About', url: '/about'}
        ]}
    ],
    user_section: [
            {id: 'login-menu-item', title: 'Log in', url: '/'},
            {id: 'accountactions-menu-item', title: 'Register', url: '/help'}
            // Remove context actions for now{id: 'contextactions-menu-item', title: 'Actions', url: '/'}
    ]
};


// See https://github.com/facebook/react/issues/2323
class Title extends React.Component {

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.render = this.render.bind(this);
    }

    componentDidMount() {
        var node = document.querySelector('title');
        if (node && !node.getAttribute('data-reactid')) {
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
 */
class Timeout {
    constructor(timeout) {
        this.promise = new Promise(resolve => setTimeout(resolve.bind(undefined, this), timeout));
    }
}

/**
 * @alias module:app
 */


export default class App extends React.Component {

    static SLOW_REQUEST_TIME = 750

    static scrollTo() {
        var hash = window.location.hash;
        if (hash && document.getElementById(hash.slice(1))) {
            window.location.replace(hash);
        } else {
            window.scrollTo(0, 0);
        }
    }

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

    static getRenderedProps(document, filters = null) {
        return _.extend(App.getRenderedPropValues(document, filters), {
            'href' : document.querySelector('link[rel="canonical"]').getAttribute('href') // Ensure the initial render is exactly the same
        });
    }

    static propTypes = {
        "sessionMayBeSet" : PropTypes.any,    // Whether Auth0 session exists or not.
    }

    static defaultProps = {
        'sessionMayBeSet' : null
    }

    static childContextTypes = {
        dropdownComponent: PropTypes.string,
        location_href: PropTypes.string,
        onDropdownChange: PropTypes.func,
        hidePublicAudits: PropTypes.bool,
        session: PropTypes.bool,
        navigate: PropTypes.func,
        schemas: PropTypes.object
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUpdate = this.componentWillUpdate.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.getChildContext = this.getChildContext.bind(this);
        this.listActionsFor = this.listActionsFor.bind(this);
        this.currentAction = this.currentAction.bind(this);
        this.loadSchemas = this.loadSchemas.bind(this);
        this.getStatsComponent = this.getStatsComponent.bind(this);
        this.updateStats = this.updateStats.bind(this);

        // Global event handlers. These will catch events unless they are caught and prevented from bubbling up earlier.
        this.handleDropdownChange = this.handleDropdownChange.bind(this);
        this.handleAutocompleteChosenChange = this.handleAutocompleteChosenChange.bind(this);
        this.handleAutocompleteFocusChange = this.handleAutocompleteFocusChange.bind(this);
        this.handleAutocompleteHiddenChange = this.handleAutocompleteHiddenChange.bind(this);
        this.handleLayoutClick = this.handleLayoutClick.bind(this);
        this.handleKey = this.handleKey.bind(this);
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

        console.log('APP FILTERS', Filters.hrefToFilters(props.href, (props.context && Array.isArray(props.context.filters) && props.context.filters) || null));

        this.historyEnabled = !!(typeof window != 'undefined' && window.history && window.history.pushState);

        // Todo: Migrate session & user_actions to redux store?
        var session = false;
        var user_actions = [];

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

        console.log("App Initial State: ", session, user_actions);

        if (this.props.context.schemas) Schemas.set(this.props.context.schemas);

        this.state = {
            'errors': [],
            'dropdownComponent': undefined,
            'content': undefined,
            'session': session,
            'user_actions': user_actions,
            'schemas': this.props.context.schemas || null,
            'isSubmitting': false,
            'mounted' : false
        };
    }

    // Once the app component is mounted, bind keydowns to handleKey function
    componentDidMount() {
        globals.bindEvent(window, 'keydown', this.handleKey);

        this.authenticateUser();
        // Load schemas into app.state, access them where needed via props (preferred, safer) or this.context.
        this.loadSchemas();

        // The href prop we have was from serverside. It would not have a hash in it, and might be shortened.
        // Here we grab full-length href from window and update props.href (via Redux), if it is different.
        var query_href;
        // Technically these two statements should be exact same. Props.href is put into <link...> (see render() ). w.e.
        if (document.querySelector('link[rel="canonical"]')){
            query_href = document.querySelector('link[rel="canonical"]').getAttribute('href');
        } else {
            query_href = this.props.href;
        }
        // Grab window.location.href w/ query_href as fallback. Remove hash if need to.
        query_href = globals.maybeRemoveHash(globals.windowHref(query_href));
        if (this.props.href !== query_href){
            store.dispatch({
                type: {'href':query_href}
            });
        }

        // If the window href has a hash, which SHOULD NOT remain (!== globals.maybeRemoveHash()), strip it on mount to match app's props.href.
        var parts = url.parse(query_href);
        if (
            typeof window.location.hash === 'string' &&
            window.location.hash.length > 0 &&
            (!parts.hash || parts.hash === '')
        ){
            window.location.hash = '';
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
        window.onbeforeunload = this.handleBeforeUnload;

        // Load up analytics
        analytics.initializeGoogleAnalytics(
            analytics.getTrackingId(this.props.href),
            this.props.context,
            this.props.expSetFilters
        );

        this.setState({ 'mounted' : true });
    }

    componentWillUpdate(nextProps, nextState){
        if (nextState.schemas !== this.state.schemas){
            Schemas.set(nextState.schemas);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        var key;
        if (this.props) {

            if (this.props.href !== prevProps.href){ // We navigated somewhere else.

                // Register google analytics pageview event.
                analytics.registerPageView(this.props.href, this.props.context, this.props.expSetFilters);

                // We need to rebuild tooltips after navigation to a different page.
                ReactTooltip.rebuild();

            }


            for (key in this.props) {
                if (this.props[key] !== prevProps[key]) {
                    console.log('changed props: %s', key);
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
                    console.log('changed state: %s', key);
                }
            }
        }
    }

    // Retrieve current React context
    getChildContext() {
        return {
            dropdownComponent: this.state.dropdownComponent, // ID of component with visible dropdown
            location_href: this.props.href,
            onDropdownChange: this.handleDropdownChange, // Function to process dropdown state change
            hidePublicAudits: true, // True if audits should be hidden on the UI while logged out
            session: this.state.session,
            navigate: navigate,
            schemas : this.state.schemas
        };
    }

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

    currentAction() {
        var href_url = url.parse(this.props.href);
        var hash = href_url.hash || '';
        var name;
        if (hash.slice(0, 2) === '#!') {
            name = hash.slice(2);
        }
        return name;
    }

    loadSchemas(callback, forceFetch = false){
        if (this.state.schemas !== null && !forceFetch){
            // We've already loaded these successfully (hopefully)
            if (typeof callback === 'function') callback(this.state.schemas);
            console.info('Schemas available already.');
            return this.state.schemas;
        }
        ajax.promise('/profiles/').then(data => {
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

    getStatsComponent(){
        if (!this.refs || !this.refs.navigation) return null;
        if (!this.refs.navigation.refs) return null;
        if (!this.refs.navigation.refs.stats) return null;
        return this.refs.navigation.refs.stats;
    }

    updateStats(currentCounts, totalCounts = null, callback = null){
        var statsComponent = this.getStatsComponent();
        if (statsComponent){
            if (totalCounts === null){
                return statsComponent.updateCurrentCounts(currentCounts, callback);
            } else {
                return statsComponent.updateCurrentAndTotalCounts(currentCounts, totalCounts, callback);
            }
        }
        return null;
    }

    // When current dropdown changes; componentID is _rootNodeID of newly dropped-down component
    handleDropdownChange(componentID) {
        // Use React _rootNodeID to uniquely identify a dropdown menu;
        // It's passed in as componentID
        this.setState({dropdownComponent: componentID});
    }

    handleAutocompleteChosenChange(chosen) { this.setState({autocompleteTermChosen: chosen}); }

    handleAutocompleteFocusChange(focused) { this.setState({autocompleteFocused: focused}); }

    handleAutocompleteHiddenChange(hidden) { this.setState({autocompleteHidden: hidden}); }

    // Handle a click outside a dropdown menu by clearing currently dropped down menu
    handleLayoutClick(e) {
        if (this.state.dropdownComponent !== undefined) {
            this.setState({dropdownComponent: undefined});
        }
    }

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

        // Don't cache requests to user profile.
        var navOpts = {};
        if (target.getAttribute('data-no-cache')) navOpts.cache = false;

        // With HTML5 history supported, local navigation is passed
        // through the navigate method.
        if (this.historyEnabled) {
            event.preventDefault();
            navigate(href, navOpts, ()=>{
                var hrefParts = url.parse(href);
                var hrefHash = hrefParts.hash;
                if (hrefHash && typeof hrefHash === 'string' && hrefHash.length > 1){
                    hrefHash = hrefHash.slice(1); // Strip out '#'
                    setTimeout(layout.animateScrollTo.bind(layout.animateScrollTo, hrefHash), 100);
                }
                if (hrefParts.pathname.indexOf('/browse/') > -1){
                    var filters = Filters.hrefToFilters(href, null, false);
                    Filters.saveChangedFilters(filters, false);
                }
            });
            if (this.refs && this.refs.navigation){
                this.refs.navigation.closeMobileMenu();
            }
            if (target && target.blur) target.blur();
        }
    }

    // Submitted forms are treated the same as links
    handleSubmit(event) {
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
            navigate(href, options);
        }
    }

    handlePopState(event) {
        if (this.DISABLE_POPSTATE) return;
        var href = window.location.href; // Href which browser just navigated to, but maybe not yet set to this.props.href

        if (!this.confirmPopState(href)){
            window.history.pushState(window.state, '', this.props.href);
            return;
        }

        if (!this.confirmNavigation(href)) {
            //window.history.pushState(window.state, '', this.props.href);
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

    // If ESC pressed while drop-down menu open, close the menu
    handleKey(e) {
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
    }

    authenticateUser(callback = null){
        // check existing user_info in local storage and authenticate
        var idToken = JWT.get();
        if(idToken && (!this.state.session || !this.state.user_actions)){ // if JWT present, and session not yet set (from back-end), try to authenticate

            ajax.promise('/login', 'POST', {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+idToken
            }, JSON.stringify({id_token: idToken}))
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
    }

    updateUserInfo(callback = null){
        // get user actions (a function of log in) from local storage
        var userActions = [];
        var session = false;
        var userInfo = JWT.getUserInfo();
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
        if (session != this.state.session) stateChange.session = session;

        if (Object.keys(stateChange).length > 0){
            this.setState(stateChange, typeof callback === 'function' ? callback.bind(this, session, userInfo) : null);
        } else {
            if (typeof callback === 'function') callback(session, userInfo);
        }
    }

    // functions previously in navigate, mixins.js
    onHashChange (event) {
        // IE8/9
        store.dispatch({
            type: {'href':document.querySelector('link[rel="canonical"]').getAttribute('href')}
        });
    }

    /** Rules to prevent browser from changing to 'href' via back/forward buttons. */
    confirmPopState(href){
        if (this.stayOnSubmissionsPage(href)) return false;
        return true;
    }

    /** Only navigate if href changes */
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
     * @param {string} [href] - Href we are navigating to (in case of navigate, confirmNavigation) or have just navigated to (in case of popState event).
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

            var request = ajax.fetch(
                href,
                {
                    'headers': {}, // Filled in by ajax.promise
                    'cache' : options.cache === false ? false : true
                }
            );

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
                if (!object.isValidJSON(response)) {
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

    }

    receiveContextResponse (data, extendDispatchDict = {}) {
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
    }

    /** Set 'isSubmitting' in state. works with handleBeforeUnload **/
    setIsSubmitting(bool, callback=null){
        this.setState({'isSubmitting': bool}, callback);
    }

    /** Catch user navigating away from page if in submission process. */
    handleBeforeUnload(e){
        if(this.state.isSubmitting){
            var dialogText = 'Leaving will cause all unsubmitted work to be lost. Are you sure you want to proceed?';
            e.returnValue = dialogText;
            return dialogText;
        }
    }

    render() {
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
                    actionList.push(navSplit[1].slice(1).toLowerCase());
                }else{
                    scrollList.push(navSplit[1].toLowerCase());
                }
            }else if(value.charAt(0) !== "!" && value.length > 0){
                // test for edit handle
                if (value === '#!edit'){
                    actionList.push('edit');
                }else if (value === '#!create'){
                    actionList.push('create');
                }else if (value === '#!clone'){
                    actionList.push('clone');
                }else if (value === '#!add'){
                    actionList.push('add');
                }else{
                    lowerList.push(value.toLowerCase());
                }
            }
        });
        var currRoute = lowerList.slice(1); // eliminate http
        // check error status
        var status;
        var route = currRoute[currRoute.length-1];

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
            if (route != 'help' && route != 'about' && route !== 'home' && route !== 'submissions'){
                status = 'not_found';
            }
        } else if (route == 'submissions' && !_.contains(this.state.user_actions.map(action => action.id), 'submissions')){
            status = 'forbidden'; // attempting to view submissions but it's not in users actions
        }

        // Object of common props passed to all content_views.

        let commonContentViewProps = {
            context : context,
            schemas : this.state.schemas,
            session : this.state.session,
            href : this.props.href,
            navigate : this.navigate,
            expSetFilters : this.props.expSetFilters,
            key : key,
            uploads : this.state.uploads,
            updateUploads : this.updateUploads,
            listActionsFor : this.listActionsFor,
            updateUserInfo : this.updateUserInfo
        };

        // first case is fallback
        if (canonical === "about:blank"){
            title = portal.portal_title;
            content = null;
        // error catching
        }else if(status){
            content = <ErrorPage currRoute={currRoute[currRoute.length-1]} status={status}/>;
            title = 'Error';
        }else if(actionList.length === 1){
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
                        <SubmissionView
                            {...commonContentViewProps}
                            setIsSubmitting={this.setIsSubmitting}
                            create={actionList[0] === 'create' || actionList[0] === 'add'}
                            edit={actionList[0] === 'edit'}
                        />
                    );
                    title = object.itemUtil.getTitleStringFromContext(context);
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
                    <ContentView {...commonContentViewProps} />
                );
                title = context.display_title || context.title || context.name || context.accession || context['@id'];
                if (title && title != 'Home') {
                    title = title + ' – ' + portal.portal_title;
                } else {
                    title = portal.portal_title;
                }
            } else {
                // Handle the case where context is not loaded correctly
                content = <ErrorPage status={null} />;
                title = 'Error';
            }
        }
        // Google does not update the content of 301 redirected pages
        var base;
        if (({'http://data.4dnucleome.org/': 1})[canonical]) {
            base = canonical = 'http://data.4dnucleome.org/';
            this.historyEnabled = false;

        }

        // Set current path for per-page CSS rule targeting.
        var hrefParts = url.parse(canonical || base);

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
                    <link href="https://fonts.googleapis.com/css?family=Mada:200,300,400,500,600,700,900|Yrsa|Source+Code+Pro:300,400,500,600" rel="stylesheet"/>
                    <script data-prop-name="user_details" type="application/ld+json" dangerouslySetInnerHTML={{
                        __html: jsonScriptEscape(JSON.stringify(JWT.getUserDetails())) /* Kept up-to-date in browser.js */
                    }}></script>
                    <script data-prop-name="inline" type="application/javascript" charSet="utf-8" dangerouslySetInnerHTML={{__html: this.props.inline}}></script>
                    <script data-prop-name="lastCSSBuildTime" type="application/ld+json" dangerouslySetInnerHTML={{ __html: this.props.lastCSSBuildTime }}></script>
                    <link rel="stylesheet" href={'/static/css/style.css?build=' + (this.props.lastCSSBuildTime || 0)} />
                    <link href="/static/font/ss-gizmo.css" rel="stylesheet" />
                    <link href="/static/font/ss-black-tie-regular.css" rel="stylesheet" />
                </head>
                <body onClick={this.handleClick} onSubmit={this.handleSubmit} data-path={hrefParts.path} data-pathname={hrefParts.pathname}>
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
                                    updateUserInfo={this.updateUserInfo}
                                    expSetFilters={this.props.expSetFilters}
                                    portal={portal}
                                    listActionsFor={this.listActionsFor}
                                    ref="navigation"
                                    schemas={this.state.schemas}
                                />
                                <div id="pre-content-placeholder"/>
                                <div id="page-title-container" className="container">
                                    <PageTitle context={this.props.context} href={this.props.href} schemas={this.state.schemas} />
                                </div>
                                <div id="facet-charts-container" className="container">
                                    <FacetCharts
                                        href={this.props.href}
                                        context={this.props.context}
                                        expSetFilters={this.props.expSetFilters}
                                        navigate={navigate}
                                        updateStats={this.updateStats}
                                        schemas={this.state.schemas}
                                        session={this.state.session}
                                    />
                                </div>
                                <div id="content" className="container">
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
                        schemas={this.state.schemas}
                        verticalAlign="center" /* cursor position relative to popover */
                        //debugStyle /* -- uncomment to keep this Component always visible so we can style it */
                    />
                </body>
            </html>
        );
    }

}
