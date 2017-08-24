'use strict';

var moment = require('moment');
var { isServerSide } = require('./misc');

/**
 * Custom patched console instance for debugging. Only print out statements if debugging/development environment.
 * Prevent potential issues where console might not be available (earlier IE).
 * 
 * @example
 * <caption>Usage:</caption>
 * import { console } from './util';
 * - or -
 * var { console } = require('./util');
 * - or (from same/local directory) -
 * var console = require('./patched-console').default;
 */
const patchedConsoleInstance = (function(){

    if (!isServerSide() && window.patchedConsole) return window.patchedConsole; // Re-use instance if available.

    var PatchedConsole = function(){

        /**
         * Check if process.env.NODE_ENV is not on 'production'.
         *
         * @return {boolean} - True if NODE_ENV != 'production'.
         */
        this.isDebugging = function(){
            // process.env.NODE_ENV is set in webpack.config.js if running 'npm run build'
            if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
                return false;
            }
            return true;
        };

        this._initArgs = arguments; // arguments variable contains any arguments passed to function in an array.
        this._enabled = true; // Default
        this._available = true;

        if (typeof console === 'undefined' || typeof console.log === 'undefined' || typeof console.log.bind === 'undefined') { // Check for seldomly incompatible browsers
            this._available = false;
        }

        if (!this.isDebugging()) {
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
                    );
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
    };

    var patchedConsole = new PatchedConsole();

    if (!isServerSide()) {
        window.patchedConsole = patchedConsole;
    }
    return patchedConsole;
})();

export default patchedConsoleInstance;
