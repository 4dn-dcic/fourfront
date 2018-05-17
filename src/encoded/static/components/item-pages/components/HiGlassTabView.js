import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { isServerSide, ajax } from './../../util';
import { requestAnimationFrame } from './../../viz/utilities';

let HiGlassComponent = null; // Loaded after componentDidMount as not supported server-side.

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


export const DEFAULT_GEN_VIEW_CONFIG_OPTIONS = {
    'height' : 600,
    'baseUrl' : "https://higlass.4dnucleome.org",
    'supplementaryTracksBaseUrl' : "https://higlass.io",
    'initialDomains' : {
        'x' : [31056455, 31254944],
        'y' : [31114340, 31201073]
    },
    'extraViewProps' : {},
    'index' : 0
};


export class HiGlassContainer extends React.Component {

    /**
     * This function is used to generate a full viewConfig for the HiGlassComponent.
     * Only the "center" view/track is dynamically generated, with other tracks currently being hard-coded to higlass.io data (e.g. hg38 tracks).
     * 
     * @param {string|{ tilesetUid: string, extraViewProps: Object.<any> }[]} tilesetUid - A single string (if showing one, full view) or list of objects containing a 'tilesetUid' and 'extraViewProps' - properties which override default 'view' object for each tileset. Use primarily for configuring layouts.
     * @param {Object} options - Additional options for the function.
     * @param {number} [options.height=600] - Default height.
     * @param {string} [options.baseUrl="https://higlass.4dnucleome.org"] - Where to request center tile data from.
     * @param {{ 'x' : number[], 'y' : number[] }} [options.initialDomains] - Initial coordinates. 2 numbers in each array to indicate 'x' and 'y' ranges.
     * @param {{ 'layout' : Object.<boolean|number> }} [options.extraViewProps] - Extra properties to override view in viewConfig with. Is passed down recursively from tilesetUid param if tilesetUid param is list of objects.
     * @param {number} [options.index=0] - Passed down recursively if tilesetUid param is list of objects to help generate unique id for each view.
     * @returns {{ views : { uid : string, initialXDomain : number[], initialYDomain: number[], tracks: { top: {}[], bottom: {}[], left: {}[], center: {}[], right: {}[], bottom: {}[] } }[], trackSourceServers: string[] }} - The ViewConfig for HiGlass.
     */
    static generateViewConfig(tilesetUid, genomeAssembly = 'GRCh38', options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){

        options = _.extend({}, DEFAULT_GEN_VIEW_CONFIG_OPTIONS, options); // Use defaults for non-supplied options

        if (Array.isArray(tilesetUid) && _.every(tilesetUid, function(uid){
            return (uid && typeof uid === 'object' && typeof uid.tilesetUid === 'string');
        })){ // Merge views into 1 array
            var allConfigs = _.map(tilesetUid, function(uidObj, idx){ return HiGlassContainer.generateViewConfig(uidObj.tilesetUid,genomeAssembly,  _.extend({}, options, { 'index' : idx, 'extraViewProps' : uidObj.extraViewProps })); });
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

        var { height, baseUrl, supplementaryTracksBaseUrl, initialDomains, extraViewProps, index } = options;

        supplementaryTracksBaseUrl = supplementaryTracksBaseUrl || baseUrl;

        const centerTrackHeight = height - 50;

        //track definitions, default to human
        var annotation = {'name':'Gene Annotations (hg38)', 'tilesetUid': 'P0PLbQMwTYGy-5uPIQid7A'};
        var chromosome = {'name':'Chromosome Axis', 'tilesetUid': 'NyITQvZsS_mOFNlz5C2LJg', 'infoid': 'hg38'}
        if (genomeAssembly == 'GRCm38'){
            // mouse
            annotation.name = 'Gene Annotation (mm10)';
            annotation.tilesetUid = 'QDutvmyiSrec5nX4pA5WGQ';
            chromosome.tilesetUid = 'EtrWT0VtScixmsmwFSd7zg';
            chromosome.infoid = 'mm10';
        }

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
                    "autocompleteServer": supplementaryTracksBaseUrl + "/api/v1",
                    "autocompleteId": "P0PLbQMwTYGy-5uPIQid7A",
                    "chromInfoServer": supplementaryTracksBaseUrl + "/api/v1",
                    "chromInfoId": chromosome.infoid,
                    "visible": true
                },
                "tracks": {
                    "top": [
                        {
                            "name": annotation.name,
                            "created": "2017-07-14T15:27:46.989053Z",
                            "server": supplementaryTracksBaseUrl + "/api/v1",
                            "tilesetUid": annotation.tilesetUid,
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
                            "name": chromosome.name,
                            "created": "2017-07-17T14:16:45.346835Z",
                            "server": supplementaryTracksBaseUrl + "/api/v1",
                            "tilesetUid": chromosome.tilesetUid,
                            "type": "horizontal-chromosome-labels",
                            "options": {},
                            "width": 20,
                            "height": 30,
                            "position": "top"
                        }
                    ],
                    "left": [
                        {
                            "name": annotation.name,
                            "created": "2017-07-14T15:27:46.989053Z",
                            "server": supplementaryTracksBaseUrl + "/api/v1",
                            "tilesetUid": annotation.tilesetUid,
                            "uid": "faxvbXweTle5ba4ESIlZOg",
                            "type": "vertical-gene-annotations",
                            "options": {
                                "labelColor": "black",
                                "labelPosition": "hidden",
                                "plusStrandColor": "blue",
                                "minusStrandColor": "red",
                                "trackBorderWidth": 0,
                                "trackBorderColor": "black",
                                "name": annotation.name
                            },
                            "width": 55,
                            "height": 20,
                            "header": "1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\t12\t13\t14",
                            "position": "left"
                        },
                        {
                            "name": chromosome.name,
                            "created": "2017-07-17T14:16:45.346835Z",
                            "server": supplementaryTracksBaseUrl + "/api/v1",
                            "tilesetUid": chromosome.tilesetUid,
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
                supplementaryTracksBaseUrl + "/api/v1" // Needs to be higlass currently for searchbox to work (until have some coord/search tracks or something in 54.86.. server?).
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
        var { disabled, isValidating, viewConfig, tilesetUid, genomeAssembly, height, options } = this.props;
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
            if (!viewConfig) viewConfig = HiGlassContainer.generateViewConfig(tilesetUid, genomeAssembly, height); // We should generate on-the-fly majority of the time. Allow viewconfig to be passed in mostly only for testing against sample viewconfigs.
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
            'tab' : <span><i className={"icon icon-fw icon-" + (isValidating ? 'circle-o-notch icon-spin' : 'television')}/> HiGlass Browser</span>,
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
                <HiGlassContainer {...{ disabled, isValidating, viewConfig, height }} mounted={this.state.mounted} tilesetUid={context.higlass_uid} genomeAssembly={context.genome_assembly} />
            </div>
        );
    }
}

