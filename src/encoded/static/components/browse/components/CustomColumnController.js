'use strict';
// @flow

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ButtonToolbar, ButtonGroup, DropdownButton, MenuItem, Button, Modal, Checkbox, Collapse } from 'react-bootstrap';
import { extendColumnDefinitions, columnsToColumnDefinitions } from './SearchResultTable';

/**
 * 
 * TODO, IN PROGRESS
 * 
 */

export class CustomColumnController extends React.Component {

    constructor(props){
        super(props);
        this.getAllHiddenColumns = this.getAllHiddenColumns.bind(this);
        this.addHiddenColumn = this.addHiddenColumn.bind(this);
        this.removeHiddenColumn = this.removeHiddenColumn.bind(this);
        this.state = {
            'hiddenColumns' : Array.isArray(props.defaultHiddenColumns) ? props.defaultHiddenColumns : []
        };
    }

    getAllHiddenColumns(props = this.props){
        if (Array.isArray(props.hiddenColumns)) return props.hiddenColumns.concat(this.state.hiddenColumns);
        else return this.state.hiddenColumns;
    }

    addHiddenColumn(fieldKey){
        var hiddenCols = this.state.hiddenColumns.slice(0);
        hiddenCols.push(fieldKey);
        this.setState({ 'hiddenColumns' : hiddenCols });
    }

    removeHiddenColumn(fieldKey){
        this.setState({ 'hiddenColumns' : _.without(this.state.hiddenColumns, fieldKey) });
    }

    render(){
        if (!React.isValidElement(this.props.children)) throw new Error('CustomColumnController expects props.children to be a valid React component instance.');
        var propsToPass = _.extend(_.omit(this.props, 'children'), {
            'hiddenColumns'         : this.getAllHiddenColumns(),
            'addHiddenColumn'       : this.addHiddenColumn,
            'removeHiddenColumn'    : this.removeHiddenColumn
        });
        return React.cloneElement(this.props.children, propsToPass);
    }

}


class SelectorModalPane extends React.Component {

}


export class CustomColumnSelector extends React.Component {

    static buildColumnDefinitions( constantColumnDefinitions: Object[], columnsMap: Object = {}, columnDefinitionOverrideMap: Object = {}, constantHiddenColumns: string[] = [] ): Object[]
    {
        // Prevent Title from being a hideable column.
        constantHiddenColumns = constantHiddenColumns.slice(0);
        constantHiddenColumns.push('display_title');

        return extendColumnDefinitions(
            columnsToColumnDefinitions(columnsMap, constantColumnDefinitions).filter(function(c){
                if (constantHiddenColumns.indexOf(c.field) > -1) return false;
                return true;
            }),
            columnDefinitionOverrideMap
        );
    }

    static propTypes = {
        'hiddenColumns'         : PropTypes.arrayOf(PropTypes.string).isRequired,
        'addHiddenColumn'       : PropTypes.func.isRequired,
        'removeHiddenColumn'    : PropTypes.func.isRequired,
        //'columnDefinitions': PropTypes.
    }

    constructor(props){
        super(props);
        this.columnDefinitionsWithHiddenState = this.columnDefinitionsWithHiddenState.bind(this);
        this.handleOptionVisibilityChange = _.throttle(this.handleOptionVisibilityChange.bind(this), 300);
        this.renderHiddenColumnOption = this.renderHiddenColumnOption.bind(this);
    }

    columnDefinitionsWithHiddenState(){
        return _.sortBy(this.props.columnDefinitions, 'order').map((colDef)=>{
            return _.extend(colDef, {
                'hiddenState' : this.props.hiddenColumns.indexOf(colDef.field) > -1
            });
        });
    }

    handleOptionVisibilityChange(field, evt){
        setTimeout(()=>{
            if (this.props.hiddenColumns.indexOf(field) > -1){
                // If invisible
                this.props.removeHiddenColumn(field);
            } else {
                this.props.addHiddenColumn(field);
            }
        });
    }

    renderHiddenColumnOption(colDef){
        return (
            <div className="col-sm-6 col-lg-3 column-option" key={colDef.field}>
                <Checkbox checked={!colDef.hiddenState} onChange={this.handleOptionVisibilityChange.bind(this, colDef.field)} value={colDef.field}>{ colDef.title }</Checkbox>
            </div>
        );
    }

    render(){
        console.log(this.columnDefinitionsWithHiddenState());
        return (
            <div className={"visible-columns-selector-panel" + (this.props.className ? ' ' + this.props.className : '')}>
                <div className="inner">
                    <h5 className="text-400 panel-title">Visible Columns</h5>
                    <div className="row clearfix">
                        { this.columnDefinitionsWithHiddenState().map(this.renderHiddenColumnOption) }
                    </div>
                </div>
            </div>
        );
    }

}