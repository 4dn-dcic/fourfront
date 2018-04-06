import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { isServerSide, ajax } from './../../util';
import { requestAnimationFrame } from './../../viz/utilities';

let HiGlassComponent = null; // Loaded after componentDidMount as not supported server-side.

const HiGlassServerBaseURL = "https://higlass.4dnucleome.org";


/* To be deleted (probably)
function loadJS(src){
    return new Promise(function(resolve, reject){
        var script = document.createElement('script');
        script.src = src;
        script.addEventListener('load', function () {
            resolve();
        });
        script.addEventListener('error', function (e) {
            reject(e);
        });
        document.body.appendChild(script);
    });
}
*/


export class HiGlassContainer extends React.Component {

    /**
     * This function is used to generate a full viewConfig for the HiGlassComponent.
     * Only the "center" view/track is dynamically generated, with other tracks currently being hard-coded to higlass.io data (e.g. hg38 tracks).
     * 
     * @param {Object} fileItem - A JS object representing a File item.
     * @param {number} [height=600] - Default height.
     * @param {string} [baseUrl=HiGlassServerBaseURL] - Where to request center tile data from.
     * @param {{ 'x' : number[], 'y' : number[] }} [initialDomains] - Initial coordinates.
     */
    static generateViewConfig(tilesetUid, height=600, baseUrl=HiGlassServerBaseURL, initialDomains={
        'x' : [31056455, 31254944],
        'y' : [31114340, 31201073]
    }, extraViewProps = {}, index = 0){

        if (Array.isArray(tilesetUid) && _.every(tilesetUid, function(uid){
            return (uid && typeof uid === 'object' && typeof uid.tilesetUid === 'string');
        })){ // Merge views into 1 array
            var allConfigs = _.map(tilesetUid, function(uidObj, idx){ return HiGlassContainer.generateViewConfig(uidObj.tilesetUid, height, baseUrl, initialDomains, uidObj.extraViewProps || {}, idx); });
            var primaryConf = allConfigs[0];
            var locationLockID = 'LOCATION_LOCK_ID';
            var zoomLockID = 'ZOOM_LOCK_ID';
            primaryConf.locationLocks.locksByViewUid[primaryConf.views[0].uid] = locationLockID;
            primaryConf.zoomLocks.locksByViewUid[primaryConf.views[0].uid] = zoomLockID;
            for (var i = 1; i < allConfigs.length; i++){
                primaryConf.views.push(allConfigs[i].views[0]);
                primaryConf.locationLocks.locksByViewUid[allConfigs[i].views[0].uid] = locationLockID;
                primaryConf.zoomLocks.locksByViewUid[allConfigs[i].views[0].uid] = zoomLockID;
            }
            primaryConf.locationLocks.locksDict[locationLockID] = _.extend(_.object(_.map(_.pluck(primaryConf.views, 'uid'), function(uid){
                return [uid, [1550000000, 1550000000, 3030000]]; // TODO: Put somewhere else, figure out what these values should be.
            })), { 'uid' : locationLockID });
            primaryConf.zoomLocks.locksDict[zoomLockID] = _.extend(_.object(_.map(_.pluck(primaryConf.views, 'uid'), function(uid){
                return [uid, [1550000000, 1550000000, 3030000]]; // TODO: Put somewhere else, figure out what these values should be.
            })), { 'uid' : zoomLockID });

            return primaryConf;
        }
        if (!tilesetUid || typeof tilesetUid !== 'string') throw new Error('No tilesetUid param supplied.');

        const centerTrackHeight = height - 50;

        function generateCenterTrack(){
            return {
                "uid": "c1",
                "type": "combined",
                "height": centerTrackHeight,
                "contents": [
                    {
                        "server": baseUrl + "/api/v1",
                        "tilesetUid": tilesetUid,
                        "type": "heatmap",
                        "position": "center",
                        "uid": "GjuZed1ySGW1IzZZqFB9BA"
                    }
                ],
                "position": "center"
            };
        }

        function generateLayoutForViewItem(viewItemID, initLayout = null){
            if (!initLayout){
                initLayout = { 'w' : 12, 'h' : 12, 'x' : 0, 'y' : 0 }; // 1 full view
            }
            return _.extend({}, initLayout, {
                'moved' : false,
                'static' : true,
                'i' : viewItemID
            });
        }

        function generateViewItem(){
            const viewUid = "view-4dn-" + index;
            return {
                "uid": viewUid,
                "initialXDomain": initialDomains.x,
                "initialYDomain" : initialDomains.y,
                "autocompleteSource": "/api/v1/suggest/?d=P0PLbQMwTYGy-5uPIQid7A&",
                // TODO: Make this werk -- works if 'trackSourceServers' at top is set to higlass.io not 54.86.58.34
                "genomePositionSearchBox": {
                    "autocompleteServer": "http://higlass.io/api/v1",
                    "autocompleteId": "P0PLbQMwTYGy-5uPIQid7A",
                    "chromInfoServer": "http://higlass.io/api/v1",
                    "chromInfoId": "hg38",
                    "visible": true
                },
                "tracks": {
                    "top": [
                        {
                            "name": "Gene Annotations (hg38)",
                            "created": "2017-07-14T15:27:46.989053Z",
                            "server": "http://higlass.io/api/v1",
                            "tilesetUid": "P0PLbQMwTYGy-5uPIQid7A",
                            "type": "horizontal-gene-annotations",
                            "options": {
                                "labelColor": "black",
                                "labelPosition": "hidden",
                                "plusStrandColor": "blue",
                                "minusStrandColor": "red",
                                "trackBorderWidth": 0,
                                "trackBorderColor": "black",
                                "name": "Gene Annotations (hg38)"
                            },
                            "width": 20,
                            "height": 55,
                            "header": "1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\t12\t13\t14",
                            "position": "top"
                        },
                        {
                            "name": "Chromosome Axis",
                            "created": "2017-07-17T14:16:45.346835Z",
                            "server": "http://higlass.io/api/v1",
                            "tilesetUid": "NyITQvZsS_mOFNlz5C2LJg",
                            "type": "horizontal-chromosome-labels",
                            "options": {},
                            "width": 20,
                            "height": 30,
                            "position": "top"
                        }
                    ],
                    "left": [
                        {
                            "name": "Gene Annotations (hg38)",
                            "created": "2017-07-14T15:27:46.989053Z",
                            "server": "http://higlass.io/api/v1",
                            "tilesetUid": "P0PLbQMwTYGy-5uPIQid7A",
                            "uid": "faxvbXweTle5ba4ESIlZOg",
                            "type": "vertical-gene-annotations",
                            "options": {
                                "labelColor": "black",
                                "labelPosition": "hidden",
                                "plusStrandColor": "blue",
                                "minusStrandColor": "red",
                                "trackBorderWidth": 0,
                                "trackBorderColor": "black",
                                "name": "Gene Annotations (hg38)"
                            },
                            "width": 55,
                            "height": 20,
                            "header": "1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\t12\t13\t14",
                            "position": "left"
                        },
                        {
                            "name": "Chromosome Axis",
                            "created": "2017-07-17T14:16:45.346835Z",
                            "server": "http://higlass.io/api/v1",
                            "tilesetUid": "NyITQvZsS_mOFNlz5C2LJg",
                            "uid": "aXbmQTsMR2ao85gzBVJeRw",
                            "type": "vertical-chromosome-labels",
                            "options": {},
                            "width": 20,
                            "height": 30,
                            "position": "left"
                        }
                    ],
                    "center": [ generateCenterTrack() ],
                    "right": [],
                    "bottom": []
                },
                "layout": generateLayoutForViewItem(viewUid, (extraViewProps && extraViewProps.layout) || null)
            };
        }

        const viewConfigToReturn = {
            "editable": true,
            "zoomFixed": false,
            "trackSourceServers": [
                "http://higlass.io/api/v1" // Needs to be higlass currently for searchbox to work (until have some coord/search tracks or something in 54.86.. server?).
            ],
            "exportViewUrl": "/api/v1/viewconfs",
            "views": [generateViewItem()],
            "zoomLocks" : {
                "locksByViewUid" : {},
                "locksDict" : {}
            },
            "locationLocks" : {
                "locksByViewUid" : {},
                "locksDict" : {}
            }
        };

        //if (extraViewProps && typeof extraViewProps === 'object'){
        //    if (extraViewProps.layout && typeof extraViewProps.layout === 'object'){
        //
        //    }
        //}

        return viewConfigToReturn;
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

    /**
     * Request the ID in this.hiGlassViewConfig, ensure that is available and has min_pos, max_pos,
     * then call either successCallback or fallbackCallback param.
     *
     * @async
     */
    static validateHiGlassData(viewConfig, successCallback, failureCallback = null){
        if (!failureCallback) failureCallback = function(){ console.error('Failed to validate viewconfig:', viewConfig); };

        var track = HiGlassContainer.getAllTracksFromViewConfig(viewConfig)[0] || {}; // Check only 1 track for now.
        var { tilesetUid, uid, server } = track;


        if (!tilesetUid || !server || !uid) {
            failureCallback();
            return false;
        }

        ajax.load(server + '/tileset_info/?d=' + tilesetUid + '&s=' + uid, (resp)=>{
            if (resp[tilesetUid] && resp[tilesetUid].name && Array.isArray(resp[tilesetUid].min_pos) && Array.isArray(resp[tilesetUid].max_pos) && resp[tilesetUid].min_pos.length > 0 && resp[tilesetUid].max_pos.length > 0) {
                successCallback();
            } else {
                failureCallback();
            }
        }, 'GET', failureCallback);
    }

    static defaultProps = {
        'options' : { 'bounded' : true },
        'isValidating' : false,
        'disabled' : false,
        'height' : 400
    }

    constructor(props){
        super(props);
        this.hiGlassElement = null;
        if (typeof props.mounted !== 'boolean'){
            this.state = { 'mounted' : false };
        }
    }

    componentDidMount(){
        if (typeof this.props.mounted === 'boolean'){
            return;
        }
        setTimeout(()=>{ // Allow tab CSS transition to finish (the render afterwards lags browser a little bit).
            HiGlassComponent = require('./../../lib/hglib').HiGlassComponent; //require('higlass/dist/scripts/hglib').HiGlassComponent;
            this.setState({ 'mounted' : true });
        }, 500);
    }

    render(){
        var { disabled, isValidating, viewConfig, tilesetUid, height, options } = this.props;
        let hiGlassInstance = null;
        const mounted = (this.state && this.state.mounted) || (this.props && this.props.mounted) || false;
        if (isValidating || !mounted){
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
            if (!viewConfig) viewConfig = HiGlassContainer.generateViewConfig(tilesetUid, height); // We should generate on-the-fly majority of the time. Allow viewconfig to be passed in mostly only for testing against sample viewconfigs.
            hiGlassInstance = (
                <div className="higlass-instance" style={{ 'transition' : 'none', 'height' : height }} ref={(r)=>{
                    if (r){ // Fade this in. After HiGlass initiates & loads in first tile etc. (about 500ms). For prettiness only.
                        setTimeout(function(){
                            requestAnimationFrame(function(){
                                r.style.transition = null; // Use transition as defined in stylesheet
                                r.style.opacity = 1;
                            });
                        }, 500);
                    }
                }}>
                    <HiGlassComponent
                        //ref={(r)=>{ this.hiGlassElement = r; }}
                        options={options}
                        viewConfig={viewConfig}
                    />
                </div>
            );
        }
        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className="higlass-view-container">
                <link type="text/css" rel="stylesheet" href="https://unpkg.com/higlass@0.10.19/dist/styles/hglib.css" />
                {/*<script src="https://unpkg.com/higlass@0.10.19/dist/scripts/hglib.js"/>*/}
                <div className="higlass-wrapper row" children={hiGlassInstance} />
            </div>
        );
    }

}



