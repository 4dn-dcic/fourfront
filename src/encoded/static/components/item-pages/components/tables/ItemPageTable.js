'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import memoize from 'memoize-one';
import queryString from 'querystring';
import { object, ajax, layout, isServerSide, schemaTransforms } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import {
    ResultRowColumnBlockValue, columnsToColumnDefinitions, columnDefinitionsToScaledColumnDefinitions,
    HeadersRow, TableRowToggleOpenButton
} from '@hms-dbmi-bgm/shared-portal-components/src/components/browse/components/table-commons';
import { SearchResultDetailPane } from '@hms-dbmi-bgm/shared-portal-components/src/components/browse/components/SearchResultDetailPane';


/** @todo - refactor. Not too important since parent components almost always a PureComponent so perf gain would b minimal */
export class ItemPageTable extends React.Component {

    static propTypes = {
        'results' : PropTypes.arrayOf(PropTypes.shape({
            'display_title' : PropTypes.string.isRequired
        })).isRequired,
        'loading' : PropTypes.bool,
        'renderDetailPane' : PropTypes.func,
        'defaultOpenIndices' : PropTypes.arrayOf(PropTypes.number),
        'defaultOpenIds' : PropTypes.arrayOf(PropTypes.string),
        'windowWidth' : PropTypes.number.isRequired
    };

    static defaultProps = {
        'renderDetailPane' : function(result, rowNumber, containerWidth){
            return <SearchResultDetailPane {...{ result, rowNumber, containerWidth }} />;
        },
        'constantColumnDefinitions' : null,
        'columnExtensionMap' : {
            'display_title' : {
                'render' : function(result, columnDefinition, props, width){
                    var title           = object.itemUtil.getTitleStringFromContext(result),
                        link            = object.itemUtil.atId(result),
                        isAnAccession   = false,
                        tooltip;

                    if (title && (title.length > 20 || width < 100)) tooltip = title;

                    if (link){ // Link instead of plaintext
                        title = <a href={link} className={"text-400" + (isAnAccession ? ' mono-text' : '')}>{ title }</a>;
                    }

                    var typeTitle = null;
                    if (!props.hideTypeTitle){
                        typeTitle = schemaTransforms.getItemTypeTitle(result);
                        if (typeof typeTitle === 'string'){
                            typeTitle += ' ';
                        }
                    }

                    var toggleButton = null;
                    if (typeof props.renderDetailPane === 'function'){
                        toggleButton = <TableRowToggleOpenButton open={props.detailOpen} onClick={props.toggleDetailOpen} />;
                    }

                    return (
                        <span className={'title-wrapper' + (typeTitle ? " has-type-title" : '')}>
                            { toggleButton }
                            { typeTitle ? <div className="type-title">{ typeTitle }</div> : null }
                            { title }
                        </span>
                    );
                }
            }
        },
        'columns' : {
            "display_title" : { "title" : "Title" },
            "number_of_experiments" : { "title" : "Exps" },
            "experiments_in_set.experiment_type.display_title": { "title" : "Experiment Type" },
            "experiments_in_set.biosample.biosource.individual.organism.name": { "title" : "Organism" },
            "experiments_in_set.biosample.biosource_summary": { "title" : "Biosource Summary" },
            "experiments_in_set.experiment_categorizer.combined" : { "title" : "Assay Details" }
        },
        'minWidth' : 720
    };

    constructor(props){
        super(props);
        this.state = { 'mounted' : false };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    render(){
        var { results, loading, columnExtensionMap, columns, width, windowWidth,
            defaultOpenIndices, renderDetailPane, minWidth } = this.props;

        if (loading || !Array.isArray(results)){
            return (
                <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    <i className="icon icon-fw icon-spin icon-circle-o-notch"/>
                </div>
            );
        }

        var columnDefinitions = columnsToColumnDefinitions(columns, columnExtensionMap),
            responsiveGridState = layout.responsiveGridState(windowWidth);

        width = Math.max(minWidth, (width || layout.gridContainerWidth(windowWidth) || 0));

        if (!width || isNaN(width)){
            throw new Error("Make sure width or windowWidth is passed in through props.");
        }

        columnDefinitions = ItemPageTableRow.scaleColumnDefinitionWidths(
            width,
            columnDefinitionsToScaledColumnDefinitions(columnDefinitions)
        );

        var commonRowProps = { width, columnDefinitions, responsiveGridState /* <- removable? */, renderDetailPane };

        return (
            <div className="item-page-table-container clearfix">
                <HeadersRow mounted columnDefinitions={columnDefinitions} renderDetailPane={renderDetailPane} width={width} />
                { _.map(results, (result, rowIndex) => {
                    var atId = object.atIdFromObject(result);
                    return (
                        <ItemPageTableRow {...this.props} {...commonRowProps}
                            key={atId || rowIndex} result={result} rowNumber={rowIndex} defaultOpen={
                                (Array.isArray(this.props.defaultOpenIndices) && _.contains(this.props.defaultOpenIndices, rowIndex))
                                || (atId && Array.isArray(this.props.defaultOpenIds) && _.contains(this.props.defaultOpenIds, atId))
                            } />
                    );
                }) }
            </div>
        );
    }

}

class ItemPageTableRow extends React.PureComponent {

