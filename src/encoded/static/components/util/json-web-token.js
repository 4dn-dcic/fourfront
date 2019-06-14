'use strict';

import _ from 'underscore';
//var cookie = require('react-cookie');
import Cookies from 'universal-cookie';
import { isServerSide } from './misc';
import patchedConsoleInstance from './patched-console';
import { getNestedProperty } from './object';

const console = patchedConsoleInstance;
const COOKIE_ID = 'jwtToken';

/** Interface to grab cookies. We can move to own util file later for re-use if necessary. */
export const cookieStore = new Cookies();


const dummyStorage = {};

/**
 * Get the current JWT token string from cookie or localStorage.
 *
 * @public
 * @param {string} [source='cookie'] Specify whether to get from cookie or localStorage.
 * @returns {string} The token.
 */
export function get(){
    let idToken = null;
    if (isServerSide()){
        idToken = null;
    } else {
        idToken = cookieStore.get(COOKIE_ID) || null;
    }
    return idToken;
}

/**
 * Check to see if localStorage is supported by the browser or environment.
 *
 * @private
 * @returns {boolean} True if supported.
 */
function storeExists(){
    if (typeof(Storage) === 'undefined' || typeof localStorage === 'undefined' || !localStorage) return false;
    return true;
}

/**
 * Checks to see if a JWT token is in proper
 * format. Does not validate it.
 *
 * @public
 * @returns {boolean} True if looks well-formated.
 */
export function maybeValid(jwtToken){
    return (
        typeof jwtToken === 'string' && jwtToken.length > 0 &&
        jwtToken !== "null" &&
        jwtToken !== "expired"
    ) ? true : false;
}


/**
 * Return an array of user groups the current user belongs to
 * from localStorage.
 *
 * @public
 * @returns {string[]} List of group names.
 */
export function getUserGroups(){
    const userInfo = getUserInfo();
    let userGroups = [];
    if (userInfo){
        const currGroups = getNestedProperty(userInfo, ['details', 'groups'], true);
        if (currGroups && Array.isArray(currGroups)){
            userGroups = currGroups;
        }
    }
    return userGroups;
}

/**
 * Gets complete User Info - including token, details, and groups -
 * from localStorage.
 *
 * @public
 * @returns {Object|null} Object containing user info, or null.
 */
export function getUserInfo(){
    try {
        if (storeExists()){
            return JSON.parse(localStorage.getItem('user_info'));
        } else {
            return JSON.parse(dummyStorage.user_info);
        }
    } catch (e) {
        return null;
    }
}

/**
 * Gets some details about current logged-in user from localStorage,
 * such as their name.
 *
 * @public
 * @returns {Object|null} Object containing user details, or null.
 */
export function getUserDetails(){
    const userInfo = getUserInfo();
    let userDetails = (userInfo && userInfo.details) || null;
    if (userDetails === 'null') userDetails = null;
    return userDetails;
}

/**
 * Saves User Details to localStorage.
 * This should only be used to update frontend if doing concurrent
 * update to the back-end.
 *
 * For example, on User profile page, someone may edit their name
 * which is then sent off as a PATCH to the server and concurrently we want
 * to update the name on front-end display, as well.
 *
 * @public
 * @param {Object} details - Object containing user details. Should be clone/extension of existing user details.
 * @returns {boolean} True if success. False if no user info.
 */
export function saveUserDetails(details){
    const userInfo = getUserInfo();
    if (typeof userInfo !== 'undefined' && userInfo) {
        userInfo.details = details;
        saveUserInfoLocalStorage(userInfo);
        return true;
    } else {
        return false;
    }
}

/**
 * Saves JWT token to cookie or localStorage.
 * Called upon user login.
 *
 * This function (and cookieStore) works server-side
 * as well however the data does not get transferred down with request
 * in a cookie.
 *
 * @public
 * @param {string} idToken - The JWT token.
 * @returns {boolean} True if success.
 */
export function save(idToken){
    cookieStore.set(COOKIE_ID, idToken, { path : '/' });
    return true;
}

/**
 * Saves supplementary user info to localStorage so it might be available
 * for more fine-grained permissions checks. Also some details about User, such
 * as their name, is stored here as well for decoration of User menu title in NavBar
 * and similar use cases.
 *
 * @public
 * @param {Object} user_info - User info object as might be received from the /session-properties or /login endpoint.
 * @returns {boolean} True if success.
 */
export function saveUserInfoLocalStorage(user_info){
    if (storeExists()){
        localStorage.setItem("user_info", JSON.stringify(user_info));
    } else {
        dummyStorage.user_info = JSON.stringify(user_info);
    }
    return true;
}

/**
 * Saves user info object into localStorage and JWT token (available in user info object) into cookie.
 * Can be called as part of user login. User info should be returned by API endpoint /login or /session-properties.
 *
 * @see saveUserInfoLocalStorage
 * @see save
 *
 * @export
 * @param {Object} user_info - User info object as might be received from the /session-properties or /login endpoint.
 * @returns {boolean} True if success.
 */
export function saveUserInfo(user_info){
    // Delegate JWT token to cookie, keep extended user_info obj (w/ copy of token) in localStorage.
    save(user_info.idToken || user_info.id_token, 'cookie');
    saveUserInfoLocalStorage(user_info);
}

/**
 * Removes JWT token from cookies and user info from localStorage.
 * May be called as part of logout.
 *
 * @public
 */
export function remove(){

    console.warn("REMOVING JWT!!");

    const savedIdToken = cookieStore.get(COOKIE_ID) || null;
    if (savedIdToken) {
        cookieStore.remove(COOKIE_ID, { path : '/' });
    }

    if (!storeExists()) {
        delete dummyStorage.user_info;
    } else if (localStorage.user_info){
        localStorage.removeItem("user_info");
    }

    console.info('Removed JWT: ' + savedIdToken);
    return true;
}

/**
 * Adds an Authorization key/value representing current JWT token to an object representing
 * request headers to be used in AJAX requests.
 *
 * Called by setHeaders in /utils/ajax.js.
 *
 * @public
 * @param {string} [source='all'] Specify what to delete, if desired. Default is all.
 * @returns {{ removedCookie: boolean, removedLocalStorage: boolean }} Removal results
 */
export function addToHeaders(headers = {}){
    var idToken = get('cookie');
    if (idToken && typeof headers.Authorization === 'undefined'){
        headers.Authorization = 'Bearer ' + idToken;
    }
    return headers;
}

/**
 * Helper function to determine if current user is an admin according
 * to the user info in localStorage.
 *
 * Does not provide any real security but can be helpful for showing/hiding certain
 * actions or buttons which would otherwise not be permitted by back-end.
 *
 * @public
 * @returns {boolean} True if admin.
 */
export function isLoggedInAsAdmin(){
    var details = getUserDetails();
    if (details && Array.isArray(details.groups) && details.groups.indexOf('admin') > -1){
        return true;
    }
    return false;
}


