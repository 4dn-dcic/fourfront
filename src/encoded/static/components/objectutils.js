'use strict';

var cookie = require('react-cookie');
var moment = require('moment');
var _ = require('underscore');

var SingleTreatment = module.exports.SingleTreatment = function(treatment) {
    var treatmentText = '';

    if (treatment.concentration) {
        treatmentText += treatment.concentration + (treatment.concentration_units ? ' ' + treatment.concentration_units : '') + ' ';
    }
    treatmentText += treatment.treatment_term_name + (treatment.treatment_term_id ? ' (' + treatment.treatment_term_id + ')' : '') + ' ';
    if (treatment.duration) {
        treatmentText += 'for ' + treatment.duration + ' ' + (treatment.duration_units ? treatment.duration_units : '');
    }
    return treatmentText;
};


/**
 * Check if JS is processing on serverside, vs in browser (clientside).
 * Adapted from react/node_modules/fbjs/lib/ExecutionEnvironment.canUseDOM()
 *
 * @return {boolean} - True if processing on serverside.
 */
var isServerSide = module.exports.isServerSide = function(){
    if (typeof window == 'undefined' || !window || !window.document || !window.document.createElement){
        return true;
    }
    return false;
}


/**
 * Check if process.env.NODE_ENV is not on 'production'.
 *
 * @return {boolean} - True if NODE_ENV != 'production'.
 */
var isDebugging = module.exports.isDebugging = function(){
    // process.env.NODE_ENV is set in webpack.config.js if running 'npm run build'
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
        return false;
    }
    return true;
}

/**
 * Custom patched console for debugging. Only print out statements if debugging/development environment.
 * Prevent potential issues where console might not be available (earlier IE).
 */
var patchedConsole = module.exports.console = (function(){

    if (!isServerSide() && window.patchedConsole) return window.patchedConsole; // Re-use instance if available.

    var PatchedConsole = function(){
        this._initArgs = arguments; // arguments variable contains any arguments passed to function in an array.
        this._enabled = true; // Default
        this._available = true;

        if (typeof console === 'undefined' || typeof console.log === 'undefined' || typeof console.log.bind === 'undefined') { // Check for seldomly incompatible browsers
            this._available = false;
        }

        if (!isDebugging) {
            this._enabled = false; // Be silent on production.
        }

        this._nativeMethods = ['log', 'assert', 'dir', 'error', 'info', 'warn', 'clear', 'profile', 'profileEnd'];
        this._nativeConsole = console;
        this._dummyFunc = function(){return false;};

        this._setCustomMethods = function(){
            if (this._enabled && this._available && typeof this._nativeConsole.log !== 'undefined'){
                this.timeLog = function(){
                    this._nativeConsole.log.apply(
                        this._nativeConsole,
                        ['%c(' + moment().format('h:mm:ss.SSS') + ') %c%s'].concat(
                            'color: darkcyan',
                            'color: black',
                            Array.prototype.slice.apply(arguments)
                        )
                    )
                }.bind(this);
            } else {
                this.timeLog = this._dummyFunc;
            }
        }.bind(this);

        this._patchMethods = function(){
            this._nativeMethods.forEach(function(methodName){
                if (!this._enabled || !this._available || typeof this._nativeConsole[methodName] === 'undefined') {
                    this[methodName] = this._dummyFunc;
                } else {
                    this[methodName] = this._nativeConsole[methodName].bind(this._nativeConsole);
                }
            }.bind(this));
            this._setCustomMethods();
            return this;
        }.bind(this);

        // Ability to override, e.g. on production.
        this.on = function(){
            this._enabled = true;
            return this._patchMethods();
        }.bind(this);

        this.off = function(){
            this._enabled = false;
            return this._patchMethods();
        }.bind(this);

        this._patchMethods();
    }

    var patchedConsole = new PatchedConsole();

    if (!isServerSide()) {
        window.patchedConsole = patchedConsole;
    }
    return patchedConsole;
})();


