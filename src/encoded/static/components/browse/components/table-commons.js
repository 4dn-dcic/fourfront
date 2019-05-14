'use strict';

/* @flow */

import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import memoize from 'memoize-one';
import queryString from 'querystring';
import { Collapse, Fade } from 'react-bootstrap';
import ReactTooltip from 'react-tooltip';
import Draggable from 'react-draggable';
import { Sticky, StickyContainer } from 'react-sticky';
import { Detail } from './../../item-pages/components';
import { isServerSide, Filters, navigate, object, layout, Schemas, DateUtility, ajax, analytics, typedefs, expFxn } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { ColumnSorterIcon } from './LimitAndPageControls';

var { Item, ColumnDefinition } = typedefs;

export const DEFAULT_WIDTH_MAP = { 'lg' : 200, 'md' : 180, 'sm' : 120, 'xs' : 120 };

/**
 * Default value rendering function.
 * Uses columnDefinition field (column key) to get nested property value from result and display it.
 *
 * @param {Item} result - JSON object representing row data.
 * @param {ColumnDefinition} columnDefinition - Object with column definition data - field, title, widthMap, render function (self)
 * @param {Object} props - Props passed down from SearchResultTable/ResultRowColumnBlock instance.
 * @param {number} width - Unused. Todo - remove?
 * @returns {string|null} String value or null. Your function may return a React element, as well.
 */
export function defaultColumnBlockRenderFxn(result, columnDefinition, props, width){

    function filterAndUniq(vals){
        return _.uniq(_.filter(vals, function(v){
            return v !== null && typeof v !== 'undefined';
        }));
    }

    var value = object.getNestedProperty(result, columnDefinition.field, true);
    if (!value) value = null;
    if (Array.isArray(value)){ // getNestedProperty may return a multidimensional array, # of dimennsions depending on how many child arrays were encountered in original result obj.
        value = filterAndUniq(_.map(value, function(v){
            if (Array.isArray(v)){
                v = filterAndUniq(v);
                if (v.length === 1) v = v[0];
                if (v.length === 0) v = null;
            }
            return Schemas.Term.toName(columnDefinition.field, v);
        })).join(', ');
    } else {
        value = Schemas.Term.toName(columnDefinition.field, value);
    }
    return value;
}



/**
 * Ensure we have a valid React element to render.
 * If not, try to detect if Item object, and generate link.
 * Else, let exception bubble up.
 *
 * @static
 * @param {any} value - Value to sanitize.
 */
export function sanitizeOutputValue(value){
    if (typeof value !== 'string' && !React.isValidElement(value)){
        if (value && typeof value === 'object'){
            if (typeof value.display_title !== 'undefined'){
                const atId = object.itemUtil.atId(value);
                if (atId){
                    return <a href={atId}>{ value.display_title }</a>;
                } else {
                    return value.display_title;
                }
            }
        } else if (!value) value = null;
    }
    if (value === "None") value = null;
    return value;
}


export class TableRowToggleOpenButton extends React.PureComponent {
    render(){
        return (
            <div className="inline-block toggle-detail-button-container">
                <button type="button" className="toggle-detail-button" onClick={this.props.onClick || this.props.toggleDetailOpen}>
                    <div className="icon-container">
                        <i className={"icon icon-fw icon-" + (this.props.open ? 'minus' : 'plus') }/>
                    </div>
                </button>
            </div>
        );
    }
}



