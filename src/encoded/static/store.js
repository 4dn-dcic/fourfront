import { configureStore, combineReducers } from '@reduxjs/toolkit';
import _ from 'underscore';
import { JWT, isServerSide } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

// Create a redux store to manage state for the whole application
// Not sure why everything is saved to & reduced from `action.type` but w/e .. this could likely
// be refactored further in future

const reducers = {
    href: function(state = '', action) {
        switch (action.type) {
            case 'SET_HREF':
                return action.payload || state;
            default:
                return state;
        }
    },

    context: function(state = {}, action) {
        switch (action.type) {
            case 'SET_CONTEXT':
                var context = action.payload ? action.payload : state;
                if (!isServerSide() && context && context['@type'] && context['@type'].indexOf('User') > -1) {
                    // If context type is user, and is of current user, update localStorage user_info appropriately.
                    // E.g. in case of user editing their own profile, or just keep localStorage up-to-date w/ any other changes
                    var userInfo = JWT.getUserInfo();
                    if (userInfo && userInfo.details && userInfo.details.email === context.email) {
                        _.each(userInfo.details, function(val, key) {
                            if (context[key] && context[key] !== userInfo.details[key]) userInfo.details[key] = context[key];
                        });
                    }
                    JWT.saveUserInfoLocalStorage(userInfo);
                }
                return context;
            default:
                return state;
        }
    },

    lastCSSBuildTime: function(state = '', action) {
        switch (action.type) {
            case 'SET_LAST_CSS_BUILD_TIME':
                return action.payload || state;
            default:
                return state;
        }
    },

    slow: function(state = false, action) {
        switch (action.type) {
            case 'SET_SLOW':
                return action.payload;
            default:
                return state;
        }
    },

    alerts: function(state = [], action) {
        switch (action.type) {
            case 'SET_ALERTS':
                return action.payload || state;
            default:
                return state;
        }
    },

    browseBaseState: function(state = 'all', action) {
        switch (action.type) {
            case 'SET_BROWSE_BASE_STATE':
                return action.payload || state;
            default:
                return state;
        }
    }
};

const rootReducer = combineReducers(reducers);

const store = configureStore({
    reducer: rootReducer
});

export { store };

// Utility stuff (non-standard for redux)

export function mapStateToProps(currStore){
    return _.object(_.map(_.keys(reducers), function(rfield){
        return [rfield, currStore[rfield]];
    }));
}

