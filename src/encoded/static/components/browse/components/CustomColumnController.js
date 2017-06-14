'use strict';
// @flow

import React from 'react';
import _ from 'underscore';

/**
 * 
 * TODO, IN PROGRESS
 * 
 */

export class CustomColumnController extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            'hiddenColumns' : []
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
        var propsToPass = _.extend(_.omit(this.props, 'children'), {
            'hiddenColumns'         : this.getAllHiddenColumns(),
            'addHiddenColumn'       : this.addHiddenColumn,
            'removeHiddenColumn'    : this.removeHiddenColumn
        });
        return React.Children.map(this.props.children, (c)=> {
            if (!React.isValidElement(c)) return c;
            return React.cloneElement(c, propsToPass);
        });
    }

}