export const defaultColumnExtensionMap = {
    'display_title' : {
        'title' : "Title",
        'widthMap' : {'lg' : 280, 'md' : 250, 'sm' : 200},
        'minColumnWidth' : 90,
        'order' : -100,
        'render' : function renderDisplayTitleColumn(result, columnDefinition, props, width, popLink = false){
            var title = object.itemUtil.getTitleStringFromContext(result),
                link = object.itemUtil.atId(result),
                tooltip,
                hasPhoto = false;

            /** Registers a list click event for Google Analytics then performs navigation. */
            function handleClick(evt){
                var tableType = navigate.isBrowseHref(props.href) ? 'browse' : (navigate.isSearchHref(props.href) ? 'search' : 'other');
                if (tableType === 'browse' || tableType === 'search'){
                    evt.preventDefault();
                    evt.stopPropagation();
                    analytics.productClick(result, {
                        'list'      : tableType === 'browse' ? 'Browse Results' : (props.currentAction === 'selection' ? 'Selection Search Results' : 'Search Results'),
                        'position'  : props.rowNumber + 1
                    }, function(){
                        (props.navigate || navigate)(link);
                    });
                    return false;
                } else {
                    return true;
                }
            }

            if (title && (title.length > 20 || width < 100)) tooltip = title;
            if (link){ // This should be the case always
                title = <a key="title" href={link || '#'} children={title} onClick={handleClick} />;
                if (typeof result.email === 'string' && result.email.indexOf('@') > -1){
                    // Specific case for User items. May be removed or more cases added, if needed.
                    hasPhoto = true;
                    title = (
                        <span key="title">
                            { object.itemUtil.User.gravatar(result.email, 32, { 'className' : 'in-search-table-title-image', 'data-tip' : result.email }, 'mm') }
                            { title }
                        </span>
                    );
                }
            }

            return (
                <span>
                    <TableRowToggleOpenButton open={props.detailOpen} onClick={props.toggleDetailOpen} />
                    <div key="title-container" className={"title-block" + (hasPhoto ? ' has-photo' : " text-ellipsis-container")} data-tip={tooltip}>{ title }</div>
                </span>
            );
        }
    },
    '@type' : {
        'noSort' : true,
        'order' : -80,
        'render' : function(result, columnDefinition, props, width){
            if (!Array.isArray(result['@type'])) return null;
            var leafItemType    = Schemas.getItemType(result),
                itemTypeTitle   = Schemas.getTitleForType(leafItemType, props.schemas || null),
                onClick         = function(e){
                    // Preserve search query, if any, but remove filters (which are usually per-type).
                    if (!props.href || props.href.indexOf('/search/') === -1) return;
                    e.preventDefault();
                    e.stopPropagation();
                    var urlParts = url.parse(props.href, true),
                        query = { 'type' : leafItemType };
                    if (urlParts.query.q) query.q = urlParts.query.q;
                    var nextHref = '/search/?' + queryString.stringify(query);
                    (props.navigate || navigate)(nextHref);
                };

            return (
                <React.Fragment>
                    <i className="icon icon-fw icon-filter clickable" onClick={onClick} data-tip="Filter down to this item type only."/>&nbsp;&nbsp;
                    { itemTypeTitle }
                </React.Fragment>
            );
        }
    },
    'lab.display_title' : {
        'title' : "Lab",
        'widthMap' : {'lg' : 200, 'md' : 180, 'sm' : 160},
        'render' : function labTitle(result, columnDefinition, props, width, popLink = false){
            var labItem = result.lab;
            if (!labItem) return null;
            var labLink;
            if (popLink){
                labLink = <a href={object.atIdFromObject(labItem)} target='_blank' rel="noopener noreferrer">{ labItem.display_title }</a>;
            }else{
                labLink = <a href={object.atIdFromObject(labItem)}>{ labItem.display_title }</a>;
            }

            if (!result.submitted_by || !result.submitted_by.display_title){
                return labLink;
            }
            return (
                <span>
                    <i className="icon icon-fw icon-user-o user-icon" data-html data-tip={'<small>Submitted by</small> ' + result.submitted_by.display_title} />
                    { labLink }
                </span>
            );
        }
    },
    'track_and_facet_info.lab_name' : {
        'render' : function(result, columnDefinition, props, width, popLink = false){
            if ( // If same exact lab name as our lab.display_title, then we just use lab render method to get link to lab.
                result.track_and_facet_info && result.track_and_facet_info.lab_name && result.track_and_facet_info.lab_name
                && result.lab && result.lab.display_title && result.lab.display_title === result.track_and_facet_info.lab_name
            ){
                return defaultColumnExtensionMap['lab.display_title'].render.apply(null, Array.from(arguments));
            } else {
                return (result.track_and_facet_info && result.track_and_facet_info.lab_name) || null;
            }
        }
    },
    'date_created' : {
        'title' : 'Date Created',
        'colTitle' : 'Created',
        'widthMap' : {'lg' : 140, 'md' : 120, 'sm' : 120},
        'render' : function dateCreatedTitle(result, columnDefinition, props, width){
            if (!result.date_created) return null;
            return <DateUtility.LocalizedTime timestamp={result.date_created} formatType='date-sm' />;
        },
        'order' : 510
    },
    'last_modified.date_modified' : {
        'title' : 'Date Modified',
        'widthMap' : {'lg' : 140, 'md' : 120, 'sm' : 120},
        'render' : function lastModifiedDate(result, columnDefinition, props, width){
            if (!result.last_modified) return null;
            if (!result.last_modified.date_modified) return null;
            return <DateUtility.LocalizedTime timestamp={result.last_modified.date_modified} formatType='date-sm' />;
        },
        'order' : 515
    },
    'date_published' : {
        'widthMap' : {'lg' : 140, 'md' : 120, 'sm' : 120},
        'render' : function(result, columnDefinition, props, width){
            if (!result.date_published) return null;
            return DateUtility.formatPublicationDate(result.date_published);
        },
        'order' : 504
    },
    'public_release' : {
        'widthMap' : {'lg' : 140, 'md' : 120, 'sm' : 120},
        'render' : function publicRelease(result, columnDefinition, props, width){
            if (!result.public_release) return null;
            return <DateUtility.LocalizedTime timestamp={result.public_release} formatType='date-sm' />;
        },
        'order' : 505
    },
    'number_of_experiments' : {
        'title' : '# of Experiments',
        'widthMap' : {'lg' : 68, 'md' : 68, 'sm' : 50},
        'render' : function numberOfExperiments(expSet, columnDefinition, props, width){
            var number_of_experiments = parseInt(expSet.number_of_experiments);

            if (isNaN(number_of_experiments) || !number_of_experiments){
                number_of_experiments = (Array.isArray(expSet.experiments_in_set) && expSet.experiments_in_set.length) || null;
            }
            if (!number_of_experiments){
                number_of_experiments = 0;
            }

            return <span key="val">{ number_of_experiments }</span>;
        }
    },
    'number_of_files' : {
        'title' : '# of Files',
        'noSort' : true,
        'widthMap' : {'lg' : 60, 'md' : 50, 'sm' : 50},
        'render' : function numberOfFiles(expSet, columnDefinition, props, width){

            var number_of_files = parseInt(expSet.number_of_files); // Doesn't exist yet at time of writing

            if (isNaN(number_of_files) || !number_of_files){
                number_of_files = expFxn.fileCountFromExperimentSet(expSet, true, false);
            }
            if (!number_of_files){
                number_of_files = 0;
            }

            return <span key="val">{ number_of_files }</span>;
        }

    },
    'google_analytics.for_date' : {
        'title' : 'Analytics Date',
        'widthMap' : {'lg' : 140, 'md' : 120, 'sm' : 120},
        'render' : function googleAnalyticsDate(result, columnDefinition, props, width){
            if (!result.google_analytics || !result.google_analytics.for_date) return null;
            return <DateUtility.LocalizedTime timestamp={result.google_analytics.for_date} formatType='date-sm' localize={false} />;
        }
    },
    'status' : {
        'title' : 'Status',
        'widthMap' : {'lg' : 120, 'md' : 120, 'sm' : 100},
        'order' : 501,
        'render' : function statusIndicator(result, columnDefinition, props, width){
            var statusFormatted = Schemas.Term.toName('status', result.status);
            return (
                <React.Fragment>
                    <i className="item-status-indicator-dot" data-status={result.status}/>
                    { statusFormatted }
                </React.Fragment>
            );
        }
    },
    'experiments_in_set.experiment_categorizer.combined' : {
        'title' : "Assay Details",
        'render' : function experimentCategorizer(result, columnDefinition, props, width){
            // We have arrays here because experiments_in_set is array.
            var cat_value = _.uniq(object.getNestedProperty(result, 'experiments_in_set.experiment_categorizer.value', true)).join('; ');
            var cat_field = _.uniq(object.getNestedProperty(result, 'experiments_in_set.experiment_categorizer.field', true))[0];
            if (cat_value === 'No value' || !cat_value){
                return null;
            }
            return (
                <div className="exp-categorizer-cell">
                    <small>{ cat_field }</small>
                    <div className="text-ellipsis-container">{ cat_value }</div>
                </div>
            );
        }
    },
    'workflow.title' : {
        'title' : "Workflow",
        'render' : function(result, columnDefinition, props, width){
            if (!result.workflow || !result.workflow.title) return null;
            var title = result.workflow.title,
                link = object.itemUtil.atId(result.workflow);

            if (link){
                return <a href={link}>{ title }</a>;
            } else {
                return title;
            }
        }
    }
};


