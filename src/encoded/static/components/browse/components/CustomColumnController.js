'use strict';
// @flow

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ButtonToolbar, ButtonGroup, DropdownButton, MenuItem, Button, Modal } from 'react-bootstrap';
import { extendColumnDefinitions, columnsToColumnDefinitions } from './SearchResultTable';

/**
 * 
 * TODO, IN PROGRESS
 * 
 */

export class CustomColumnController extends React.Component {

    constructor(props){
        super(props);
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

    static buildColumnDefinitions( constantColumnDefinitions: Object[], columnsMap: Object = {}, columnDefinitionOverrideMap: Object = {} ): Object[]
    {
        return extendColumnDefinitions(
            columnsToColumnDefinitions(columnsMap, constantColumnDefinitions),
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
        this.handleOpenToggle = _.throttle(this.handleOpenToggle.bind(this), 300);
        this.state = {
            'open' : false
        };
    }

    columnDefinitionsWithHiddenState(){
        return this.props.columnDefinitions.map((colDef)=>{
            return _.extend(colDef, {
                'hiddenState' : this.props.hiddenColumns.indexOf(colDef.field) > -1
            });
        });
    }

    handleOpenToggle(e){
        console.log(e);
        this.setState({ open : !this.state.open });
    }

    renderModalView(){
        if (this.state.open === false) return null;
        return (
            <Modal show={this.state.open} onHide={this.handleOpenToggle}>
                <Modal.Header>
                    <Modal.Title>Adjust Visible Columns</Modal.Title>
                </Modal.Header>
                <Modal.Body>

                </Modal.Body>
            </Modal>
        );
    }

    render(){
        console.log(this.columnDefinitionsWithHiddenState());
        return (
            <div className="clearfix">
                <ButtonToolbar className="pull-right">
                    
                    <ButtonGroup>
                        
                        <Button onClick={this.handleOpenToggle} data-tip="Change visible columns">
                            <i className="icon icon-eye-slash icon-fw"></i>
                        </Button>
                        
                    </ButtonGroup>

                </ButtonToolbar>
                { this.renderModalView() }
            </div>
        );
    }

}