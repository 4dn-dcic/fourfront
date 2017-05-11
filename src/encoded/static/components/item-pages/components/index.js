'use strict';

/**
 * A directory of methods and maybe a mini-component or two for common use.
 *
 * @module item-pages/components
 */

/**
 * Formats a lab, award, or potentially other object to appear in a small rectangle that can be included in a sidebar.
 * Also offers mix-in functions to help AJAX in the required details to the parent component's state.
 *
 * Also contains FormattedInfoBlock.List which is meant to display a list of FormattedInfoBlocks, and potentially AJAX in details for them.
 *
 * @namespace
 * @type {Component}
 */
module.exports.FormattedInfoBlock = require('./FormattedInfoBlock');


import ItemPageTitle, { getBaseItemType, getTitleStringFromContext, getBaseItemTypeTitle, isDisplayTitleAccession } from './ItemPageTitle';
module.exports.ItemPageTitle = ItemPageTitle;


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

module.exports.PartialList = require('./PartialList').default;

/**
 * Used in Component module:item-pages/components.ItemFooterRow to display an external reference link.
 *
 * @namespace
 * @type {Component}
 * @prop {Component[]|Element[]|string[]} children - Inner contents or title of link.
 * @prop {string} uri - The href for the link.
 */
module.exports.ExternalReferenceLink = require('./ExternalReferenceLink');

/**
 * Component for displaying Files from a list.
 *
 * @namespace
 * @type {Component}
 * @prop {Object[]} files - List of file objects, e.g. a FileCalbirationSet's 'files_in_set' property.
 */
module.exports.FilesInSetTable = require('./FilesInSetTable');

module.exports.ItemFooterRow = require('./ItemFooterRow').default;

/**
 * Shows publications for current Item.
 * Currently, only ExperimentSet seems to have publications so this is present only on Component module:item-pages/experiment-set-view .
 *
 * @namespace
 * @type {Component}
 * @prop {Object[]|null} publications - JSON representation of publications. Should be available through context.publications_of_set for at least ExperimentSet objects.
 */
module.exports.Publications = require('./Publications').default;

/**
 * @namespace
 * @type {Component}
 * @prop {Object[]} contents - List of objects for tabs containing 'tab', 'content', and maybe 'key'.
 */
module.exports.TabbedView = require('./TabbedView').default;

/**
 * A list of properties which belong to Item shown by ItemView.
 * Shows 'persistentKeys' fields & values stickied near top of list,
 * 'excludedKeys' never, and 'hiddenKeys' only when "See More Info" button is clicked.
 *
 * @namespace
 * @type {Component}
 */
module.exports.ItemDetailList = require('./ItemDetailList').default;

/**
 * The list of properties contained within ItemDetailList.
 * Isolated to allow use without existing in ItemDetailList parent.
 *
 * @namespace
 * @type {Component}
 */
module.exports.Detail = require('./ItemDetailList').Detail;

/**
 * @namespace
 * @type {Component}
 */
module.exports.AuditView = require('./AuditView').default;
