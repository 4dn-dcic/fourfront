
'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ButtonToolbar, Collapse, Button, DropdownButton } from 'react-bootstrap';
import { layout } from './../../util';



export class CollapsibleItemViewButtonToolbar extends React.PureComponent {

    constructor(props){
        super(props);
        this.toggleOpenMenu = _.throttle(this.toggleOpenMenu.bind(this), 1000);
        this.wrapChildForMobile = this.wrapChildForMobile.bind(this);
        this.state = { 'open' : false, 'mounted' : false };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    toggleOpenMenu(){
        this.setState(function(currState){
            return { 'open' : !currState.open };
        });
    }

    wrapChildForMobile(elem, idx = 0){
        var className = (
            "mobile-size-elem mb-05"
            + (idx !== 0 ? ' mt-05' : '') 
        );

        return <div className={className}>{ elem }</div>;
    }

    render(){
        var { children, windowWidth } = this.props,
            gridState       = this.state.mounted && layout.responsiveGridState(windowWidth),
            isMobileSize    = gridState && gridState !== 'lg',
            isOpen          = !isMobileSize || this.state.open;

        return (
            <div className="pull-right tabview-title-controls-container">
                { isMobileSize ?
                    <Collapse in={isOpen}>
                        <div className="inner-panel">
                            { Array.isArray(children) ? _.map(children, this.wrapChildForMobile) : this.wrapChildForMobile(children) }
                            <hr/>
                        </div>
                    </Collapse>
                : null }
                <div className="toolbar-wrapper text-right">
                    <ButtonToolbar>
                        { this.state.mounted && !isMobileSize && this.props.children }
                        <Button className="hidden-lg toggle-open-button" onClick={this.toggleOpenMenu}>
                            <i className={"icon icon-fw icon-" + ((isMobileSize && isOpen) ? 'angle-up' : 'ellipsis-v')}/>&nbsp; Options&nbsp;
                        </Button>
                        { this.props.constantButtons }
                    </ButtonToolbar>
                </div>
            </div>
        );
    }
}