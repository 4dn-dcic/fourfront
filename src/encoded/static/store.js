import { createStore, combineReducers } from 'redux'

const href = function(state='', action) {
    switch (action.type) {
    case 'href':
        return action.value
     default:
        return state
  }
}

const context = function(state={}, action){
    switch (action.type) {
    case 'context':
        return action.value
     default:
        return state
  }
}

const inline = function(state='', action) {
    switch (action.type) {
    case 'inline':
        return action.value
     default:
        return state
    }
}

const session_cookie = function(state='', action) {
    switch (action.type) {
    case 'session_cookie':
        return action.value
     default:
        return state
    }
}

const contextRequest = function(state={}, action) {
    switch (action.type) {
    case 'contextRequest':
        return action.value
     default:
        return state
    }
}

const slow = function(state=false, action) {
    switch (action.type) {
    case 'slow':
        return action.value
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
