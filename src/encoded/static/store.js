var { createStore, combineReducers } = require('redux');
var _ = require('underscore');

// Create a redux store to manage state for the whole application

var href = function(state='', action) {
    if (action.type && _.contains(Object.keys(action.type), 'href')){
        var val = action.type.href ? action.type.href : state;
        return val
    }else{
        return state
    }
}

var context = function(state={}, action){
    if (action.type && _.contains(Object.keys(action.type), 'context')){
        var val = action.type.context ? action.type.context : state;
        return val
    }else{
        return state
    }
}

var inline = function(state='', action) {
    if (action.type && _.contains(Object.keys(action.type), 'inline')){
        var val = action.type.inline ? action.type.inline : state;
        return val
    }else{
        return state
    }
}

var session_cookie = function(state='', action) {
    if (action.type && _.contains(Object.keys(action.type), 'session_cookie')){
        var val = action.type.session_cookie ? action.type.session_cookie : state;
        return val
    }else{
        return state
    }
}

var contextRequest = function(state={}, action) {
    if (action.type && _.contains(Object.keys(action.type), 'contextRequest')){
        var val = action.type.contextRequest ? action.type.contextRequest : state;
        return val
    }else{
        return state
    }
}

var slow = function(state=false, action) {
    if (action.type && _.contains(Object.keys(action.type), 'slow')){
        var val = action.type.slow ? action.type.slow : state;
        return val
    }else{
        return state
    }
}

var expSetFilters = function(state={}, action) {
    if (action.type && _.contains(Object.keys(action.type), 'expSetFilters')){
        var val = action.type.expSetFilters ? action.type.expSetFilters : state;
        return val
    }else{
        return state
    }
}

var expIncompleteFacets = function(state=null, action) {
    if (action.type && _.contains(Object.keys(action.type), 'expIncompleteFacets')){
        var val = action.type.expIncompleteFacets ? action.type.expIncompleteFacets : state;
        return val
    }else{
        return state
    }
}

// Combine Reducers
var reducers = combineReducers({
    href,
    context,
    inline,
    session_cookie,
    contextRequest,
    slow,
    expSetFilters,
    expIncompleteFacets
});

var store = module.exports = createStore(reducers);
