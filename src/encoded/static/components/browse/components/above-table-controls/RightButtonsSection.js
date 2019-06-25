'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { SearchResultTable } from './../SearchResultTable';



export const RightButtonsSection = React.memo(function RightButtonsSection(props){
    const { currentOpenPanel, onColumnsBtnClick } = props;
    return (
        <div className="pull-right right-buttons">
            <ConfigureVisibleColumnsButton onClick={onColumnsBtnClick} open={currentOpenPanel === "customColumns"} />
            <ToggleLayoutButton {..._.pick(props, 'windowWidth', 'isFullscreen', 'toggleFullScreen')} />
        </div>
    );
});



export const ConfigureVisibleColumnsButton = React.memo(function ConfigureVisibleColumnsButton({ open, onClick, className }){
    return (
        <button type="button" key="toggle-visible-columns" data-tip="Configure visible columns" data-event-off="click"
            active={open} onClick={onClick} className={(className || "") + (open ? " active" : "")}>
            <i className="icon icon-fw icon-table" />
            <i className="icon icon-fw icon-angle-down ml-03"/>
        </button>
    );
});
ConfigureVisibleColumnsButton.defaultProps = {
    "className" : "btn btn-outline-primary"
};



/** Toggles between regular & full screen views */
export class ToggleLayoutButton extends React.PureComponent {

    static propTypes = {
        'windowWidth' : PropTypes.number.isRequired,
        'isFullscreen' : PropTypes.bool.isRequired,
        'toggleFullScreen' : PropTypes.func.isRequired,
        'className' : PropTypes.string
    };

    static defaultProps = {
        'className' : "btn btn-outline-primary"
    };

    constructor(props){
        super(props);
        this.handleLayoutToggle = _.throttle(this.handleLayoutToggle.bind(this), 350);
    }

    handleLayoutToggle(evt){
        const { windowWidth, isFullscreen, toggleFullScreen } = this.props;
        if (!SearchResultTable.isDesktopClientside(windowWidth)) return null;
        if (typeof toggleFullScreen !== 'function'){
            console.error('No toggleFullscreen function passed in.');
            return null;
        }
        setTimeout(toggleFullScreen, 0, !isFullscreen);
    }

    render(){
        const { isFullscreen, className } = this.props;
        const cls = className + " expand-layout-button" + (!isFullscreen ? '' : ' expanded');
        return (
            <button type="button" className={cls}
                onClick={this.handleLayoutToggle} data-tip={(!isFullscreen ? 'Expand' : 'Collapse') + " table width"}>
                <i className={"icon icon-fw icon-" + (!isFullscreen ? 'expand' : 'compress')}></i>
            </button>
        );
    }
}