    static totalColumnsBaseWidth(columns){
        return _.reduce(columns, function(m, colDef){
            return m + colDef.baseWidth;
        }, 0);
    }

    static scaleColumnDefinitionWidths = memoize(function(realWidth, columnDefinitions){
        var baseWidth = ItemPageTableRow.totalColumnsBaseWidth(columnDefinitions),
            scale = realWidth / baseWidth;
        return _.map(columnDefinitions, function(c){
            return _.extend({}, c, { 'width' : Math.floor(scale * c.baseWidth) });
        });
    });

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = { 'open' : props.defaultOpen || false };
    }

    toggleOpen(){
        this.setState(function({ open }){
            return { open : !open };
        });
    }

    renderValue(colDefinition, result, columnIndex){
        return (
            <ResultRowColumnBlockValue {...this.props}
                columnDefinition={colDefinition} columnNumber={columnIndex}
                key={colDefinition.field} schemas={this.props.schemas || null}
                result={result} tooltip={true}
                className={colDefinition.field === 'display_title' && this.state.open ? 'open' : null}
                detailOpen={this.state.open} toggleDetailOpen={this.toggleOpen}
                renderDetailPane={this.props.renderDetailPane}
            />
        );
    }

    renderRowOfColumns(){
        var { columnDefinitions, result, renderDetailPane } = this.props;

        if (!Array.isArray(columnDefinitions)) {
            console.error('No columns defined.');
            return null;
        }

        return (
            <div className={"table-row clearfix" + (typeof renderDetailPane !== 'function' ? ' no-detail-pane' : '')}>
                { _.map(columnDefinitions, (col, index) =>
                    <div style={{ 'width' : col.width }} className={"column column-for-" + col.field} data-field={col.field} key={col.field || index}>
                        { this.renderValue(col, result, index) }
                    </div>
                )}
            </div>
        );
    }

    render(){
        const { result, rowNumber, width, renderDetailPane } = this.props;
        return (
            <div className="item-page-table-row-container" style={{ width }}>
                { this.renderRowOfColumns() }
                { this.state.open && typeof renderDetailPane === 'function' ?
                    <div className="inner-wrapper">{ renderDetailPane(result, rowNumber, width, this.props) }</div>
                    : null }
            </div>
        );
    }
}



export class ItemPageTableIndividualUrlLoader extends React.PureComponent {

    static propTypes = {
        'children' : PropTypes.element.isRequired,
        'itemUrls' : PropTypes.arrayOf(PropTypes.string).isRequired,
        'windowWidth': PropTypes.number.isRequired,
        'maxToLoad' : PropTypes.number.isRequired
    };

    static defaultProps = {
        'maxToLoad' : 7
    };

    constructor(props){
        super(props);
        this.state = {
            'items' : null,
            'loading' : true,
            'itemIndexMapping' : _.object(_.map(props.itemUrls, function(url, i){ return [url, i]; }))
        };
    }

    componentDidMount(){
        this.loadItems();
    }

    loadItems(){
        const { itemUrls = [], maxToLoad } = this.props;
        const onFinishLoad = _.after(Math.min(itemUrls.length, maxToLoad), ()=>{
            this.setState({ 'loading' : false });
        });

        if (itemUrls.length > 0){
            _.forEach(itemUrls.slice(0, maxToLoad), (uri)=>{
                ajax.load(uri, (r)=>{
                    this.setState(function({ items, itemIndexMapping }){
                        items = (items || []).slice(0);
                        items.push(r);
                        items.sort(function(a, b){
                            var aIdx = itemIndexMapping[object.itemUtil.atId(a)] || -1,
                                bIdx = itemIndexMapping[object.itemUtil.atId(b)] || -1;
                            return bIdx - aIdx;
                        });
                        return { items };
                    }, onFinishLoad);
                }, 'GET', onFinishLoad);
            });
        }
    }

