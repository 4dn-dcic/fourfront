import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';

let HiGlassComponent = null; // Loaded after componentDidMount as not supported server-side.



export const HIGLASS_SAMPLE_VIEWCONFIG = {
    "editable": true,
    "zoomFixed": false,
    "trackSourceServers": [
        "http://54.86.58.34/api/v1"
    ],
    "exportViewUrl": "/api/v1/viewconfs",
    "views": [
        {
            "uid": "aa",
            "initialXDomain": [
                234746886.15079364,
                238230126.6906902
            ],
            "tracks": {
                "top": [],
                "left": [],
                "center": [
                    {
                        "uid": "c1",
                        "type": "combined",
                        "height": 551,
                        "contents": [
                            {
                                "server": "http://54.86.58.34/api/v1",
                                "tilesetUid": "W2hNwnu2TwiDqqCUxxzA1g",
                                "type": "heatmap",
                                "position": "center",
                                "uid": "GjuZed1ySGW1IzZZqFB9BA"
                            }
                        ],
                        "position": "center"
                    }
                ],
                "right": [],
                "bottom": []
            },
            "layout": {
                "w": 12,
                "h": 13,
                "x": 0,
                "y": 0,
                "i": "aa",
                "moved": false,
                "static": false
            },
            "initialYDomain": [
                235207586.8246398,
                238862012.2628646
            ]
        }
    ],
};


export class HiGlassTabView extends React.Component {

    static getTabObject(context, viewConfig, disabled, isValidating){
        return {
            'tab' : <span><i className={"icon icon-fw icon-" + (isValidating ? 'circle-o-notch icon-spin' : 'search')}/> HiGlass Browser</span>,
            'key' : 'higlass',
            'disabled' : disabled,
            'content' : (
                <div className="overflow-hidden">
                    <h3 className="tab-section-title">
                        <span>HiGlass Browser</span>
                    </h3>
                    <hr className="tab-section-title-horiz-divider"/>
                    <HiGlassTabView viewConfig={viewConfig} context={context} disabled={disabled} isValidating={isValidating} />
                </div>
            )
        };
    }

    static getAllTracksFromViewConfig(viewConfig){
        return _.reduce(viewConfig.views || [], function(m, view){
            if (view && view.tracks){
                var allTracks = _.union(..._.values(_.pick(view.tracks, 'top', 'left', 'center', 'right', 'bottom')));
                _.forEach(allTracks, function(track){
                    _.forEach(track.contents, function(trackContent){
                        if (trackContent.server && trackContent.tilesetUid && trackContent.uid){
                            m.push(trackContent);
                        }
                    });
                });
            }
            return m;
        }, []);
    }

    static defaultProps = {
        'isValidating' : false,
        'disabled' : false
    }

    constructor(props){
        super(props);
        this.state = { 'mounted' : false }; 
        this.options = { "bounded" : true };
        this.hiGlassElement = null;
    }

    componentDidMount(){
        setTimeout(()=>{ // Allow tab CSS transition to finish (the render afterwards lags browser a little bit).
            HiGlassComponent = require('higlass').HiGlassComponent;
            this.setState({ 'mounted' : true });
        }, 250);
    }

    render(){
        var { disabled, isValidating, viewConfig, context } = this.props;
        let hiGlassInstance = null;
        if (isValidating || !this.state.mounted){
            hiGlassInstance = (
                <div className="col-sm-12 text-center mt-4">
                    <h3><i className="icon icon-fw icon-circle-o-notch icon-spin"/></h3>
                    Initializing
                </div>
            );
        } else if (disabled) {
            hiGlassInstance = (
                <div className="col-sm-12 text-center mt-4">
                    <h4 className="text-400">Not Available</h4>
                </div>
            );
        } else {
            hiGlassInstance = (
                <HiGlassComponent
                    ref={(r)=>{ this.hiGlassElement = window.hiGlassElement = r; }}
                    options={this.options}
                    viewConfig={viewConfig}
                />
            );
        }
        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className="higlass-tab-view-contents">
                <link type="text/css" rel="stylesheet" href="https://unpkg.com/higlass@0.10.19/dist/styles/hglib.css" />
                <div className="higlass-wrapper row" style={{ 'height' : 650 }} children={hiGlassInstance} />
            </div>
        );
    }
}

