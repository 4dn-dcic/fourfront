/*jshint scripturl:true */
'use strict';
var _ = require('underscore');
var React = require('react');
var url = require('url');
var origin = require('../libs/origin');
var serialize = require('form-serialize');
var ga = require('google-analytics');
var store = require('../store');
var parseAndLogError = require('./parseError').parseAndLogError;
var dispatch_dict = {}; //used with navigate to store value for simultaneous dispatch

var contentTypeIsJSON = module.exports.contentTypeIsJSON = function (content_type) {
    return (content_type || '').split(';')[0].split('/').pop().split('+').pop() === 'json';
};

class Timeout {
    constructor(timeout) {
        this.promise = new Promise(resolve => setTimeout(resolve.bind(undefined, this), timeout));
    }
}

module.exports.HistoryAndTriggers = {
    SLOW_REQUEST_TIME: 250,
    // Detect HTML5 history support
    historyEnabled: !!(typeof window != 'undefined' && window.history && window.history.pushState),

    childContextTypes: {
        navigate: React.PropTypes.func
    },

    getChildContext: function() {
        return {
            navigate: this.navigate
        };
    },

    componentWillMount: function () {
        if (typeof window !== 'undefined') {
            // IE8 compatible event registration
            window.onerror = this.handleError;
        }
    },

    componentDidMount: function () {
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
    },

    onHashChange: function (event) {
        // IE8/9
        store.dispatch({
            type: {'href':document.querySelector('link[rel="canonical"]').getAttribute('href')}
        });
    },

    trigger: function (name) {
        var method_name = this.triggers[name];
        if (method_name) {
            this[method_name].call(this);
        }
    },

    handleError: function(msg, url, line, column) {
        // When an unhandled exception occurs, reload the page on navigation
        this.historyEnabled = false;
        var parsed = url && require('url').parse(url);
        if (url && parsed.hostname === window.location.hostname) {
            url = parsed.path;
        }
        ga('send', 'exception', {
            'exDescription': url + '@' + line + ',' + column + ': ' + msg,
            'exFatal': true,
            'location': window.location.href
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

        // data-trigger links invoke custom handlers.
        var data_trigger = target.getAttribute('data-trigger');
        if (data_trigger !== null) {
            event.preventDefault();
            this.trigger(data_trigger);
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
                request.abort();
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
        // Triggers standard analytics handling.
        this.navigate(href, {replace: true});
    },

    // only navigate if href changes
    confirmNavigation: function(href, options) {
        var inPlace;
        if(options.inPlace && options.inPlace==true){
            return true;
        }
        if(href===this.props.href){
            return false;
        }
        return true;
    },

    navigate: function (href, options) {
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

        if (request && this.requestCurrent) {
            // Abort the current request, then remember we've aborted the request so that we
            // don't render the Network Request Error page.
            request.abort();
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

        request = this.fetch(href, {
            headers: {'Accept': 'application/json'}
        });
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
            // Request has returned data
            this.requestCurrent = false;

            // navigate normally to URL of unexpected non-JSON response so back button works.
            if (!contentTypeIsJSON(response.headers.get('Content-Type'))) {
                if (options.replace) {
                    window.location.replace(href + fragment);
                } else {
                    var old_path = ('' + window.location).split('#')[0];
                    window.location.assign(href + fragment);
                    if (old_path == href) {
                        window.location.reload();
                    }
                }
            }
            // The URL may have redirected
            var response_url = response.url || href;

            if (options.replace) {
                window.history.replaceState(null, '', response_url + fragment);
            } else {
                window.history.pushState(null, '', response_url + fragment);
            }

            dispatch_dict.href = response_url + fragment;
            if (!response.ok) {
                throw response;
            }
            return response.json();
        })
        .catch(parseAndLogError.bind(undefined, 'contextRequest'))
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

    componentDidUpdate: function () {
        var xhr = this.props.contextRequest;
        if (!xhr || !xhr.xhr_end || xhr.browser_stats) return;
        var browser_end = 1 * new Date();

        ga('set', 'location', window.location.href);
        ga('send', 'pageview');
        this.constructor.recordServerStats(xhr.server_stats, 'contextRequest');

        xhr.browser_stats = {};
        xhr.browser_stats['xhr_time'] = xhr.xhr_end - xhr.xhr_begin;
        xhr.browser_stats['browser_time'] = browser_end - xhr.xhr_end;
        xhr.browser_stats['total_time'] = browser_end - xhr.xhr_begin;
        this.constructor.recordBrowserStats(xhr.browser_stats, 'contextRequest');

    },

    scrollTo: function() {
        var hash = window.location.hash;
        if (hash && document.getElementById(hash.slice(1))) {
            window.location.replace(hash);
        } else {
            window.scrollTo(0, 0);
        }
    },

    statics: {
        recordServerStats: function (server_stats, timingVar) {
            // server_stats *_time are microsecond values...
            Object.keys(server_stats).forEach(function (name) {
                if (name.indexOf('_time') === -1) return;
                ga('send', 'timing', {
                    'timingCategory': name,
                    'timingVar': timingVar,
                    'timingValue': Math.round(server_stats[name] / 1000)
                });
            });
        },
        recordBrowserStats: function (browser_stats, timingVar) {
            Object.keys(browser_stats).forEach(function (name) {
                if (name.indexOf('_time') === -1) return;
                ga('send', 'timing', {
                    'timingCategory': name,
                    'timingVar': timingVar,
                    'timingValue': browser_stats[name]
                });
            });
        }
    }

};