var JWT = module.exports.JWT = {

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
            return null;
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
        if (source === 'localStorage' || source === 'all'){
            if(!JWT.storeExists()) {
                delete dummyStorage.user_info;
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


var setAjaxHeaders = function(xhr, headers = {}) {
    // Defaults
    headers = _.extend({
        "Content-Type" : "application/json; charset=UTF-8",
        "Accept" : "application/json",
        "X-Requested-With" : "XMLHttpRequest" // Allows some server-side libs (incl. pyramid) to identify using `request.is_xhr`.
    }, headers);

    // Add JWT if set
    JWT.addToHeaders(headers);

    // put everything in the header
    var headerKeys = Object.keys(headers);
    for (var i=0; i < headerKeys.length; i++){
        xhr.setRequestHeader(headerKeys[i], headers[headerKeys[i]]);
    }

    return xhr;
}


var ajaxLoad = module.exports.ajaxLoad = function(url, callback, method = 'GET', fallback = null, data = null, headers = {}){
    if (typeof window == 'undefined') return null;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE ) {
            if (xhr.status == 200) {
                if (typeof callback == 'function'){
                    callback(JSON.parse(xhr.responseText));
                }
            } else {
                var response;
                try {
                    response = JSON.parse(xhr.responseText);
                    (patchedConsole || console).error('ajaxLoad error: ', response);
                    if (typeof fallback == 'function') fallback(response);
                } catch (error) {
                    (patchedConsole || console).error('Non-JSON error response:', xhr.responseText);
                }
            }
        }
    };

    xhr.open(method, url, true);
    xhr = setAjaxHeaders(xhr, headers);

    if(data){
        xhr.send(data);
    }else{
        xhr.send();
    }
}

var ajaxPromise = module.exports.ajaxPromise = function(url, method = 'GET', headers = {}, data = null, cache = true, debugResponse = false){
    var xhr;
    var promise = new Promise(function(resolve, reject) {
        xhr = new XMLHttpRequest();
        xhr.onload = function() {
            // response SHOULD be json
            var response = JSON.parse(xhr.responseText);
            if (debugResponse) console.info('Received data from ' + method + ' ' + url + ':', response);
            resolve(response);
        };
        xhr.onerror = reject;
        if (cache === false && url.indexOf('format=json') > -1){
            url += '&ts=' + parseInt(Date.now());
        }
        xhr.open(method, url, true);
        xhr = setAjaxHeaders(xhr, headers);

        if(data){
            xhr.send(data);
        }else{
            xhr.send();
        }
        return xhr;
    });
    promise.xhr = xhr;
    promise.abort = function(){
        if (promise.xhr.readyState !== 4) promise.xhr.abort();
    };
    return promise;
}

/**
 * Find property within an object using a propertyName in object dot notation.
 * Recursively travels down object tree following dot-delimited property names.
 * If any node is an array, will return array of results.
 * 
 * @param {Object} object - Item to traverse or find propertyName in.
 * @param {string|string[]} propertyName - (Nested) property in object to retrieve, in dot notation or ordered array.
 * @return {*} - Value corresponding to propertyName.
 */

var getNestedProperty = module.exports.getNestedProperty = function(object, propertyName){

    if (typeof propertyName === 'string') propertyName = propertyName.split('.'); 
    if (!Array.isArray(propertyName)) throw new Error('Using improper propertyName in objectutils.getNestedProperty.');

    return (function findNestedValue(currentNode, fieldHierarchyLevels, level = 0){
        if (level == fieldHierarchyLevels.length) return currentNode;

        if (Array.isArray(currentNode)){
            var arrayVals = [];
            for (var i = 0; i < currentNode.length; i++){
                arrayVals.push( findNestedValue(currentNode[i], fieldHierarchyLevels, level) );
            }
            return arrayVals;
        } else {
            return findNestedValue(
                currentNode[fieldHierarchyLevels[level]],
                fieldHierarchyLevels,
                level + 1
            );
        }
    })(object, propertyName);

};

/**
 * Flatten any level/depth of arrays (e.g. as might be returned from @see getNestedProperty
 * if getting a property nested within array(s)) into a single one. Does not support
 * objects or sets, just arrays.
 * 
 * @param {*[]} arr - An array containing other arrays to flatten.
 * @return {*[]} - A shallow, flattened array.
 */
var flattenArrays = module.exports.flattenArrays = function(arr){
    if (arr.length > 0 && Array.isArray(arr[0])){
        return arr.reduce((a,b) => a.concat(flattenArrays(b)), []);
    } else return arr;
}


var DateUtility = module.exports.DateUtility = (function(){

    // ToDo : Handle locales (w/ moment)

    // Class itself, if need to create non-static instance at some point.
    var DateUtility = function(timestamp = null){};

    // Static Class Methods

    /**
     * Presets for date/time output formats for 4DN.
     * Uses bootstrap grid sizing name convention, so may utilize with responsiveGridState
     * to set responsively according to screen size, e.g. in a (debounced/delayed) window
     * resize event listener.
     *
     * @see responsiveGridState
     * @param {string} [formatType] - Key for date/time format to display. Defaults to 'date-md'.
     * @param {string} [dateTimeSeparator] - Separator between date and time if formatting a date-time. Defaults to ' '.
     */
    DateUtility.preset = function(formatType = 'date-md', dateTimeSeparator = " "){

        function date(ft){
            switch(ft){
                case 'date-xs':
                    // 11/03/2016
                    return "MM/DD/YYYY";
                case 'date-sm':
                    // Nov 3rd, 2016
                    return "MMM Do, YYYY";
                case 'date-md':
                    // November 3rd, 2016   (default)
                    return "MMMM Do, YYYY";
                case 'date-lg':
                    // Thursday, November 3rd, 2016
                    return "dddd, MMMM Do, YYYY";
            }
        }

        function time(ft){
            switch(ft){
                case 'time-xs':
                    // 12pm
                    return "ha";
                case 'time-sm':
                case 'time-md':
                    // 12:27pm
                    return "h:mma";
                case 'time-lg':
                    // 12:27:34 pm
                    return "h:mm:ss a";
            }
        }

        if (formatType.indexOf('date-time-') > -1){
            return date(formatType.replace('time-','')) + '[' + dateTimeSeparator + ']' + time(formatType.replace('date-',''));
        } else if (formatType.indexOf('date-') > -1){
            return date(formatType);
        } else if (formatType.indexOf('time-') > -1){
            return time(formatType);
        }
        return null;
    };

    DateUtility.display = function(momentObj, formatType = 'date-md', dateTimeSeparator = " ", localize = false, customOutputFormat = null){
        var outputFormat;
        if (customOutputFormat) {
            outputFormat = customOutputFormat;
        } else {
            outputFormat = DateUtility.preset(formatType, dateTimeSeparator);
        }
        if (localize){
            return momentObj.local().format(outputFormat);
        }

        return momentObj.format(outputFormat);
    };

    /**
     * Format a timestamp to pretty output. Uses moment.js, which uses Date() object in underlying code.
     * @see DateUtility.preset
     *
     * @param {string} timestamp - Timestamp as provided by server output. No timezone corrections currently.
     * @param {string} [formatType] - Preset format to use. Ignored if customOutputFormat is provided. Defaults to 'date-md', e.g. "October 31st, 2016".
     * @param {string} [dateTimeSeparator] - Separator between date & time if both are in preset formattype. Defaults to " ".
     * @param {boolean} [localize] - Output in local timezone instead of UTC.
     * @param {string} [customOutputFormat] - Custom format to use in lieu of formatType.
     * @return {string} Prettified date/time output.
     */

    DateUtility.format = function(timestamp, formatType = 'date-md', dateTimeSeparator = " ", localize = false, customOutputFormat = null){
        return DateUtility.display(moment.utc(timestamp), formatType, dateTimeSeparator, localize, customOutputFormat);
    };

    var React = require('react');

    DateUtility.LocalizedTime = React.createClass({
        
        propTypes : {
            momentDate : function(props, propName, componentName){
                if (props[propName] && !moment.isMoment(props[propName])){
                    return new Error("momentDate must be an instance of Moment.");
                }
            },
            timestamp : React.PropTypes.string,
            formatType : React.PropTypes.string,
            dateTimeSeparator : React.PropTypes.string,
            customOutputFormat : React.PropTypes.string,
            fallback : React.PropTypes.string,
            className : React.PropTypes.string
        },

        getDefaultProps: function(){
            return {
                momentDate : null,
                timestamp : null,
                formatType : 'date-md',
                dateTimeSeparator : ' ',
                customOutputFormat : null,
                fallback : "N/A",
                className : "localized-date-time"
            }
        },
        getInitialState : function(){
            return {
                moment : this.props.momentDate ? this.props.momentDate :
                    this.props.timestamp ? moment.utc(this.props.timestamp) : moment.utc(),
                mounted : false
            }
        },
        componentDidMount : function(){
            this.setState({ mounted : true });
        },
        render : function(){
            if (!this.state.mounted || isServerSide()) {
                return (
                    <span className={this.props.className + ' utc'}>{ 
                        DateUtility.display(
                            this.state.moment, 
                            this.props.formatType,
                            this.props.dateTimeSeparator,
                            false,
                            this.props.customOutputFormat
                        )
                    }</span>
                );
            } else {
                return (
                    <span className={this.props.className + ' local'}>{ 
                        DateUtility.display(
                            this.state.moment, 
                            this.props.formatType,
                            this.props.dateTimeSeparator,
                            true,
                            this.props.customOutputFormat
                        )
                    }</span>
                );
            }
        }
    });

    return DateUtility;
})();


/**
 * Check width of text or text-like content if it were to fit on one line.
 * @param {string} textContent - Either text or text-like content, e.g. with span elements.
 * @param {string} [containerElementType] - Type of element to fit into, e.g. 'div' or 'p'.
 * @param {string} [containerClassName] - ClassName of containing element, e.g. with 'text-large' to use larger text size.
 * @param {integer} [widthForHeightCheck] - If provided, will return an object which will return height of text content when constrained to width.
 * @return {integer|Object} - Width of text if whitespace style set to nowrap, or object containing 'containerHeight' & 'textWidth' if widthForHeightCheck is set.
 */
var textContentWidth = module.exports.textContentWidth = function(
    textContent,
    containerElementType = 'div',
    containerClassName = '',
    widthForHeightCheck = null
){
    if (isServerSide()){
        return null;
    };
    var contElem = document.createElement(containerElementType);
    contElem.className = "off-screen " + containerClassName;
    contElem.innerHTML = textContent;
    contElem.style.whiteSpace = "nowrap";
    document.body.appendChild(contElem);
    var textLineWidth = contElem.clientWidth;
    var fullContainerHeight;
    if (widthForHeightCheck){
        contElem.style.whiteSpace = "";
        contElem.style.display = "block";
        contElem.style.width = widthForHeightCheck + "px";
        fullContainerHeight = contElem.clientHeight;
    }
    document.body.removeChild(contElem);
    if (fullContainerHeight) {
        return { containerHeight : fullContainerHeight, textWidth : textLineWidth };
    }
    return textLineWidth;
}

/**
 * Get the width of what a 12-column bootstrap section would be in current viewport size.
 * Keep widths in sync with stylesheet, e.g.
 * $container-tablet - $grid-gutter-width,
 * $container-desktop - $grid-gutter-width, and
 * $container-large-desktop - $grid-gutter-width
 * in src/encoded/static/scss/bootstrap/_variables.scss.
 *
 * @return {integer}
 */
var gridContainerWidth = module.exports.gridContainerWidth = function(){
    // Subtract 20 for padding/margins.
    switch(responsiveGridState()){
        case 'lg': return 1140;
        case 'md': return 940;
        case 'sm': return 720;
        case 'xs':
            if (isServerSide()) return 400;
            return window.innerWidth - 20;
    }

};

/**
 * Get current grid size, if need to sidestep CSS.
 * Keep widths in sync with stylesheet, e.g. $screen-sm-min, $screen-md-min, & $screen-lg-min
 * in src/encoded/static/scss/bootstrap/_variables.scss.
 *
 * @return {string} - Abbreviation for column/grid Bootstrap size, e.g. 'lg', 'md', 'sm', or 'xs'.
 */

var responsiveGridState = module.exports.responsiveGridState = function(){
    if (isServerSide()) return 'lg';
    if (window.innerWidth >= 1200) return 'lg';
    if (window.innerWidth >= 992) return 'md';
    if (window.innerWidth >= 768) return 'sm';
    return 'xs';
};
