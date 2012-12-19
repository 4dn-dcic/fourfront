define(['exports', 'jquery', 'underscore', 'base', 'text!templates/home.html'],
function home(exports, $, _, base, home_template) {

    // The home screen
    exports.HomeView = base.View.extend({
        template: _.template(home_template)
    },  {
        route_name: 'home'
    });

    return exports;
});
