define(['exports', 'jquery', 'underscore', 'backbone', 'backbone.hal', 'assert'],
function base(exports, $, _, Backbone, HAL, assert) {

    // Underscore template settings
    // `{model.title}` for escaped text
    // `<?raw variable ?>}` for raw html interpolations
    // `<?js expression ?>` for javascript evaluations
    _.templateSettings = {
          escape : /\{(.+?)\}/g,
          interpolate : /<\?raw\s+(.+?)\?>/g,
          evaluate : /<\?js\s+(.+?)\?>/g
    };

    // See: http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
    function newCall(Cls, args) {
        return new (Function.prototype.bind.apply(Cls, args))();
    }

    // The view registry allows for a Pyramid like pattern of view registration.
    var ViewRegistry = exports.ViewRegistry = function ViewRegistry() {
        this.deferred = [];
        this.routes = {};
        this.current_views = {}; // Mapping from slot_name -> currently active view
        this.slots = {};
        this.views = {};
    };

    var DeferredRouter = exports.DeferredRouter = Backbone.Router.extend({
        route: function(route, name, callback) {
          if (!_.isRegExp(route)) route = this._routeToRegExp(route);
          if (!callback) callback = this[name];
          Backbone.history.route(route, _.bind(function(fragment) {
            var args = this._extractParameters(route, fragment);
            if (callback) $.when(callback.apply(this, args)).done(_.bind(function () {
                this.trigger.apply(this, ['route:' + name].concat(args));
                Backbone.history.trigger('route', this, name, args);
            }, this)).fail(_.bind(function () {
                console.log("route failed...");
            }, this));
          }, this));
          return this;
        }
    });

    exports.view_registry = new ViewRegistry();

    _.extend(ViewRegistry.prototype, {
        add_slot: function add_slot(slot_name, selector) {
            this.slots[slot_name] = $(selector);
        },

        add_route: function add_route(route_name, pattern) {
            this.routes[route_name] = pattern;
        },

        add_view: function add_view(route_name, view_factory) {
            this.views[route_name] = view_factory;
        },

        defer: function defer(view) {
            this.deferred.push(view);
        },

        make_route_controller: function make_route_controller(view_factory, model_factory) {
            function route_controller() {
                var options = {},
                    deferred;
                if (model_factory) {
                    options.model = new newCall(model_factory, arguments);
                    // possibly redundant
                    deferred = options.model.deferred;
                }
                view = new view_factory(options);
                if (view.deferred !== undefined) deferred = view.deferred;
                $.when(deferred).done(_.bind(function () {
                    this.switch_to(view);
                }, this));
                return deferred;
            }
            return _.bind(route_controller, this);
        },

        process_deferred: function process_deferred() {
            var view_registry = this;
            _(this.deferred).each(function (view_factory) {
                var route_name = view_factory.route_name;
                if (!route_name) return;
                assert(!view_registry.views[route_name], 'route already defined for ' + route_name);
                view_registry.views[route_name] = view_factory;
            });
            this.deferred = null;
        },

        make_router: function make_router(routes) {
            this.process_deferred();
            var router = this.router = new DeferredRouter();
            var rev_routes = _(this.routes).map(function (pattern, route_name) {
                return {route_name: route_name, pattern: pattern};
            }).reverse();
            var view_registry = this;
            _(rev_routes).each(function (route) {
                var view_factory = view_registry.views[route.route_name];
                assert(view_factory, 'missing view for route ' + route.route_name);
                var callback = view_registry.make_route_controller(view_factory, view_factory.model_factory);
                router.route(route.pattern, route.route_name, callback);
            });
            return router;
        },

        switch_to: function switch_to(view, no_render) {
            var slot_name = Object.getPrototypeOf(view).constructor.slot_name;
            var current_view = this.current_views[slot_name];
            if (!no_render) view.render();
            if (current_view) current_view.remove();
            if (!no_render) this.slots[slot_name].html(view.el);
            this.current_views[slot_name] = view;
        }
    });


    // Base View class implements conventions for rendering views.
    exports.View = Backbone.View.extend({
        title: undefined,
        description: undefined,

        // Views should define their own `template`
        template: undefined,

        // Render the view
        render: function render() {
            var properties = this.model && this.model.toJSON();
            this.$el.html(this.template({model: this.model, properties: properties, view: this, '_': _}));
            return this;
        }

    }, {
        view_registry: exports.view_registry,
        slot_name: 'content'
    });

    exports.View.extend = function extend(protoProps, classProps) {
        var view = Backbone.View.extend.apply(this, arguments);
        this.view_registry.defer(view);
        return view;
    };

    exports.Model = HAL.Model.extend({});

    exports.Collection = HAL.Collection.extend({});

    return exports;
});
