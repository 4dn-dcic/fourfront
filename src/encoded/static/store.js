import { createStore, combineReducers } from 'redux';
import _ from 'underscore';
import { JWT, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

// Create a redux store to manage state for the whole application
// Not sure why everything is saved to & reduced from `action.type` but w/e .. this could likely
// be refactored further in future

export const reducers = {

    'href' : function(state='', action) {
        return (action.type && action.type.href) || state;
    },

    'context' : function(state={}, action){
        if (action.type && typeof action.type.context !== 'undefined'){
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
            return context;
        } else {
            return state;
        }
    },

    'lastCSSBuildTime' : function(state='', action) {
        return (action.type && action.type.lastCSSBuildTime) || state;
    },

    'slow' : function(state=false, action) {
        if (action.type && typeof action.type.slow === 'boolean'){
            return action.type.slow;
        }
        return state;
    },

    'alerts' : function(state=[], action) {
        if (action.type && Array.isArray(action.type.alerts)){
            return action.type.alerts;
        }
        return state;
    },

    'browseBaseState' : function(state='only_4dn', action){
        return (action.type && action.type.browseBaseState) || state;
    }
};


export const store = createStore(combineReducers(reducers));

// Utility stuff (non-standard for redux)

export function mapStateToProps(currStore){
    return _.object(_.map(_.keys(reducers), function(rfield){
        return [rfield, currStore[rfield]];
    }));
}

