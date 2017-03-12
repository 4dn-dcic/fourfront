'use strict';

/**
 * A directory of methods and maybe a mini-component or two for common use.
 * 
 * @module item-pages/components
 */

/** @alias FormattedInfoBlock */
module.exports.FormattedInfoBlock = require('./FormattedInfoBlock');

/** @alias ItemHeader */
module.exports.ItemHeader = require('./ItemHeader');

/** @alias PartialList */
module.exports.PartialList = require('./PartialList');

/** @alias ExternalReferenceLink */
module.exports.ExternalReferenceLink = require('./ExternalReferenceLink');

/**
 * Component for displaying Files from a list.
 * 
 * @namespace
 * @type {Component}
 * @prop {Object[]} files - List of file objects, e.g. a FileCalbirationSet's 'files_in_set' property.
 */
module.exports.FilesInSetTable = require('./FilesInSetTable');

/** @alias ItemFooterRow */
module.exports.ItemFooterRow = require('./ItemFooterRow');
