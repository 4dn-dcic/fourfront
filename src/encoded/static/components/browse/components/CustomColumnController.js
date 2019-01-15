'use strict';
// @flow

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ButtonToolbar, ButtonGroup, DropdownButton, MenuItem, Button, Modal, Checkbox, Collapse } from 'react-bootstrap';
import { columnsToColumnDefinitions } from './table-commons';


/**
 * This component stores an object of `hiddenColumns` in state which contains field names as keys and booleans as values.
 * This, along with functions `addHiddenColumn(field: string)` and `removeHiddenColumn(field: string)`, are passed down to
 * this component instance's child component instances.
 *
 * @prop {Object.<boolean>} [defaultHiddenColumns] - Initial hidden columns state object, if any.
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


export class CustomColumnSelector extends React.PureComponent {

    static propTypes = {
        'hiddenColumns'         : PropTypes.object.isRequired,
        'addHiddenColumn'       : PropTypes.func.isRequired,
        'removeHiddenColumn'    : PropTypes.func.isRequired
    };

    constructor(props){
        super(props);
        this.columnDefinitionsWithHiddenState = this.columnDefinitionsWithHiddenState.bind(this);
        this.handleOptionVisibilityChange = _.throttle(this.handleOptionVisibilityChange.bind(this), 300);
        this.renderHiddenColumnOption = this.renderHiddenColumnOption.bind(this);
    }

    /**
     * Extends `props.columnDefinitions` (Object[]) with property `hiddenState` (boolean)
     * according to internal state of `hiddenColumns` (Object.<boolean>)
     *
     * @returns {Object[]} Copy of columnDefintions with `hiddenState` added.
     */
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
        // Not an option -- always visible.
        if (colDef.field === 'display_title') return null;
        var isChecked = !colDef.hiddenState;
        return (
            <div className="col-sm-6 col-lg-3 column-option" key={colDef.field}>
                <Checkbox checked={isChecked} onChange={this.handleOptionVisibilityChange.bind(this, colDef.field)} value={colDef.field} className={isChecked ? 'is-active' : null}>
                    { colDef.title }
                </Checkbox>
            </div>
        );
    }

    render(){
        return (
            <div className="row clearfix" children={_.map(this.columnDefinitionsWithHiddenState(), this.renderHiddenColumnOption)}/>
        );
    }

}