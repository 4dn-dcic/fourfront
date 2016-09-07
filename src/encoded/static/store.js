import { createStore, combineReducers } from 'redux'

// Create a redux store to manage state for the whole application

const href = function(state='', action) {
    switch (action.type) {
    case 'href':
        var val = action.value ? action.value : state;
        return val
     default:
        return state
  }
}

const context = function(state={}, action){
    switch (action.type) {
    case 'context':
        var val = action.value ? action.value : state;
        return val;
     default:
        return state
  }
}

const inline = function(state='', action) {
    switch (action.type) {
    case 'inline':
        var val = action.value ? action.value : state;
        return val
     default:
        return state
    }
}

const session_cookie = function(state='', action) {
    switch (action.type) {
    case 'session_cookie':
        var val = action.value ? action.value : state;
        return val
     default:
        return state
    }
}

const contextRequest = function(state={}, action) {
    switch (action.type) {
    case 'contextRequest':
        var val = action.value ? action.value : state;
        return val
     default:
        return state
    }
}

const slow = function(state=false, action) {
    switch (action.type) {
    case 'slow':
        var val = action.value ? action.value : state;
        return val
     default:
        return state
    }
}

// Combine Reducers
const reducers = combineReducers({
  href,
  context,
  inline,
  session_cookie,
  contextRequest,
  slow
});

const store = module.exports = createStore(reducers);
