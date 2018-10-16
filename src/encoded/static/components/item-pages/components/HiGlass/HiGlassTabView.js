'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { console, fileUtil } from './../../../util';
import { HiGlassContainer } from './HiGlassContainer';
import { HiGlassPlainContainer } from './HiGlassPlainContainer';


export class HiGlassFileTabView extends React.Component {

    static getTabObject(props, disabled, isValidating, viewConfig=null){
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
                    <HiGlassFileTabView context={props.context} disabled={disabled} isValidating={isValidating} />
                </div>
            )
        };
    }

    static defaultProps = {
        'isValidating' : false,
        'disabled' : false,
        'height' : 600
    }

    render(){
        var file                = this.props.context,
            contentTrackOptions = {},
            fileFormat          = fileUtil.getFileFormatStr(file);

        if (fileFormat === 'bg' || fileFormat === 'bw'){
            contentTrackOptions.showTooltip = true;
        }
        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className="higlass-tab-view-contents">
                <HiGlassContainer {..._.omit(this.props, 'context')} files={[file]} contentTrackOptions={contentTrackOptions} />
            </div>
        );
    }
}


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
    }

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