/**
 * Should handle and fail cases where context and columns object reference values
 * have changed, but not contents. User-selected columns should be preserved upon faceting
 * or similar filtering, but be updated when search type changes.
 *
 * Used as equality checker for `columnsToColumnDefinitions` `columns` param memoization as well.
 *
 * @param {Object.<Object>} cols1 Previous object of columns, to be passed in from a lifecycle method.
 * @param {Object.<Object>} cols2 Next object of columns, to be passed in from a lifecycle method.
 *
 * @returns {boolean} If context columns have changed, which should be about same as if type has changed.
 */
export function haveContextColumnsChanged(cols1, cols2){
    if (cols1 === cols2) return false;
    if (cols1 && !cols2) return true;
    if (!cols1 && cols2) return true;
    var pKeys       = _.keys(cols1),
        pKeysLen    = pKeys.length,
        nKeys       = _.keys(cols2),
        i;

    if (pKeysLen !== nKeys.length) return true;
    for (i = 0; i < pKeysLen; i++){
        if (pKeys[i] !== nKeys[i]) return true;
    }
    return false;
}


/**
 * Convert a map of field:title to list of column definitions, setting defaults.
 *
 * @param {Object.<string>} columns         Map of field names to field/column titles, as returned from back-end.
 * @param {Object} columnDefinitionMap      Map of field names to extra column properties such 'render', 'title', 'widthMap', etc.
 * @param {Object[]} constantDefinitions    Preset list of column definitions, each containing at least 'field' and 'title'.
 * @param {Object} defaultWidthMap          Map of responsive grid states (lg, md, sm) to pixel number sizes.
 * @returns {Object[]}                      List of objects containing keys 'title', 'field', 'widthMap', and 'render'.
 */
