'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Draggable from 'react-draggable';
import url from 'url';
import queryString from 'querystring';
import * as globals from './../../globals';
import { object, expFxn, ajax, Schemas, layout, isServerSide } from './../../util';
import { RawFilesStackedTable } from './file-tables';
import {
    ResultRowColumnBlockValue, extendColumnDefinitions, columnsToColumnDefinitions,
    defaultColumnDefinitionMap, columnDefinitionsToScaledColumnDefinitions,
    getColumnWidthFromDefinition, HeadersRow, TableRowToggleOpenButton } from './table-commons';
import { SearchResultDetailPane } from './SearchResultDetailPane';



export class ItemPageTable extends React.Component {

    static propTypes = {
        'results' : PropTypes.arrayOf(PropTypes.shape({
            'link_id' : PropTypes.string.isRequired,
            'display_title' : PropTypes.string.isRequired
        })).isRequired,
        'loading' : PropTypes.bool,
        'renderDetailPane' : PropTypes.func,
        'defaultOpenIndices' : PropTypes.arrayOf(PropTypes.number),
        'defaultOpenIds' : PropTypes.arrayOf(PropTypes.string)        
    }

    static defaultProps = {
        'renderDetailPane' : function(result, rowNumber, width){ return <SearchResultDetailPane result={result} />; },
        'constantColumnDefinitions' : null,
        'columnDefinitionOverrideMap' : {
            'display_title' : {
                'render' : function(result, columnDefinition, props, width){
                    var title = object.itemUtil.getTitleStringFromContext(result);
                    var link = object.itemUtil.atId(result);
                    var tooltip;
                    if (title && (title.length > 20 || width < 100)) tooltip = title;
                    var isAnAccession = false;// isDisplayTitleAccession(result, title, false);
                    if (link){
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
            },
        },
        'columns' : {
            "experiments_in_set.experiment_type": "Experiment Type",
            "experiments_in_set.biosample.biosource.individual.organism.name": "Organism",
            "experiments_in_set.biosample.biosource_summary": "Biosource Summary",
            "experiments_in_set.digestion_enzyme.name": "Enzyme",
            "experiments_in_set.biosample.modifications_summary": "Modifications",
            "experiments_in_set.biosample.treatments_summary": "Treatments"
        }
    }

    constructor(props){
        super(props);
        this.state = { 'mounted' : false };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    render(){
        var results = this.props.results;
        var loading = this.props.loading;

        var constantColumnDefinitions = this.props.constantColumnDefinitions;
        if (!constantColumnDefinitions){
            constantColumnDefinitions = extendColumnDefinitions([
                { 'field' : 'display_title' }
            ], defaultColumnDefinitionMap);
        }

        if (loading || !Array.isArray(results)){
            return (
                <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    <i className="icon icon-fw icon-spin icon-circle-o-notch"/>
                </div>
            );
        }

        var width = this.props.width;
        var columns = null;

        var columnDefinitions = columnsToColumnDefinitions(this.props.columns, constantColumnDefinitions);
        if (this.props.columnDefinitionOverrideMap){
            columnDefinitions = extendColumnDefinitions(columnDefinitions, this.props.columnDefinitionOverrideMap);
        }

        if (!width && this.refs && this.refs.tableContainer && this.refs.tableContainer.offsetWidth){
            width = this.refs.tableContainer.offsetWidth;
        }

        if (width){
            columnDefinitions = ItemPageTableRow.scaleColumnDefinitionWidths(width, columnDefinitionsToScaledColumnDefinitions(columnDefinitions));
        }

        var responsiveGridState = (this.state.mounted && layout.responsiveGridState()) || 'lg';
        
        return (
            <div className="item-page-table-container clearfix" ref="tableContainer">
                { responsiveGridState === 'md' || responsiveGridState === 'lg' || !responsiveGridState ? 
                    <HeadersRow mounted columnDefinitions={columnDefinitions} renderDetailPane={this.props.renderDetailPane} />
                : null }
                { results.map((result, rowIndex)=>{
                    var atId = object.atIdFromObject(result);
                    return (
                        <ItemPageTableRow
                            {...this.props}
                            key={atId || rowIndex}
                            result={result}
                            width={width}
                            columnDefinitions={columnDefinitions}
                            renderDetailPane={this.props.renderDetailPane}
                            rowNumber={rowIndex}
                            responsiveGridState={responsiveGridState}
                            defaultOpen={
                                (Array.isArray(this.props.defaultOpenIndices) && _.contains(this.props.defaultOpenIndices, rowIndex))
                                || (atId && Array.isArray(this.props.defaultOpenIds) && _.contains(this.props.defaultOpenIds, atId))
                            }
                        />
                    );     
                }) }
            </div>
        );
    }

}

class ItemPageTableRow extends React.Component {

    static totalColumnsBaseWidth(columns){
        return _.reduce(columns, function(m, colDef){
            return m + colDef.baseWidth;
        }, 0);
    }

    static scaleColumnDefinitionWidths(realWidth, columnDefinitions){
        var baseWidth = ItemPageTableRow.totalColumnsBaseWidth(columnDefinitions);
        var scale = realWidth / baseWidth;
        return columnDefinitions.map(function(c){
            return _.extend({}, c, { 'width' : Math.floor(scale * c.baseWidth) });
        });
    }

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = { 'open' : props.defaultOpen || false };
    }

    toggleOpen(){
        this.setState({ open : !this.state.open });
    }

    renderValue(colDefinition, result, columnIndex){
        return (
            <ResultRowColumnBlockValue
                {...this.props}
                columnDefinition={colDefinition}
                columnNumber={columnIndex}
                key={colDefinition.field}
                schemas={this.props.schemas || null}
                result={result}
                tooltip={true}
                className={colDefinition.field === 'display_title' && this.state.open ? 'open' : null}
                detailOpen={this.state.open}
                toggleDetailOpen={this.toggleOpen}
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
        return (
            <div className="item-page-table-row-container">
                { this.props.responsiveGridState === 'xs' || this.props.responsiveGridState === 'sm' ? this.renderRowOfBlocks() : this.renderRowOfColumns() }
                { this.state.open && typeof this.props.renderDetailPane === 'function' ?
                    <div className="inner-wrapper">
                        { this.props.renderDetailPane(this.props.result, this.props.rowNumber, this.props.width, this.props) }
                    </div>
                : null }
            </div>
        );
    }
}



export class ItemPageTableLoader extends React.Component {

    static propTypes = {
        'children' : PropTypes.element.isRequired,
        'itemsObject' : PropTypes.object.isRequired,
        'sortFxn' : PropTypes.func,
        'isItemCompleteEnough' : PropTypes.func.isRequired
    }

    static defaultProps = {
        'isItemCompleteEnough' : function(item){
            return false;
        }
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);

        // Get ExpSets from this file, check if are complete (have bio_rep_no, etc.), and use if so; otherwise, save 'this.experiment_set_uris' to be picked up by componentDidMount and fetched.
        var items_obj = props.itemsObject;
        var items = _.values(items_obj);
        var items_for_state = null;

        if (Array.isArray(items) && items.length > 0 && props.isItemCompleteEnough(items[0])){
            items_for_state = items;
        } else {
            this.item_uris = _.keys(items_obj);
        }

        this.state = {
            'items' : items_for_state,
            'current_item_index' : false
        };
    }

    componentDidMount(){
        var newState = {};

        var onFinishLoad = null;

        if (Array.isArray(this.item_uris) && this.item_uris.length > 0){

            onFinishLoad = _.after(this.item_uris.length, function(){
                this.setState({ 'loading' : false });
            }.bind(this));

            newState.loading = true;
            _.forEach(this.item_uris, (uri)=>{
                ajax.load(uri, (r)=>{
                    var currentItems = (this.state.items || []).slice(0);
                    currentItems.push(r);
                    this.setState({ items : currentItems });
                    onFinishLoad();
                }, 'GET', onFinishLoad);
            });
        }
        
        if (_.keys(newState).length > 0){
            this.setState(newState);
        }
    }

    componentWillUnmount(){
        delete this.item_uris;
    }

    render(){
        return <layout.WindowResizeUpdateTrigger children={React.cloneElement(this.props.children, _.extend({}, this.props, { 'loading' : this.state.loading, 'results' : this.state.items }) )} />;
    }

}


export class ItemPageTableSearchLoader extends React.Component {

    constructor(props){
        super(props);
        this.handleResponse = this.handleResponse.bind(this);
        this.state = { 'loading' : false, 'results' : null };
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
        this.setState({ 'loading' : false, 'results' : results });
    }

    render(){
        var { requestHref } = this.props;
        if (!requestHref) return null;
        return <layout.WindowResizeUpdateTrigger children={React.cloneElement(this.props.children, _.extend({}, this.props, this.state) )} />; 
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