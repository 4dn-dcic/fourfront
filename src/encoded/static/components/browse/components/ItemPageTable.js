'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import Draggable from 'react-draggable';
import * as globals from './../../globals';
import { object, expFxn, ajax, Schemas, layout, isServerSide } from './../../util';
import ExperimentsTable from './../../experiments-table';
import {
    ResultRowColumnBlockValue, extendColumnDefinitions, columnsToColumnDefinitions,
    defaultColumnDefinitionMap, columnDefinitionsToScaledColumnDefinitions,
    getColumnWidthFromDefinition, HeadersRow } from './table-commons';
import { ExperimentSetDetailPane } from './ExperimentSetDetailPane';
import { browseTableConstantColumnDefinitions } from './../BrowseView';



export class ItemPageTable extends React.Component {

    static propTypes = {
        'results' : PropTypes.arrayOf(PropTypes.shape({
            'link_id' : PropTypes.string.isRequired,
            'display_title' : PropTypes.string.isRequired
        })).isRequired,
        'loading' : PropTypes.bool,
        'renderDetailPane' : PropTypes.func
        
    }

    static defaultProps = {
        'renderDetailPane' : function(result, rowNumber, width){ return <DefaultDetailPane result={result} />; },
        'constantColumnDefinitions' : extendColumnDefinitions([
            { 'field' : 'display_title' }
        ], defaultColumnDefinitionMap),
        'columns' : {
            "experiments_in_set.experiment_type": "Experiment Type",
            "experiments_in_set.biosample.biosource.individual.organism.name": "Organism",
            "experiments_in_set.biosample.biosource_summary": "Biosource Summary",
            "experiments_in_set.digestion_enzyme.name": "Enzyme",
            "experiments_in_set.biosample.modifications_summary": "Modifications",
            "experiments_in_set.biosample.treatments_summary": "Treatments"
        }
    }

    render(){
        var results = this.props.results;
        var loading = this.props.loading;

        if (loading || !Array.isArray(results)){
            return (
                <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                    <i className="icon icon-fw icon-spin icon-circle-o-notch"/>
                </div>
            );
        }

        var width = null;
        var columns = null;

        var columnDefinitions = columnsToColumnDefinitions(this.props.columns, this.props.constantColumnDefinitions);
        if (this.props.columnDefinitionOverrideMap){
            columnDefinitions = extendColumnDefinitions(columnDefinitions, this.props.columnDefinitionOverrideMap);
        }

        if (this.refs && this.refs.tableContainer && this.refs.tableContainer.offsetWidth){
            width = this.refs.tableContainer.offsetWidth;
        }

        if (width){
            columnDefinitions = ItemPageTableRow.scaleColumnDefinitionWidths(width, columnDefinitionsToScaledColumnDefinitions(columnDefinitions));
        }

        var responsiveGridState = layout.responsiveGridState();

        
        return (
            <div className="item-page-table-container clearfix" ref="tableContainer">
                { responsiveGridState === 'md' || responsiveGridState === 'lg' || !responsiveGridState ? 
                    <HeadersRow mounted columnDefinitions={columnDefinitions} />
                : null }
                { results.map((result, rowIndex)=>{
                    return (
                        <ItemPageTableRow
                            result={result}
                            width={width}
                            columnDefinitions={columnDefinitions}
                            renderDetailPane={this.props.renderDetailPane}
                            rowNumber={rowIndex}
                            responsiveGridState={responsiveGridState}
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
        this.state = { 'open' : false };
    }

    toggleOpen(){
        this.setState({ open : !this.state.open });
    }

    renderValue(colDefinition, result){
        if (colDefinition.field === 'display_title'){
            return (
                <div className="inner">
                    <div className="row">
                        <div className="col-xs-2 col-sm-3 col-md-2 icon-container">
                            <i className={"icon icon-fw icon-" + ( this.state.open ? 'minus' : 'plus' )} onClick={this.toggleOpen} />
                        </div>
                        <div className="col-xs-10 col-sm-9 col-md-10 title-container">
                            { Schemas.getItemTypeTitle(result) }
                            { ' ' }
                            <a href={object.atIdFromObject(result)} className="mono-text text-400">{ result.accession }</a>
                        </div>

                    </div>
                </div>
            );
        } else {
            return (
                <ResultRowColumnBlockValue
                    columnDefinition={colDefinition}
                    key={colDefinition.field}
                    schemas={this.props.schemas || null}
                    result={result}
                    tooltip={true}
                />
            );
        }
    }

    renderRowOfColumns(){
        if (!Array.isArray(this.props.columnDefinitions)) {
            console.error('No columns defined.');
            return null;
        }
        var result = this.props.result;
        return (
            <div className="table-row clearfix">
                {
                    _.map(this.props.columnDefinitions, (col, index)=>{
                        return (
                            <div style={{ width : col.width }} className={"column column-for-" + col.field} data-field={col.field}>
                                { this.renderValue(col, result) }
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
                { this.state.open ?
                    <div className="inner-wrapper">
                        { this.props.renderDetailPane(this.props.result, this.props.rowNumber, this.props.width, this.props) }
                    </div>
                : null }
            </div>
        );
    }
}



