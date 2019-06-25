'use strict';
// @flow

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Checkbox } from './../../forms/components/Checkbox';


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

    componentDidUpdate(pastProps){
        const { defaultHiddenColumns } = this.props;
        if (pastProps.defaultHiddenColumns !== defaultHiddenColumns){
            this.setState({ 'hiddenColumns' : _.clone(defaultHiddenColumns || {}) });
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
    }

    /**
     * Extends `props.columnDefinitions` (Object[]) with property `hiddenState` (boolean)
     * according to internal state of `hiddenColumns` (Object.<boolean>).
     *
     * Sorts columns according to order and remove the display_title option, as well.
     *
     * @returns {Object[]} Copy of columnDefintions with `hiddenState` added.
     */
    columnDefinitionsWithHiddenState(){
        const { columnDefinitions, hiddenColumns } = this.props;
        return _.map(
            _.sortBy(
                _.filter(columnDefinitions, function(c){ return c.field !== 'display_title'; }),
                'order'
            ),
            function(colDef){
                return _.extend({}, colDef, { 'hiddenState' : hiddenColumns[colDef.field] === true });
            }
        );
    }

    handleOptionVisibilityChange(field, evt){
        const { hiddenColumns, removeHiddenColumn, addHiddenColumn } = this.props;
        if (hiddenColumns[field] === true){
            removeHiddenColumn(field);
        } else {
            addHiddenColumn(field);
        }
    }

    render(){
        return (
            <div className="row clearfix">
                { _.map(this.columnDefinitionsWithHiddenState(), (colDef, idx, all) =>
                    <ColumnOption {...colDef} key={colDef.field || idx} allColumns={all} index={idx} handleOptionVisibilityChange={this.handleOptionVisibilityChange} />
                ) }
            </div>
        );
    }

}

const ColumnOption = React.memo(function ColumnOption(props){
    const { hiddenState, allColumns, field, title, description, index, handleOptionVisibilityChange } = props;
    const isChecked = !hiddenState;
    const sameTitleColExists = _.any(allColumns.slice(0,index).concat(allColumns.slice(index + 1)), { title });
    let showDescription = description;

    if (sameTitleColExists){
        if (!description){
            showDescription = '<i class="icon icon-fw icon-code">&nbsp;</i><em class="text-300">' + field + '</em>';
        } else {
            showDescription += '<br/><i class="icon icon-fw icon-code">&nbsp;</i><em class="text-300">' + field + '</em>';
        }
    }

    return (
        <div className="col-sm-6 col-lg-3 column-option" key={field} data-tip={showDescription} data-html={true}>
            <Checkbox checked={isChecked} onChange={(e) => handleOptionVisibilityChange(field,e)}
                value={field} className={isChecked ? 'is-active' : null}>
                { title }
            </Checkbox>
        </div>
    );
});
