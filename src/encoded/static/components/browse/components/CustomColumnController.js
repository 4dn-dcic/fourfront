'use strict';
// @flow

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ButtonToolbar, ButtonGroup, DropdownButton, MenuItem, Button, Modal, Checkbox, Collapse } from 'react-bootstrap';
import { extendColumnDefinitions, columnsToColumnDefinitions } from './table-commons';

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
            'hiddenColumns' : _.clone(props.defaultHiddenColumns || {})
        };
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.defaultHiddenColumns !== this.props.defaultHiddenColumns){
            this.setState({ 'hiddenColumns' : _.clone(nextProps.defaultHiddenColumns || {}) });
        }
    }

    /**
     * @param {{ hiddenColumns?: string[], defaultHiddenColumns }} props - Component props.
     * @returns {Object.<boolean>} Map of field names to boolean representing hidden or not.
     */
    getAllHiddenColumns(props = this.props){
        if (Array.isArray(props.hiddenColumns)){
            return _.extend(_.object(_.map(props.hiddenColumns, function(field){
                return [ field, true ];
            })), this.state.hiddenColumns);
        }
        else return this.state.hiddenColumns;
    }

    addHiddenColumn(field){
        this.setState(function(currState){
            if (currState.hiddenColumns[field] === true){
                return null;
            }
            var hiddenColumns = _.clone(currState.hiddenColumns);
            hiddenColumns[field] = true;
            return { hiddenColumns };
        });
    }

    removeHiddenColumn(field){
        this.setState(function(currState){
            if (currState.hiddenColumns[field] === false){
                return null;
            }
            var hiddenColumns = _.clone(currState.hiddenColumns);
            hiddenColumns[field] = false;
            return { hiddenColumns };
        });
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


export class CustomColumnSelector extends React.Component {

    /**
     * @param {Object[]} constantColumnDefinitions - Pre-set columns, e.g. 'status', 'display_title'.
     * @param {Object} [columnsMap={}] - Mappings of column field name to settings. Use 'context.columns' from back-end response.
     * @param {Object} [columnDefinitionOverrideMap={}] - Mappings of column field name to settings to extend columnsMap with.
     * @param {string[]} [constantHiddenColumns=[]] - Columns which should always be hidden.
     * @returns {Object[]} Column definitions
     */
    static buildColumnDefinitions(constantColumnDefinitions, columnsMap = {}, columnDefinitionOverrideMap = {}, constantHiddenColumns = []){
        // TODO: REMOVE FXN & USAGE
        return extendColumnDefinitions(
            columnsToColumnDefinitions(
                columnsMap,
                constantColumnDefinitions
            ),
            columnDefinitionOverrideMap
        );
    }

    static propTypes = {
        'hiddenColumns'         : PropTypes.object.isRequired,
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
        var { columnDefinitions, hiddenColumns } = this.props;

        return _.map(_.sortBy(columnDefinitions, 'order'), function(colDef){
            return _.extend({}, colDef, { 'hiddenState' : hiddenColumns[colDef.field] === true });
        });
    }

    handleOptionVisibilityChange(field, evt){
        var { hiddenColumns, removeHiddenColumn, addHiddenColumn } = this.props;
        if (hiddenColumns[field] === true){
            removeHiddenColumn(field);
        } else {
            addHiddenColumn(field);
        }
    }

    renderHiddenColumnOption(colDef){
        if (colDef.field === 'display_title') return null; // Not an option -- always visible.
        return (
            <div className="col-sm-6 col-lg-3 column-option" key={colDef.field}>
                <Checkbox checked={!colDef.hiddenState} onChange={this.handleOptionVisibilityChange.bind(this, colDef.field)} value={colDef.field}>{ colDef.title }</Checkbox>
            </div>
        );
    }

    render(){
        return (
            <div className="row clearfix" children={_.map(this.columnDefinitionsWithHiddenState(), this.renderHiddenColumnOption)}/>
        );
    }

}