export const columnsToColumnDefinitions = memoize(function(columns, columnDefinitionMap, defaultWidthMap = DEFAULT_WIDTH_MAP){
    var uninishedColumnDefinitions = _.map(
        _.pairs(columns),
        function([field, columnProperties]){
            return _.extend({ field }, columnProperties);
        }
    );

    var columnDefinitions = _.map(uninishedColumnDefinitions, function(colDef, i){
        var colDefOverride = columnDefinitionMap && columnDefinitionMap[colDef.field];
        if (colDefOverride){
            var colDef2 = _.extend({}, colDefOverride, colDef);
            colDef = colDef2;
        }
        // Add defaults for any required-for-view but not-present properties.
        if (colDef.widthMap && colDef.widthMap.sm && typeof colDef.widthMap.xs !== 'number'){
            colDef.widthMap.xs = colDef.widthMap.sm;
        }
        colDef.widthMap = colDef.widthMap || defaultWidthMap;
        colDef.render   = colDef.render || defaultColumnBlockRenderFxn;
        colDef.order    = typeof colDef.order === 'number' ? colDef.order : i;

        return colDef;
    });

    return _.sortBy(columnDefinitions, 'order');
});


export const defaultHiddenColumnMapFromColumns = memoize(function(columns){
    var hiddenColMap = {};
    _.forEach(_.pairs(columns), function([ field, columnDefinition ]){
        if (columnDefinition.default_hidden){
            hiddenColMap[field] = true;
        } else {
            hiddenColMap[field] = false;
        }
    });
    return hiddenColMap;
}, function(newArgs, lastArgs){
    // We allow different object references to be considered equal as long as their values are equal.
    return !haveContextColumnsChanged(lastArgs[0], newArgs[0]);
});

