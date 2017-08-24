'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { MenuItem, DropdownButton, ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';


export class LimitAndPageControls extends React.Component {

    static propTypes = {
        'limit'         : PropTypes.number.isRequired,
        'page'          : PropTypes.number.isRequired,
        'maxPage'       : PropTypes.number.isRequired,
        'changingPage'  : PropTypes.bool,
        'changeLimit'   : PropTypes.func.isRequired,
        'changePage'    : PropTypes.func.isRequired
    }

    static defaultProps = {
        'changingPage' : false
    }

    constructor(props){
        super(props);
        this.handleLimitSelect = this.handleLimitSelect.bind(this);
        this.render = this.render.bind(this);
    }


    handleLimitSelect(eventKey, evt){
        evt.target.blur();
        return this.props.changeLimit(eventKey);
    }

    render(){
        var { page, limit, maxPage, changingPage, changePage, changeLimit } = this.props;
        return (
            <div>
                <ButtonToolbar className="pull-right">
                            
                    <DropdownButton title={
                        <span className="text-small">
                            <i className="icon icon-list icon-fw" style={{ fontSize: '0.825rem' }}></i> Show {limit}
                        </span>
                    } id="bg-nested-dropdown">
                        <MenuItem eventKey={10} onSelect={this.handleLimitSelect}>Show 10</MenuItem>
                        <MenuItem eventKey={25} onSelect={this.handleLimitSelect}>Show 25</MenuItem>
                        <MenuItem eventKey={50} onSelect={this.handleLimitSelect}>Show 50</MenuItem>
                        <MenuItem eventKey={100} onSelect={this.handleLimitSelect}>Show 100</MenuItem>
                        <MenuItem eventKey={250} onSelect={this.handleLimitSelect}>Show 250</MenuItem>
                    </DropdownButton>
                    
                    <ButtonGroup>
                        
                        <Button disabled={changingPage || page === 1} onClick={changingPage === true ? null : (e)=>{
                            changePage(page - 1);
                        }}><i className="icon icon-angle-left icon-fw"></i></Button>
                    
                        <Button disabled style={{ minWidth : 120 }}>
                            { changingPage === true ? 
                                <i className="icon icon-spin icon-circle-o-notch" style={{ opacity : 0.5 }}></i>
                                : 'Page ' + page + ' of ' + maxPage
                            }
                        </Button>
                    
                        <Button disabled={changingPage || page === maxPage} onClick={changingPage === true ? null : (e)=>{
                            changePage(page + 1);
                        }}><i className="icon icon-angle-right icon-fw"></i></Button>
                        
                    </ButtonGroup>

                </ButtonToolbar>
            </div>
        );
    }

}

export class ColumnSorterIcon extends React.Component {

    static propTypes = {
        'currentSortColumn' : PropTypes.string,
        'descend' : PropTypes.bool,
        'value' : PropTypes.string.isRequired,
        'sortByFxn' : PropTypes.func.isRequired
    }

    static defaultProps = {
        'descend' : false
    }

    constructor(props){
        super(props);
        this.sortClickFxn = this.sortClickFxn.bind(this);
    }

    sortClickFxn(e){
        e.preventDefault();
        var reverse = this.props.currentSortColumn === this.props.value && !this.props.descend;
        this.props.sortByFxn(this.props.value, reverse);
    }
    
    iconStyle(style = 'descend'){
        if (style === 'descend')        return <i className="icon icon-sort-desc" style={{ transform: 'translateY(-1px)' }}/>;
        else if (style === 'ascend')    return <i className="icon icon-sort-asc" style={{ transform: 'translateY(4px)' }}/>;
    }

    render(){
        var value = this.props.value;
        if (typeof value !== 'string' || value.length === 0) {
            return null;
        }
        var style = !this.props.descend && this.props.currentSortColumn === value ? 'ascend' : 'descend';
        var linkClass = (
            (this.props.currentSortColumn === value ? 'active ' : '') +
            'column-sort-icon'
        );
        return <span className={linkClass} onClick={this.sortClickFxn}>{ this.iconStyle(style) }</span>;
    }
}
