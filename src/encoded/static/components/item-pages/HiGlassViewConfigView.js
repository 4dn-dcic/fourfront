'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
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

        initTabs.push(HiGlassViewConfigTabView.getTabObject(this.props, false, false));

        return initTabs;
    }

}

globals.content_views.register(HiGlassViewConfigView, 'HiGlassViewConfig');



export class HiGlassViewConfigTabView extends React.Component {

    static getTabObject(props, disabled, isValidating, viewConfig=null){
        viewConfig = viewConfig || props.viewsConfig || (props.context && props.context.viewconfig);
        return {
            'tab' : <span><i className={"icon icon-fw icon-" + (isValidating ? 'circle-o-notch icon-spin' : 'television')}/> HiGlass Browser</span>,
            'key' : 'higlass',
            'disabled' : disabled,
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>HiGlass Browser</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <HiGlassViewConfigTabView viewConfig={viewConfig} context={props.context} disabled={disabled} isValidating={isValidating} />
                </div>
            )
        };
    }

    static defaultProps = {
        'isValidating' : false,
        'disabled' : false,
        'height' : 600
    };

    render(){
        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className="higlass-tab-view-contents">
                <HiGlassPlainContainer {..._.omit(this.props, 'context')} />
            </div>
        );
    }
}


