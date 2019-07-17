'use strict';

/**
 * A directory of methods and maybe a mini-component or two for common use.
 *
 * @module util
 */


// Navigation
export { navigate } from './navigate';

// Type definitions
import * as typeDefinitions from './typedefs';
export const typedefs = typeDefinitions;

import * as SchemaUtilities from './Schemas';
export const Schemas = SchemaUtilities;

// Transforms, manipulations, parsers, etc. re: objects.
import * as fileUtilities from './file';
export const fileUtil = fileUtilities;

import * as SearchEngineOptimizationUtilities from './seo';
export const SEO = SearchEngineOptimizationUtilities;
