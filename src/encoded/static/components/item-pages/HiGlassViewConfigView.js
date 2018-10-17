'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Button } from 'react-bootstrap';
import * as globals from './../globals';
import { console, object, expFxn, ajax, Schemas, layout, fileUtil, isServerSide, DateUtility } from './../util';
import { FormattedInfoBlock, HiGlassPlainContainer } from './components';
import DefaultItemView, { OverViewBodyItem } from './DefaultItemView';



export default class HiGlassViewConfigView extends DefaultItemView {

    getTabViewContents(){

        var initTabs    = [],
            context     = this.props.context,
            windowWidth = this.props.windowWidth,
            width       = (!isServerSide() && this.refs && this.refs.tabViewContainer && this.refs.tabViewContainer.offsetWidth) || null;

        if (width) width -= 20;

        //initTabs.push(BiosampleViewOverview.getTabObject(this.props, width));
        //initTabs.push(ExpSetsUsedIn.getTabObject(this.props, width));

        // return initTabs.concat(this.getCommonTabs()); // We don't want attribution or detail view for this Item... for now.

        initTabs.push(HiGlassViewConfigTabView.getTabObject(this.props));

        return initTabs;
    }

}

globals.content_views.register(HiGlassViewConfigView, 'HiGlassViewConfig');



export class HiGlassViewConfigTabView extends React.Component {

    static getTabObject(props, viewConfig=null){
        viewConfig = viewConfig || props.viewsConfig || (props.context && props.context.viewconfig);
        return {
            'tab' : <span><i className="icon icon-fw icon-television"/> HiGlass Browser</span>,
            'key' : 'higlass',
            'disabled' : false,
            'content' : <HiGlassViewConfigTabView {...props} viewConfig={viewConfig} />
        };
    }

    static defaultProps = {
        'isValidating' : false,
        'disabled' : false,
        'height' : 600
    };

    constructor(props){
        super(props);
        this.fullscreenButton = this.fullscreenButton.bind(this);
        this.saveButtons = this.saveButtons.bind(this);

        // TODO: _maybe_ Use this variable
        // TODO: Update this variable upon movement, maybe bind methods to HiGlassComponentAPI (req: extend HiGlassPlainContainer)
        // TODO: When update, make sure it doesn't change/reload HiGlassComponent -- if it does, update this but don't pass it further.
        // TODO: Use it when saving, performing save as, etc.
        this.state = {
            'viewConfig' : props.viewConfig
        };
    }

    componentDidUpdate(pastProps, pastState){
        if (this.props.isFullscreen !== pastProps.isFullscreen){
            // TODO: Trigger re-draw of HiGlassComponent somehow
        }
    }

    saveButtons(){
        // TODO
        return (
            <div className="text-right inline-block">
                <div className="inline-block" key="savebtn">
                    <Button onClick={null /* TODO */} disabled bsStyle="success" data-tip="Save....">
                        <i className={"icon icon-fw icon-save"}/>&nbsp; Save
                    </Button>
                </div>&nbsp;
                <div className="inline-block" key="saveasbtn">
                    <Button onClick={null /* TODO */} bsStyle="success" data-tip="Save....">
                        <i className={"icon icon-fw icon-save"}/>&nbsp; Save As...
                    </Button>
                </div>&nbsp;
                <div className="inline-block" key="clonebtn">
                    <Button onClick={null /* TODO */} bsStyle="info" data-tip="Save....">
                        <i className={"icon icon-fw icon-copy"}/>&nbsp; Clone
                    </Button>
                </div>&nbsp;
            </div>
        );
    }

    fullscreenButton(){
        var { isFullscreen, toggleFullScreen } = this.props;
        if( typeof isFullscreen === 'boolean' && typeof toggleFullScreen === 'function'){
            return (
                <div className="inline-block for-state-fullscreenViewEnabled" key="toggle-fullscreen">
                    <Button onClick={toggleFullScreen} data-tip={!isFullscreen ? 'Expand to full screen' : null}>
                        <i className={"icon icon-fw icon-" + (!isFullscreen ? 'arrows-alt' : 'crop')}/>
                    </Button>
                </div>
            );
        }
        return null;
    }

    render(){
        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */

        var { isFullscreen, windowWidth } = this.props;
        return (
            <div className={"overflow-hidden tabview-container-fullscreen-capable" + (isFullscreen ? ' full-screen-view' : '')}>
                <h3 className="tab-section-title">
                    <span>HiGlass Browser</span>
                    <div className="inner-panel constant-panel pull-right tabview-title-controls-container">
                        { this.saveButtons() }
                        { this.fullscreenButton() }
                    </div>
                </h3>
                <hr className="tab-section-title-horiz-divider"/>
                <div className="higlass-tab-view-contents">
                    <div className="higlass-container-container" style={isFullscreen ? { 'paddingLeft' : 10, 'paddingRight' : 10 } : null }>
                        <HiGlassPlainContainer {..._.omit(this.props, 'context')} width={isFullscreen ? windowWidth + 10 : null} />
                    </div>
                </div>
            </div>
        );
    }
}


