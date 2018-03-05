'use strict';

import _ from 'underscore';
var cookie = require('react-cookie');
import { isServerSide } from './misc';
import patchedConsoleInstance from './patched-console';
import { getNestedProperty } from './object';

var console = patchedConsoleInstance;


const COOKIE_ID = 'jwtToken';

let dummyStorage = {};


export function get(source = 'cookie'){
    if (source === 'all' || source === '*') source = 'any';

    var idToken = null;

    if (source === 'cookie' || source === 'any'){
        if (isServerSide()){
            idToken = null;
        } else {
            idToken = cookie.load(COOKIE_ID) || null;
        }
    }

    if (idToken === null && (source === 'localStorage' || source === 'any' || isServerSide())){
        var userInfo = getUserInfo();
        if (userInfo && userInfo.id_token) idToken = userInfo.id_token;
    }

    return idToken;
}


export function storeExists(){
    if (typeof(Storage) === 'undefined' || typeof localStorage === 'undefined' || !localStorage) return false;
    return true;
}


export function maybeValid(jwtToken){
    return (
        typeof jwtToken === 'string' && jwtToken.length > 0 &&
        jwtToken !== "null" &&
        jwtToken !== "expired"
    ) ? true : false;
}


/**
 * Return an array of user groups the current user belongs to
 * Based off of the current JWT
 */
export function getUserGroups(){
    var userInfo = getUserInfo();
    var userGroups = [];
    if (userInfo){
        var currGroups = getNestedProperty(userInfo, ['details', 'groups'], true);
        if(currGroups && Array.isArray(currGroups)){
            userGroups = currGroups;
        }
    }
    return userGroups;
}


export function getUserInfo(){
    try {
        if (storeExists()){
            return JSON.parse(localStorage.getItem('user_info'));
        } else {
            return JSON.parse(dummyStorage.user_info);
        }
    } catch (e) {
        //console.error(e);
        return null;
    }
}


export function getUserDetails(){
    var userInfo = getUserInfo();
    if (userInfo && userInfo.details) {
        var userDetails = userInfo.details;
        if (userDetails === 'null') userDetails = null;
        return userDetails;
    }
    return null;
}


export function saveUserDetails(details){
    var userInfo = getUserInfo();
    if (typeof userInfo !== 'undefined' && userInfo) {
        userInfo.details = details;
        saveUserInfoLocalStorage(userInfo);
        return true;
    } else {
        //userInfo = { 'details' : details };
        //saveUserInfoLocalStorage(userInfo);
        return false;
    }
}


export function save(idToken, destination = 'cookie'){
    if (destination === 'cookie'){
        cookie.save(COOKIE_ID, idToken, {
            path : '/'
        });
        return true;
    }
}


export function saveUserInfoLocalStorage(user_info){
    if (storeExists()){
        localStorage.setItem("user_info", JSON.stringify(user_info));
    } else {
        dummyStorage.user_info = JSON.stringify(user_info);
    }
    return true;
}


export function saveUserInfo(user_info){
    // Delegate JWT token to cookie, keep extended user_info obj (w/ copy of token) in localStorage.
    save(user_info.idToken || user_info.id_token, 'cookie');
    saveUserInfoLocalStorage(user_info);
}


export function remove(source = 'all'){
    if (source === 'any' || source === '*') source = 'all';

    var removedCookie = false,
        removedLocalStorage = false;

    if (source === 'cookie' || source === 'all'){
        var savedIdToken = cookie.load(COOKIE_ID) || null;
        if (savedIdToken) {
            cookie.remove(COOKIE_ID, { path : '/' });
            removedCookie = true;
        }
    }
    if (source.toLowerCase() === 'localstorage' || source === 'all'){
        if(!storeExists()) {
            delete dummyStorage.user_info;
            removedLocalStorage = true;
        } else if (localStorage.user_info){
            localStorage.removeItem("user_info");
            removedLocalStorage = true;
        }
    }
    console.info('Removed JWT: ' + removedCookie + ' (cookie) ' + removedLocalStorage + ' (localStorage)');
    return { 'removedCookie' : removedCookie, 'removedLocalStorage' : removedLocalStorage };
}


export function addToHeaders(headers = {}){
    var idToken = get('cookie');
    if(idToken && typeof headers.Authorization === 'undefined'){
        headers.Authorization = 'Bearer ' + idToken;
    }
    return headers;
}
