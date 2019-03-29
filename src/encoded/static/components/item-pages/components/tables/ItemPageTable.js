'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import memoize from 'memoize-one';
import queryString from 'querystring';
import { object, ajax, Schemas, layout, isServerSide } from './../../../util';
import {
    ResultRowColumnBlockValue, columnsToColumnDefinitions, columnDefinitionsToScaledColumnDefinitions,
    HeadersRow, TableRowToggleOpenButton } from './../../../browse/components/table-commons';
import { SearchResultDetailPane } from './../../../browse/components/SearchResultDetailPane';



export class ItemPageTable extends React.Component {

    static propTypes = {
        'results' : PropTypes.arrayOf(PropTypes.shape({
            'link_id' : PropTypes.string.isRequired,
            'display_title' : PropTypes.string.isRequired
        })).isRequired,
        'loading' : PropTypes.bool,
        'renderDetailPane' : PropTypes.func,
        'defaultOpenIndices' : PropTypes.arrayOf(PropTypes.number),
        'defaultOpenIds' : PropTypes.arrayOf(PropTypes.string),
        'windowWidth' : PropTypes.number.isRequired,
        'minWidth' : 720
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
                        typeTitle = Schemas.getItemTypeTitle(result);
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
            "experiments_in_set.experiment_type": { "title" : "Experiment Type" },
            "experiments_in_set.biosample.biosource.individual.organism.name": { "title" : "Organism" },
            "experiments_in_set.biosample.biosource_summary": { "title" : "Biosource Summary" },
            "experiments_in_set.experiment_categorizer.combined" : { "title" : "Assay Details" }
        }
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

        var columnDefinitions = columnsToColumnDefinitions(columns, columnExtensionMap);

        width = Math.max(minWidth, (width || layout.gridContainerWidth(windowWidth)));

        if (width){
            columnDefinitions = ItemPageTableRow.scaleColumnDefinitionWidths(
                width,
                columnDefinitionsToScaledColumnDefinitions(columnDefinitions)
            );
        }

        var commonRowProps = { width, columnDefinitions, renderDetailPane };

        return (
            <div className="item-page-table-container clearfix">
                <HeadersRow mounted columnDefinitions={columnDefinitions} renderDetailPane={renderDetailPane} />
                { _.map(results, (result, rowIndex)=>{
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
        if (!Array.isArray(this.props.columnDefinitions)) {
            console.error('No columns defined.');
            return null;
        }
        var result = this.props.result;
        return (
            <div className={"table-row clearfix" + (typeof this.props.renderDetailPane !== 'function' ? ' no-detail-pane' : '')}>
                {
                    _.map(this.props.columnDefinitions, (col, index)=>{
                        return (
                            <div style={{ width : col.width }} className={"column column-for-" + col.field} data-field={col.field} key={col.field || index}>
                                { this.renderValue(col, result, index) }
                            </div>
                        );
                    })
                }
            </div>
        );
    }

    renderRowOfBlocks(){
        if (!Array.isArray(this.props.columnDefinitions)) {
            console.error('No columns defined.');
            return null;
        }
        var result = this.props.result;
        return (
            <div className="table-row row clearfix">
                {
                    _.map(
                        _.filter(this.props.columnDefinitions, (col, index)=>{
                            if (!this.state.open && col.field !== 'display_title'){
                                return false;
                            }
                            return true;
                        }),
                        (col, index)=>{
                            var label;
                            if (col.field !== 'display_title'){
                                label = (
                                    <div className="text-500 label-for-field">
                                        { col.title || Schemas.Field.toName(col.field) }
                                    </div>
                                );
                            }
                            return (
                                <div className={"column block column-for-" + col.field + (col.field === 'display_title' ? ' col-xs-12' : ' col-xs-6')} data-field={col.field}>
                                    { label }
                                    { this.renderValue(col, result) }
                                </div>
                            );
                        }
                    )
                }
            </div>
        );
    }

    render(){
        const { result, rowNumber, width, renderDetailPane } = this.props;
        return (
            <div className="item-page-table-row-container">
                { this.renderRowOfColumns() }
                { this.state.open && typeof renderDetailPane === 'function' ?
                    <div className="inner-wrapper">{ renderDetailPane(result, rowNumber, width, this.props) }</div>
                : null }
            </div>
        );
    }
}



export class ItemPageTableLoader extends React.PureComponent {

    static propTypes = {
        'children' : PropTypes.element.isRequired,
        'itemUrls' : PropTypes.arrayOf(PropTypes.string).isRequired,
        'windowWidth': PropTypes.number.isRequired
    };

    constructor(props){
        super(props);
        this.state = {
            'items' : null,
            'loading' : true,
            'itemIndexMapping' : _.object(_.map(props.itemUrls, function(url, i){ return [url, i]; }))
        };
    }

    loadItems(){
        var itemUrls = this.props.itemUrls,
            onFinishLoad = _.after(itemUrls.length, ()=>{
                this.setState({ 'loading' : false });
            });

        if (Array.isArray(itemUrls) && itemUrls.length > 0){
            _.forEach(itemUrls, (uri)=>{
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

    componentDidMount(){
        this.loadItems();
    }

    render(){
        return React.cloneElement(this.props.children, _.extend({}, this.props, { 'loading' : this.state.loading, 'results' : this.state.items }) );
    }

}


export class ItemPageTableSearchLoader extends React.Component {

    constructor(props){
        super(props);
        this.handleResponse = this.handleResponse.bind(this);
        this.state = {
            'loading' : false,
            'results' : null
        };
    }

    componentDidMount(){
        if (this.props.requestHref) this.doRequest();
    }

    componentDidUpdate(pastProps){
        if (pastProps.requestHref !== this.props.requestHref){
            this.doRequest();
        }
    }

    doRequest(){
        this.setState({ 'loading' : true }, ()=>{
            ajax.load(this.props.requestHref, this.handleResponse, 'GET', this.handleResponse);
        });
    }

    handleResponse(resp){
        var results = (resp && resp['@graph']) || [];
        this.setState({
            'loading' : false,
            'results' : results
        });
        if (typeof this.props.onLoad === 'function'){
            this.props.onLoad(resp);
        }
    }

    render(){
        var { requestHref } = this.props;
        if (!requestHref) return null;
        return React.cloneElement(this.props.children, _.extend({}, this.props, this.state) );
    }

}

export class ItemPageTableSearchLoaderPageController extends React.Component {

    constructor(props){
        super(props);
        this.state = { 'page' : 1 };
    }

    render(){
        var requestHref = this.props.requestHref;
        var hrefParts = url.parse(requestHref, true);
        hrefParts.query.limit = hrefParts.query.limit || 25;
        hrefParts.query.from = (hrefParts.query.limit || 25) * (this.state.page - 1);
        var correctedHref = hrefParts.pathname + '?' + queryString.stringify(hrefParts.query);
        return <ItemPageTableSearchLoader {...this.props} requestHref={correctedHref} />;
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
 * @extends {ItemPageTableLoader}
 */
export class ItemPageTableBatchLoader extends ItemPageTableLoader {
    constructor(props){
        super(props);
        if (this.item_uris){
            console.log('TEST', this.item_uris);
        }
    }
}