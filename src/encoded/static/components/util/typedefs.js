'use strict';

/**
 * Various type definitions used throughout documentation.
 *
 * @module
 */



// ----------------------------------------------------------------------------
// Common type-defs, e.g. for Item, JSONContentResponse, SearchResponse.

/**
 * A JSON response from the server. Any response should contain an ID, a type, and likely a display title.
 * 
 * @typedef {Object} JSONContentResponse
 * @property {string} @id - Identifier and/or URL to Item or response endpoint.
 * @property {string[]} @type - List of `@type` strings for Item, endpoint, etc.
 * @property {string} [display_title] - Title for Item or page.
 */
export var JSONContentResponse;


/**
 * @typedef {JSONContentResponse} Item
 * @property {string}       @id             Identifier and/or URL to Item.
 * @property {string}       display_title   Title for Item.
 * @property {string[]}     [@type]         List of `@type` strings for Item.
 * @property {string}       [uuid]          DB Identifier for Item.
 * @property {string}       [status]        Current status of Item.
 * @property {string}       [date_created]  Date Item was added to database.
 */
export var Item;


/**
 * @typedef {Object} URLParts
 * @property {string}       host            Full lower-cased host portion of the URL, including the port if specified.
 * @property {string}       hostname        Lower-cased host name portion of the host component without the port included.
 * @property {string}       href            Full URL string that was parsed with both the protocol and host components converted to lower-case.
 * @property {string}       path            Concatenation of the pathname and search components.
 * @property {string}       pathname        Entire path section of the URL. This is everything following the host (including the port) and before the start of the query or hash components, delimited by either the ASCII question mark (?) or hash (#) characters.
 * @property {string}       [hash]          Fragment identifier portion of the URL, including the leading # character.
 * @property {number}       [port]          Numeric port portion of the host component.
 * @property {string}       [protocol]      Identifies the URL's lower-cased protocol scheme, e.g. "https:".
 * @property {string|Object}[query]         Query string without the leading ASCII question mark (?) or object as if string is parsed through `queryString.parse`.
 * @property {string}       [search]        Entire "query string" portion of the URL, including the leading ASCII question mark (?) character.
 *
 * @see https://nodejs.org/docs/latest/api/url.html#url_legacy_urlobject
 */
export var URLParts;


// ----------------------------------------------------------------------------
// Item Related Type-Defs


/**
 * @typedef {Item} StaticSection
 * @property {string}       content         Content of the static section.
 * @property {string}       [filetype=text] Format of the content. Could be 'md', 'html', 'text', 'code', etc.
 */
export var StaticSection;


/**
 * @typedef {Item} StaticPage
 * @property {string}               @id         URI/ID of current page. May differ from database-item `@ID`.
 * @property {StaticSection[]}      content     List of sections which make up page.
 * @property {StaticPage}           [parent]    Recursing reference to a parent Page.
 * @property {StaticPage}           [previous]  Reference to previous sibling page.
 * @property {StaticPage}           [next]      Reference to previous sibling page.
 * @property {{ enabled: boolean }} toc         Options for table of contents.
 */
export var StaticPage;

/**
 * An object containing data to fully represent a tab of a tab view.
 *
 * @typedef {Object} TabObject
 * @property {string}               key         Unique key for the tab. Sent to `DefaultItemView.setTabViewKey` for example to change tab.
 * @property {string|JSX.Element}   tab         Contents or title of the visible clickable tab. Often is a span wrapping icon + text.
 * @property {boolean}              [disabled]  If true, the tab is grayed out and not clickable. Use for when contents of a tab are loading in via AJAX, or when data in a tab __should__ be available but is not.
 * @property {JSX.Element}          content     Contents of the tab view. Should be a div with overflow: hidden style as wrapper.
 * @example
 *      {
 *          tab : <span><i className="icon icon-users icon-fw"/> Attribution</span>,
 *          key : "attribution",
 *          disabled : (!context.lab && !context.award && !context.submitted_by),
 *          content : (
 *              <div className="overflow-hidden">
 *                  <h3 className="tab-section-title">
 *                      <span>Attribution</span>
 *                  </h3>
 *                  <hr className="tab-section-title-horiz-divider mb-1"/>
 *                  <AttributionTabView context={context} />
 *              </div>
 *          )
 *      }
 */
export var TabObject;


// ----------------------------------------------------------------------------
// Browse/Search Related Type-Defs


/**
 * A JSON response from the back-end that represents a search query result.
 *
 * @typedef {JSONContentResponse} SearchResponse
 * @property {{ field: string, term: string }[]} filters - Filters set on a search or browse request.
 * @property {number} total - Total number of results expected for query.
 */
export var SearchResponse;


/**
 * @typedef {function} ColumnDefinitionRenderFxn
 * @param {Item} result - Item from search result. Not parsed in any way.
 * @param {ColumnDefinition} columnDefinition - Rest of columndefinition. Includes recursive render to self via 'render'.
 * @param {Object} props - Component props of component rendering the table or columns.
 * @param {number} width - Current width of column.
 * @example
 *      function(result, columnDefinition, props, width){
 *          if (!result.last_modified) return null;
 *          if (!result.last_modified.date_modified) return null;
 *          return <DateUtility.LocalizedTime timestamp={result.last_modified.date_modified} formatType='date-sm' />;
 *      }
 */

/**
 * A JSON object which contains some properties that define a renderable column.
 *
 * @typedef {Object} ColumnDefinition
 * @property {string} field - Field name, as can be evaluated by ElasticSearch.
 * @property {string} title - Title to appear at top of column, in facet, etc.
 * @property {number} [minColumnWidth] - Minimum width of column, in pixels.
 * @property {{ sm: number, md: number, lg: number }} [widthMap] - Default width (before sizing) per response-width level.
 * @property {ColumnDefinitionRenderFxn} [render] - Optional function to render column in some custom way, for example in order to format a date-time value. 
 */
export var ColumnDefinition;



// ----------------------------------------------------------------------------
// Common-ish type-defs


/**
 * Options to pass to the `util.navigate` function.
 *
 * @typedef {Object} NavigateOpts
 * @property {boolean} inPlace              Don't cancel out if loading same HREF/URL (e.g. allow refresh).
 * @property {boolean} replace              Replace Browser History entry with new HREF/URL instead of adding.
 * @property {boolean} skipConfirmCheck
 * @property {boolean} skipRequest          Don't perform request, just change URL.
 * @property {boolean} skipUpdateHref       Fetch/request new context, but don't update URL.
 * @property {boolean} cache                Set to false to explicitly not cache response. Shouldn't be necessary (browser does this by default).
 * @property {boolean} dontScrollToTop      Don't scroll to top of page after completion.
 */

/**
 * @typedef {Object} AlertObj - Object used to represent alert message element contents at top of page.
 * @property {string} title                 Title to be shown at top of alert box.
 * @property {string|JSX.Element} message   Message to be shown in body of alert box. May be JSX if no plans for alert to be rendered server-side.
 * @property {?string} style                Style of alert box. May be any Bootstrap-compliant style, e.g. "danger", "warning", "info".
 * @property {number} [navigateDisappearThreshold=1] - After how many navigations should this alert be automatically removed.
 */
export var AlertObj;