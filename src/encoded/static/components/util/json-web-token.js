'use strict';

var _ = require('underscore');
var cookie = require('react-cookie');
var { isServerSide } = require('./misc');
var console = require('./patched-console');

var JWT = module.exports = {

    COOKIE_ID : 'jwtToken',
    dummyStorage : {}, // Fake localStorage for use by serverside and tests.
    
    get : function(source = 'cookie'){
        if (source === 'all' || source === '*') source = 'any';

        var idToken = null;

        if (source === 'cookie' || source === 'any'){
            if (isServerSide()){
                idToken = null;
            } else {
                idToken = cookie.load(JWT.COOKIE_ID) || null;
            }
        }

        if (idToken === null && (source === 'localStorage' || source === 'any' || isServerSide())){
            var userInfo = JWT.getUserInfo();
            if (userInfo && userInfo.id_token) idToken = userInfo.id_token;
        }

        return idToken;
    },

    storeExists : function(){
        if (typeof(Storage) === 'undefined' || typeof localStorage === 'undefined' || !localStorage) return false;
        return true;
    },

    maybeValid : function(jwtToken){
        return (jwtToken && jwtToken.length > 0 && jwtToken !== "null" && jwtToken !== "expired") ? true : false;
    },

    getUserInfo : function(){
        try {
            if (JWT.storeExists()){
                return JSON.parse(localStorage.getItem('user_info'));
            } else {
                return JSON.parse(JWT.dummyStorage.user_info);
            }
        } catch (e) {
            //console.error(e);
            return null;
        }
    },

    getUserDetails : function(){
        var userInfo = JWT.getUserInfo();
        if (userInfo && userInfo.details) {
            var userDetails = userInfo.details;
            if (userDetails === 'null') userDetails = null;
            return userDetails;
        }
        return null;
    },

    saveUserDetails : function(details){
        var userInfo = JWT.getUserInfo();
        if (typeof userInfo !== 'undefined' && userInfo) {
            userInfo.details = details;
            JWT.saveUserInfoLocalStorage(userInfo);
            return true;
        } else {
            //userInfo = { 'details' : details };
            //JWT.saveUserInfoLocalStorage(userInfo);
            return false;
        }
    },

    save : function(idToken, destination = 'cookie'){
        if (destination === 'cookie'){
            cookie.save(JWT.COOKIE_ID, idToken, {
                path : '/'
            });
            return true;
        }
    },

    saveUserInfoLocalStorage : function(user_info){
        if (JWT.storeExists()){
            localStorage.setItem("user_info", JSON.stringify(user_info));
        } else {
            JWT.dummyStorage.user_info = JSON.stringify(user_info);
        }
        return true;
    },

    saveUserInfo : function(user_info){
        // Delegate JWT token to cookie, keep extended user_info obj (w/ copy of token) in localStorage.
        JWT.save(user_info.idToken || user_info.id_token, 'cookie');
        JWT.saveUserInfoLocalStorage(user_info);
    },

    remove : function(source = 'all'){
        if (source === 'any' || source === '*') source = 'all';

        var removedCookie = false,
            removedLocalStorage = false;

        if (source === 'cookie' || source === 'all'){
            var savedIdToken = cookie.load(JWT.COOKIE_ID) || null;
            if (savedIdToken) {
                cookie.remove(JWT.COOKIE_ID, { path : '/' });
                removedCookie = true;
            }
        }
        if (source.toLowerCase() === 'localstorage' || source === 'all'){
            if(!JWT.storeExists()) {
                delete JWT.dummyStorage.user_info;
                removedLocalStorage = true;
            } else if (localStorage.user_info){
                localStorage.removeItem("user_info");
                removedLocalStorage = true;
            }
        }
        console.info('Removed JWT: ' + removedCookie + ' (cookie) ' + removedLocalStorage + ' (localStorage)');
        return { 'removedCookie' : removedCookie, 'removedLocalStorage' : removedLocalStorage };
    },

    addToHeaders : function(headers = {}){
        var idToken = JWT.get('cookie');
        if(idToken && typeof headers.Authorization === 'undefined'){
            headers.Authorization = 'Bearer ' + idToken;
        }
        return headers;
    }

};

if (!isServerSide()) window.JWT = JWT;