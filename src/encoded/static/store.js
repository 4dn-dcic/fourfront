var { createStore, combineReducers } = require('redux');
var _ = require('underscore');
var { JWT, isServerSide } = require('./components/util');

// Create a redux store to manage state for the whole application

var reducers = {

    href : function(state='', action) {
        if (action.type && _.contains(Object.keys(action.type), 'href')){
            var val = action.type.href ? action.type.href : state;
            return val
        } else{
            return state
        }
    },

    context : function(state={}, action){
        if (action.type && _.contains(Object.keys(action.type), 'context')){
            var context = action.type.context ? action.type.context : state;
            if (!isServerSide() && context && context['@type'] && context['@type'].indexOf('User') > -1){
                // If context type is user, and is of current user, update localStorage user_info appropriately.
                // E.g. in case of user editing their own profile, or just keep localStorage up-to-date w/ any other changes
                var userInfo = JWT.getUserInfo();
                if (userInfo && userInfo.details && userInfo.details.email === context.email){
                    _.each(userInfo.details, function(val, key){
                        if (context[key] && context[key] !== userInfo.details[key]) userInfo.details[key] = context[key];
                    });
                }
                JWT.saveUserInfoLocalStorage(userInfo);
            }
            return context
        } else {
            return state
        }
    },

    inline : function(state='', action) {
        if (action.type && _.contains(Object.keys(action.type), 'inline')){
            var val = action.type.inline ? action.type.inline : state;
            return val
        }else{
            return state
        }
    },

    lastCSSBuildTime : function(state='', action) {
        if (action.type && _.contains(Object.keys(action.type), 'lastCSSBuildTime')){
            var val = action.type.lastCSSBuildTime ? action.type.lastCSSBuildTime : state;
            return val
        }else{
            return state
        }
    },

    contextRequest : function(state={}, action) {
        if (action.type && _.contains(Object.keys(action.type), 'contextRequest')){
            var val = action.type.contextRequest ? action.type.contextRequest : state;
            return val
        }else{
            return state
        }
    },

    slow : function(state=false, action) {
        if (action.type && _.contains(Object.keys(action.type), 'slow')){
            var val = action.type.slow ? action.type.slow : state;
            return val
        }else{
            return state
        }
    },

    expSetFilters : function(state={}, action) {
        if (action.type && _.contains(Object.keys(action.type), 'expSetFilters')){
            var val = action.type.expSetFilters ? action.type.expSetFilters : state;
            return val
        }else{
            return state
        }
    },

    expIncompleteFacets : function(state=null, action) {
        if (action.type && _.contains(Object.keys(action.type), 'expIncompleteFacets')){
            var val = action.type.expIncompleteFacets ? action.type.expIncompleteFacets : state;
            return val
        }else{
            return state
        }
    },

    alerts : function(state=[], action) {
        if (action.type && _.contains(Object.keys(action.type), 'alerts')){
            var val = action.type.alerts ? action.type.alerts : state;
            return val
        }else{
            return state
        }
    },
};


var store = createStore(combineReducers(reducers));

// Utility stuff (non-standard for redux)

store.reducers = reducers;

store.mapStateToProps = function(store){
    var reduxStoreFields = Object.keys(reducers);
    var props = {};
    for (var i = 0; i < reduxStoreFields.length; i++){
        props[reduxStoreFields[i]] = store[reduxStoreFields[i]];
    }
    return props;
}

module.exports = store;