/**
 * Adds a `baseWidth` property to each columnDefinition based off widthMap or default value (100).
 */
export const columnDefinitionsToScaledColumnDefinitions = memoize(function(columnDefinitions){
    return _.map(columnDefinitions, function(colDef){
        var colDef2 = _.clone(colDef);
        colDef2.baseWidth = colDef.widthMap.sm || colDef.widthMap.md || colDef.widthMap.lg || 100;
        if (typeof colDef.render !== 'function'){
            colDef2.render = defaultColumnBlockRenderFxn;
        }
        return colDef2;
    });
});


/**
 * Determine the typical column width, given current browser width. Defaults to large width if server-side.
 *
 * @param {ColumnDefinition} columnDefinition - JSON of column definition, should have widthMap or width or baseWidth.
 * @param {Object} columnDefinition.widthMap - Map of integer sizes to use at 'lg', 'md', or 'sm' sizes.
 * @param {boolean} [mounted=true]  - Whether component calling this function is mounted. If false, uses 'lg' to align with server-side render.
 * @param {number} [windowWidth=null] - Current window width.
 * @returns {string|number} Width for div column block to be used at current screen/browser size.
 */
export function getColumnWidthFromDefinition(columnDefinition, mounted=true, windowWidth=null){

    var w = columnDefinition.width || columnDefinition.baseWidth || null;
    if (typeof w === 'number'){
        return w;
    }
    var widthMap = columnDefinition.widthMap || null;
    if (widthMap){
        var responsiveGridSize;
        if (!mounted || isServerSide()) responsiveGridSize = 'lg';
        else responsiveGridSize = layout.responsiveGridState(windowWidth);
        if (responsiveGridSize === 'xs') responsiveGridSize = 'sm';
        return widthMap[responsiveGridSize || 'lg'];
    }
    return 250; // Fallback.
}


export class ResultRowColumnBlockValue extends React.Component {

    static defaultProps = {
        'mounted' : false,
        'toggleDetailOpen' : function(evt){ console.warn('Triggered props.toggleDetailOpen() but no toggleDetailOpen prop passed to ResultRowColumnValue Component.'); },
        'shouldComponentUpdateExt' : null
    }

    shouldComponentUpdate(nextProps, nextState){
        if (
            nextProps.columnNumber === 0 ||
            nextProps.columnDefinition.field !== this.props.columnDefinition.field ||
            nextProps.schemas !== this.props.schemas ||
            object.atIdFromObject(nextProps.result) !== object.atIdFromObject(this.props.result) ||
            nextProps.className !== this.props.className ||
            (typeof nextProps.shouldComponentUpdateExt === 'function' && nextProps.shouldComponentUpdateExt(nextProps, nextState, this.props, this.state))
        ){
            return true;
        }
        return false;
    }

    render(){
        var { result, columnDefinition, mounted } = this.props;
        var renderFxn = columnDefinition.render || defaultColumnBlockRenderFxn;
        var value = sanitizeOutputValue(
            renderFxn(result, columnDefinition, _.omit(this.props, 'columnDefinition', 'result'))
        );

        var tooltip;
        if (typeof value === 'string') {
            if (this.props.tooltip === true && value.length > 25) tooltip = value;
            value = <span className="value">{ value }</span>;
        } else if (value === null){
            value = <small className="text-300">-</small>;
        }

        var className = "inner";
        if (typeof this.props.className === 'string'){
            className += ' ' + this.props.className;
        }
        return (
            <div className={className} data-tip={tooltip}>{ value }</div>
        );
    }
}



export class HeadersRow extends React.Component {

    static fullRowWidth = memoize(function(columnDefinitions, mounted=true, dynamicWidths=null, windowWidth=null){
        return _.reduce(columnDefinitions, function(fw, colDef, i){
            var w;
            if (typeof colDef === 'number') w = colDef;
            else {
                if (Array.isArray(dynamicWidths) && dynamicWidths[i]) w = dynamicWidths[i];
                else w = getColumnWidthFromDefinition(colDef, mounted, windowWidth);
            }
            if (typeof w !== 'number') w = 0;
            return fw + w;
        }, 0);
    });

