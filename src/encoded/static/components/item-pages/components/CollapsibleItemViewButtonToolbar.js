
'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { ButtonToolbar, Collapse, Button, DropdownButton } from 'react-bootstrap';
import { layout } from './../../util';

export class CollapsibleItemViewButtonToolbar extends React.PureComponent {

    static defaultProps = {
        'collapseButtonTitle' : function(isOpen){
            return (
                <span>
                    <i className={"icon icon-fw icon-" + (isOpen ? 'angle-up' : 'ellipsis-v')}/>&nbsp; Options
                </span>
            );
        }
    };

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
        if (!this.state.mounted) {
            return (
                <div className="pull-right pt-23 text-medium" key="loading-indicator">
                    <i className="icon icon-fw icon-circle-o-notch icon-spin"/>&nbsp;&nbsp;&nbsp;&nbsp;
                </div>
            );
        }

        var { children, windowWidth, collapseButtonTitle, session } = this.props,
            gridState       = this.state.mounted && layout.responsiveGridState(windowWidth),
            isMobileSize    = gridState && gridState !== 'lg',
            isOpen          = !isMobileSize || this.state.open;

        // If the user isn't logged in, add a tooltip reminding them to log in.
        var tooltip = null;
        if (!session) {
            tooltip = "Log in to be able to clone, save, and share HiGlass Displays";
        }

        return (
            <div className="pull-right tabview-title-controls-container">
                { isMobileSize ?
                    <Collapse in={isOpen} data-tip={tooltip}>
                        <div className="inner-panel" key="inner-collapsible-panel">
                            { Array.isArray(children) ? _.map(children, this.wrapChildForMobile) : this.wrapChildForMobile(children) }
                            <hr/>
                        </div>
                    </Collapse>
                : null }
                <div className="toolbar-wrapper pull-right" key="toolbar">
                    <ButtonToolbar data-tip={ isMobileSize ? null : tooltip }>
                        { !isMobileSize && this.props.children }
                        <Button className="hidden-lg toggle-open-button" onClick={this.toggleOpenMenu} key="collapse-toggle-btn">
                            { typeof collapseButtonTitle === 'function' ? collapseButtonTitle(isOpen) : collapseButtonTitle }
                        </Button>
                        { this.props.constantButtons }
                    </ButtonToolbar>
                </div>
            </div>
        );
    }
}
