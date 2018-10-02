'use strict';

/**
 * A directory of methods and maybe a mini-component or two for common use.
 *
 * @module util
 */


// Misc functions are top-level
export { isServerSide } from './misc';


// Transforms, manipulations, parsers, etc. re: objects.
import * as objectMethods from './object';
export const object = objectMethods;


// Navigation
export { navigate } from './navigate';


// Analytics
import * as analyticsMethods from './analytics';
export const analytics = analyticsMethods;


// Layout
import * as layoutMethods from './layout';
export const layout = layoutMethods;


// AJAX
import * as ajaxMethods from './ajax';
export const ajax = ajaxMethods;


// Patches over browser window's console and disables logging (e.g. console.log) on production. Just import from this module to patch.
import patchedConsoleInstance from './patched-console';
export const console = patchedConsoleInstance;


// Type definitions
import * as typeDefinitions from './typedefs';
export const typedefs = typeDefinitions;


// Functions related to JWT encoding/decoding/storage. Prevent name interference with 'jwt' NPM package.
import * as JWTMethods from './json-web-token';
export const JWT = JWTMethods;


// Use momentjs to parse and localize datetime.
// Has useful React component - DateUtility.LocalizedTime - which shows time in user's timezone after mount.
import * as DateUtilities from './date-utility';
export const DateUtility = DateUtilities;


import * as experimentTransformFunctions from './experiments-transforms';
export const expFxn = experimentTransformFunctions;


import * as experimentFilters from './experiments-filters';
export const Filters = experimentFilters;


import * as SchemaUtilities from './Schemas';
export const Schemas = SchemaUtilities;


// Transforms, manipulations, parsers, etc. re: objects.
import * as fileUtilities from './file';
export const fileUtil = fileUtilities;

import * as SearchEngineOptimizationUtilities from './seo';
export const SEO = SearchEngineOptimizationUtilities;