    render(){
        const { children, itemUrls } = this.props;
        const { loading, items } = this.state;
        return React.cloneElement(
            children,
            _.extend({ 'countTotalResults' : itemUrls.length }, this.props, { 'loading' : loading, 'results' : items })
        );
    }

}


export class ItemPageTableSearchLoader extends React.PureComponent {

    /** We set the default number of results to get here to be 7, unless is overriden in href */
    static getLimit = memoize(function(href){
        // Fun with destructuring - https://medium.com/@MentallyFriendly/es6-constructive-destructuring-793ac098d138
        const { query : { limit = 0 } = { limit : 0 } } = url.parse(href, true);
        return (limit && parseInt(limit)) || 7;
    });

    static hrefWithoutLimit = memoize(function(href){
        // Fun with destructuring - https://medium.com/@MentallyFriendly/es6-constructive-destructuring-793ac098d138
        const hrefParts = url.parse(href, true);
        const { query = {} } = hrefParts;
        delete query.limit;
        hrefParts.search = '?' + queryString.stringify(query);
        return url.format(hrefParts);
    });

    static hrefWithLimit = memoize(function(href, limit=null){
        // TODO: maybe migrate logic for "View More results" to it from here or into re-usable-for-any-type-of-item component ... lower priority
        // more relevant for CGAP but will have infinite-scroll-within-pane table to replace view more button at some point in future anyway so moot.

        const hrefParts = url.parse(href, true);
        const { query = {} } = hrefParts;
        query.limit = query.limit || limit || ItemPageTableSearchLoader.getLimit(href);
        hrefParts.search = '?' + queryString.stringify(query);
        return url.format(hrefParts);
    });

    static propTypes = {
        "requestHref" : PropTypes.string.isRequired,
        "children" : PropTypes.node.isRequired,
        "onLoad" : PropTypes.func
    };

    constructor(props){
        super(props);
        this.getCountCallback = this.getCountCallback.bind(this);
        this.handleResponse = this.handleResponse.bind(this);
        this.state = {
            'loading' : false,
            'results' : null,
            'countTotalResults' : null
        };
    }

    componentDidMount(){
        this.doRequest();
    }

    componentDidUpdate(pastProps){
        // eslint-disable-next-line react/destructuring-assignment
        if (pastProps.requestHref !== this.props.requestHref){
            this.doRequest();
        }
    }

    doRequest(){
        const { requestHref } = this.props;
        this.setState({ 'loading' : true }, ()=>{
            ajax.load(requestHref, this.handleResponse, 'GET', this.handleResponse);
        });
    }

    handleResponse(resp){
        const { onLoad } = this.props;
        const results = (resp && resp['@graph']) || [];
        const totalResults = (resp && typeof resp.total === 'number' && (resp.total || 0)) || null;
        this.setState({
            'loading' : false,
            'results' : results,
            'countTotalResults' : totalResults
        });
        if (typeof onLoad === 'function'){
            onLoad(resp);
        }
    }

    render(){
        const { requestHref, children } = this.props;
        if (!requestHref) return null;

        const limit = ItemPageTableSearchLoader.getLimit(requestHref);
        const hrefWithLimit = ItemPageTableSearchLoader.hrefWithLimit(requestHref, limit);
        const hrefWithoutLimit = ItemPageTableSearchLoader.hrefWithoutLimit(requestHref, limit);

        return React.cloneElement(
            children,
            _.extend({ hrefWithoutLimit, hrefWithLimit }, this.props, this.state)
        );
    }

}


/**
 * TODO: Once/if /search/ accepts POST JSON requests, we can do one single request to get all Items by @id from /search/ instead of multiple AJAX requests.
 * This will be the component to handle it (convert this.item_uris to one /search/ URI, override componentDidMount etc.)
 *
 * Could then automatically detect in ItemPageLoader if length of @ids requested is > 20 or some random number, and auto use this component instead.
 *
 * @export
 * @class ItemPageTableBatchLoader
 * @extends {ItemPageTableIndividualUrlLoader}
 */
export class ItemPageTableBatchLoader extends ItemPageTableIndividualUrlLoader {
    constructor(props){
        super(props);
        if (this.item_uris){
            console.log('TEST', this.item_uris);
        }
    }
}
