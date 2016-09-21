'use strict';
var React = require('react');
var jsonScriptEscape = require('../libs/jsonScriptEscape');
var globals = require('./globals');
var mixins = require('./mixins');
var home = require('./home');
var ErrorPage = require('./error');
var Navigation = require('./navigation');
var HelpPage = require('./help');
var AboutPage = require('./about');
var Footer = require('./footer');
var url = require('url');
var _ = require('underscore');
var store = require('../store');

//sid is to allow addition of supplementary ids to navbar link headings

var portal = {
    portal_title: '4DN Data Portal',
    global_sections: [
        {id: 'data', sid:'sData', title: 'Data', children: [
            {id: 'experiments', title: 'Experiments', url: '/search/?type=Experiment'},
            {id: 'biosources', title: 'Biosources', url: '/search/?type=Biosource'}
        ]},
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
            {id: 'profile', title: 'Profile', url: '/'}
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


// App is the root component, mounted on document.body.
// It lives for the entire duration the page is loaded.
// App maintains state for the
var App = React.createClass({
    mixins: [mixins.Persona, mixins.HistoryAndTriggers],
    triggers: {
        login: 'triggerLogin',
        profile: 'triggerProfile',
        logout: 'triggerLogout'
    },

    getInitialState: function() {
        return {
            errors: [],
            dropdownComponent: undefined,
            content: undefined
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
        hidePublicAudits: React.PropTypes.bool
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
            hidePublicAudits: true // True if audits should be hidden on the UI while logged out
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
            return this.state.session_properties.user_actions || [];
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

    // Once the app component is mounted, bind keydowns to handleKey function
    componentDidMount: function() {
        globals.bindEvent(window, 'keydown', this.handleKey);
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
        // first case is fallback
        if (canonical === "about:blank"){
            title = portal.portal_title;
            content = null;
        }else if (currRoute[currRoute.length-1] === 'home' || (currRoute[currRoute.length-1] === href_url.host)){
            var banners = [];
            banners.push(<home.BannerLoader text='experiments' location='/search/?type=Experiment&award.project=4DN'/>);
            banners.push(<home.BannerLoader text='experiments' location='/search/?type=Experiment&award.project=External'/>);
            banners.push(<home.BannerLoader text='cell types' location='/search/?type=Biosource'/>);
            content = <home.HomePage banners={banners}/>;
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
                content = <ContentView context={context} />;
                title = context.title || context.name || context.accession || context['@id'];
                if (title && title != 'Home') {
                    title = title + ' – ' + portal.portal_title;
                } else {
                    title = portal.portal_title;
                }
            }else{
                // Handle the case where context is not loaded correctly
                content = <ErrorPage />;
                title="Not Found";
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
                    <meta charSet="utf-8" />
                    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <Title>{title}</Title>
                    {base ? <base href={base}/> : null}
                    <link rel="canonical" href={canonical} />
                    <script async src='//www.google-analytics.com/analytics.js'></script>
                    <link href="https://fonts.googleapis.com/css?family=Work+Sans" rel="stylesheet" />
                    <link href="https://fonts.googleapis.com/css?family=Yrsa" rel="stylesheet" />
                    <script data-prop-name="inline" dangerouslySetInnerHTML={{__html: this.props.inline}}></script>
                    <link rel="stylesheet" href="/static/css/style.css" />
                </head>
                <body onClick={this.handleClick} onSubmit={this.handleSubmit}>
                    <script data-prop-name="context" type="application/ld+json" dangerouslySetInnerHTML={{
                        __html: '\n\n' + jsonScriptEscape(JSON.stringify(this.props.context)) + '\n\n'
                    }}></script>
                    <div id="slot-application">
                        <div id="application" className={appClass}>
                        <div className="loading-spinner"></div>
                            <div id="layout" onClick={this.handleLayoutClick} onKeyPress={this.handleKey}>
                                <Navigation />
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
            store.dispatch({
                type: {'href':document.querySelector('link[rel="canonical"]').getAttribute('href')}
            });
            var script_props = document.querySelectorAll('script[data-prop-name]');
            var props_dict = {};
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
