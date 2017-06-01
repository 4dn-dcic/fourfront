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
