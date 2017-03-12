'use strict';

/**
 * A directory of methods and maybe a mini-component or two for common use.
 * 
 * @module item-pages/components
 */

/** @alias FormattedInfoBlock */
module.exports.FormattedInfoBlock = require('./FormattedInfoBlock');

/**
 * Object containing components required to build header shown on Item pages.
 * Includes title, description, date created, status, action buttons, [...].
 * 
 * Use by combining other components together within an ItemHeader.Wrapper component. See example.
 * 
 * @namespace
 * @type {Object}
 * @example
 * <ItemHeader.Wrapper className="exp-set-header-area" context={this.props.context} href={this.props.href}>
 *     <ItemHeader.TopRow>
 *         <span data-tip="Experiment Type" className="inline-block">
 *             { this.props.context.experimentset_type }
 *         </span>
 *     </ItemHeader.TopRow>
 *     <ItemHeader.MiddleRow />
 *     <ItemHeader.BottomRow />
 * </ItemHeader.Wrapper>
 */
module.exports.ItemHeader = require('./ItemHeader');

/**
 * Renders a list using elements along the Bootstrap grid.
 * Takes two lists as props: 'persistent' and 'collapsible'. 
 * Persistent items are always visible, while collapsible are only shown if props.open is true.
 * 
 * @namespace
 * @type {Component}
 * @prop {Component[]|Element[]|string[]} persistent - React elements or components to always render. 
 * @prop {Component[]|Element[]|string[]} collapsible - React elements or components to render conditionally.
 * @prop {boolean} open - Show collapsed items or not.
 * @prop {string} className - Class name for outermost element.
 */
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

/**
 * Component for showing Aliases, External References, etc.
 * Shown at bottom of Item pages.
 * 
 * @namespace
 * @type {Component}
 * @prop {Object} context - JSON representation of current Item object. Should be available through Redux store's context.
 */
module.exports.ItemFooterRow = require('./ItemFooterRow');