export class HiGlassTabView extends React.Component {

    static getTabObject(context, disabled, isValidating, viewConfig=null){
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

    static defaultProps = {
        'isValidating' : false,
        'disabled' : false,
        'height' : 600
    }

    constructor(props){
        super(props);
        this.state = { 'mounted' : false };
        this.hiGlassElement = null;
    }

    componentDidMount(){
        /*
        $script = require('scriptjs');
        $script(["https://unpkg.com/react@16/umd/react.production.min.js"], 'react', ()=>{
            $script(["https://unpkg.com/react-dom@16/umd/react-dom.production.min.js", "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/4.5.1/pixi.min.js"], 'pixi', ()=>{
                $script(["https://unpkg.com/higlass@0.10.19/dist/scripts/hglib.js"], 'higlass', ()=>{
                    setTimeout(()=>{
                        HiGlassComponent = window.hglib.HiGlassComponent; //require('higlass').HiGlassComponent;
                        this.setState({ 'mounted' : true });
                    }, 500);
                });
            });
        });
        */

        /*
        loadJS("https://cdnjs.cloudflare.com/ajax/libs/pixi.js/4.5.1/pixi.min.js").then(()=>{
            loadJS("http://54.86.58.34/assets/scripts-third-party/hglib.js").then(()=>{
                setTimeout(()=>{
                    HiGlassComponent = window.hglib.HiGlassComponent; //require('higlass').HiGlassComponent;
                    this.setState({ 'mounted' : true });
                }, 500);
            });
        });*/

        setTimeout(()=>{ // Allow tab CSS transition to finish (the render afterwards lags browser a little bit).
            HiGlassComponent = require('./../../lib/hglib').HiGlassComponent; //require('higlass/dist/scripts/hglib').HiGlassComponent;
            this.setState({ 'mounted' : true });
        }, 500);
    }

    render(){
        var { disabled, isValidating, viewConfig, context, height } = this.props;
        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className="higlass-tab-view-contents">
                <HiGlassContainer {...{ disabled, isValidating, viewConfig, height }} mounted={this.state.mounted} tilesetUid={context.higlass_uid} />
            </div>
        );
    }
}