    static propTypes = {
        'columnDefinitions' : PropTypes.array.isRequired,//ResultRow.propTypes.columnDefinitions,
        'mounted' : PropTypes.bool.isRequired
    };

    constructor(props){
        super(props);
        this.throttledSetHeaderWidths = _.debounce(_.throttle(this.setHeaderWidths.bind(this), 1000), 350);
        this.setHeaderWidths = this.setHeaderWidths.bind(this);
        this.onAdjusterDrag = this.onAdjusterDrag.bind(this);
        this.state = {
            'widths' : (props.headerColumnWidths && props.headerColumnWidths.slice(0)) || null
        };
    }

    componentDidUpdate(pastProps){
        if (pastProps.headerColumnWidths !== this.props.headerColumnWidths){
            this.setState({ 'widths' : this.props.headerColumnWidths.slice(0) });
        }
    }

    setHeaderWidths(idx, evt, r){
        if (typeof this.props.setHeaderWidths !== 'function') throw new Error('props.setHeaderWidths not a function');
        setTimeout(()=> this.props.setHeaderWidths(this.state.widths.slice(0)), 0);
    }

    getWidthFor(idx){
        return (
            (Array.isArray(this.state.widths) && this.state.widths[idx]) ||
            (Array.isArray(this.props.headerColumnWidths) && this.props.headerColumnWidths[idx]) ||
            getColumnWidthFromDefinition(this.props.columnDefinitions[idx], this.props.mounted)
        );
    }

    onAdjusterDrag(idx, evt, r){
        this.setState(({ widths }, { columnDefinitions, defaultMinColumnWidth })=>{
            var nextWidths = widths.slice(0);
            nextWidths[idx] = Math.max(columnDefinitions[idx].minColumnWidth || defaultMinColumnWidth || 55, r.x);
            return { 'widths' : nextWidths };
        });
    }

    render(){
        var { isSticky, stickyStyle, tableLeftOffset, tableContainerWidth, columnDefinitions, stickyHeaderTopOffset, renderDetailPane, headerColumnWidths } = this.props,
            isAdjustable = headerColumnWidths && this.state.widths;

        return (
            <div className={
                    "search-headers-row"
                    + (isAdjustable ? '' : ' non-adjustable')
                    + (isSticky ? ' stickied' : '')
                    + (typeof renderDetailPane !== 'function' ? ' no-detail-pane' : '')
                } style={
                    isSticky ? _.extend({}, stickyStyle, {
                        'top'   : -stickyHeaderTopOffset,
                        'left'  : tableLeftOffset,
                        'width' : tableContainerWidth
                    }) : {
                        'width' : this.props.width || null // Only passed in from ItemPage
                    }}>
                <div className="columns clearfix" style={{
                    'left'  : isSticky ? (stickyStyle.left || 0) - (tableLeftOffset || 0) : null,
                    'width' : (stickyStyle && stickyStyle.width) || null
                }}>
                {
                    _.map(columnDefinitions, (colDef, i)=>{
                        var { sortColumn, sortBy, sortReverse } = this.props,
                            w = this.getWidthFor(i),
                            sorterIcon;

                        if (!colDef.noSort && typeof sortBy === 'function' && w >= 50){
                            sorterIcon = <ColumnSorterIcon sortByFxn={sortBy} currentSortColumn={sortColumn} descend={sortReverse} value={colDef.field} />;
                        }
                        return (
                            <div
                                data-field={colDef.field}
                                key={colDef.field}
                                className={"search-headers-column-block" + (colDef.noSort ? " no-sort" : '')}
                                style={{ width : w }}>
                                <div className="inner">
                                    <span className="column-title">{ colDef.colTitle || colDef.title }</span>
                                    { sorterIcon }
                                </div>
                                { Array.isArray(headerColumnWidths) ?
                                    <Draggable position={{x:w,y:0}} axis="x" onDrag={this.onAdjusterDrag.bind(this, i)} onStop={this.setHeaderWidths.bind(this, i)}>
                                        <div className="width-adjuster"/>
                                    </Draggable>
                                : null }
                            </div>
                        );
                    })
                }
                </div>
            </div>
        );
    }
}
