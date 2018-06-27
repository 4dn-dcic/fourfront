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


/**
 * Singleton class used for communicating with LocalStorage
 */
export class HiGlassLocalStorage {

    static instances = {}

    static DEFAULT_PREFIX = "higlass_4dn_data_";

    static validators = {
        'domains' : function(val){
            if (!val || !Array.isArray(val.x) || !Array.isArray(val.y)) return false;
            if (val.x.length != 2) return false;
            if (val.y.length != 2) return false;
            return true;
        }
    }

    constructor(prefix = HiGlassLocalStorage.DEFAULT_PREFIX){
        if (HiGlassLocalStorage.instances[prefix]){
            return HiGlassLocalStorage.instances[prefix];
        }

        if (!this.doesLocalStorageExist()){
            return null;
        }

        this.prefix = prefix;
        HiGlassLocalStorage.instances[prefix] = this;

        return HiGlassLocalStorage.instances[prefix];
    }

    doesLocalStorageExist(){
        var someVariable = 'helloworld';
        try {
            localStorage.setItem(someVariable, someVariable);
            localStorage.removeItem(someVariable);
            return true;
        } catch(e) {
            return false;
        }
    }

    getDomains(){
        var localStorageKey = this.prefix + 'domains';
        var domains = localStorage.getItem(localStorageKey);
        if (domains) domains = JSON.parse(domains);
        if (!HiGlassLocalStorage.validators.domains(domains)){
            localStorage.removeItem(localStorageKey);
            console.error('Domains failed validation, removing key & value - ' + localStorageKey, domains);
            return null;
        }
        return domains || null;
    }

    /**
     * Save domain range location to localStorage.
     *
     * @param {{ 'x' : number[], 'y' : number[] }} domains - Domains to save from viewConfig.
     */
    saveDomains(domains){
        if (!HiGlassLocalStorage.validators.domains(domains)){
            console.error('Invalid value for domains passed in', domains);
            return false;
        }
        localStorage.setItem(this.prefix + 'domains', JSON.stringify(domains));
        return true;
    }
}

export const DEFAULT_GEN_VIEW_CONFIG_OPTIONS = {
    'height' : 600,
    'baseUrl' : "https://higlass.4dnucleome.org",
    'supplementaryTracksBaseUrl' : "https://higlass.io",
    'initialDomains' : {
        'x' : [31056455, 31254944],
        'y' : [31114340, 31201073]
    },
    'extraViewProps' : {},
    'genomeAssembly' : 'GRCh38',
    'index' : 0,
    'storagePrefix' : HiGlassLocalStorage.DEFAULT_PREFIX,
    'groupID' : null
};


export class HiGlassContainer extends React.PureComponent {


    static generateViewConfigForMultipleViews(tilesetUidObjects, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){

        // Generate all configs normally
        var allConfigs = _.map(tilesetUidObjects, function(uidObj, idx){
            return HiGlassContainer.generateViewConfig(uidObj.tilesetUid, _.extend({}, options, _.omit(uidObj, 'tilesetUid'), { 'index' : idx }));
        });

        // Then merge them into one primary config, locking their views/zooms together
        var primaryConf = allConfigs[0];
        var locationLockID = 'LOCATION_LOCK_ID';    // Arbitrary unique ID.
        var zoomLockID = 'ZOOM_LOCK_ID';            // Arbitrary unique ID.

        primaryConf.locationLocks.locksByViewUid[primaryConf.views[0].uid] = locationLockID;
        primaryConf.zoomLocks.locksByViewUid[primaryConf.views[0].uid] = zoomLockID;

        for (var i = 1; i < allConfigs.length; i++){ // Skip first one (== primaryConf), merge into it
            primaryConf.views.push(allConfigs[i].views[0]);
            primaryConf.locationLocks.locksByViewUid[allConfigs[i].views[0].uid] = locationLockID;
            primaryConf.zoomLocks.locksByViewUid[allConfigs[i].views[0].uid] = zoomLockID;
        }

        // Forgot what this is for but is in viewConfigs after UI-initiated locking
        primaryConf.locationLocks.locksDict[locationLockID] = _.extend(_.object(_.map(_.pluck(primaryConf.views, 'uid'), function(uid){
            return [uid, [1550000000, 1550000000, 3030000]]; // TODO: Put somewhere else, figure out what these values should be.
        })), { 'uid' : locationLockID });

        primaryConf.zoomLocks.locksDict[zoomLockID] = _.extend(_.object(_.map(_.pluck(primaryConf.views, 'uid'), function(uid){
            return [uid, [1550000000, 1550000000, 3030000]]; // TODO: Put somewhere else, figure out what these values should be.
        })), { 'uid' : zoomLockID });

        return primaryConf;
    }

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
    static generateViewConfig(tilesetUid, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){

        options = _.extend({}, DEFAULT_GEN_VIEW_CONFIG_OPTIONS, options); // Use defaults for non-supplied options
        // Make sure to override non-falsy-allowed values with defaults.
        _.forEach(['baseUrl', 'supplementaryTracksBaseUrl', 'initialDomains', 'genomeAssembly', 'extraViewProps'], function(k){
            options[k] = options[k] || DEFAULT_GEN_VIEW_CONFIG_OPTIONS[k];
        });

        // If we're provided a list of { tilesetUid[, extraViewProps] } objects instead of string, generate HiGlass view w/ multiple panels/views.
        if (Array.isArray(tilesetUid) && _.every(tilesetUid, function(uid){  return (uid && typeof uid === 'object' && typeof uid.tilesetUid === 'string'); })){
            return HiGlassContainer.generateViewConfigForMultipleViews(tilesetUid, options); // Merge views into 1 array
        }

        // Continuing code assumes a string for tilesetUid.

        if (!tilesetUid || typeof tilesetUid !== 'string') throw new Error('No tilesetUid param supplied.');

        var { height, baseUrl, supplementaryTracksBaseUrl, initialDomains, extraViewProps, index, storagePrefix } = options;

        if (typeof options.groupID === 'string'){ // Handle groupID w/o needing to rename/transform prior to this function.
            storagePrefix = HiGlassLocalStorage.DEFAULT_PREFIX + options.groupID + '_';
        }

        var storage = new HiGlassLocalStorage(storagePrefix);
        initialDomains = (storage && storage.getDomains()) || initialDomains;

        supplementaryTracksBaseUrl = supplementaryTracksBaseUrl || baseUrl;

        const centerTrackHeight = height - 50;

        // Track definitions, default to human. Potential ToDos: Move outside of function into dictionary (? low priority)
        var annotation = {
            'name':         'Gene Annotations (hg38)',
            'tilesetUid':   'P0PLbQMwTYGy-5uPIQid7A'
        };
        var chromosome = {
            'name':         'Chromosome Axis',
            'tilesetUid':   'NyITQvZsS_mOFNlz5C2LJg',
            'infoid':       'hg38'
        };

        if (options.genomeAssembly == 'GRCm38'){ // mouse
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
                            //"created": "2017-07-14T15:27:46.989053Z",
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
                            //"width": 20,
                            "height": 55,
                            "header": "1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\t12\t13\t14",
                            "position": "top"
                        },
                        {
                            "name": chromosome.name,
                            //"created": "2017-07-17T14:16:45.346835Z",
                            "server": supplementaryTracksBaseUrl + "/api/v1",
                            "tilesetUid": chromosome.tilesetUid,
                            "type": "horizontal-chromosome-labels",
                            "options": {},
                            //"width": 20,
                            "height": 30,
                            "position": "top"
                        }
                    ],
                    "left": [
                        {
                            "name": annotation.name,
                            //"created": "2017-07-14T15:27:46.989053Z",
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
                            //"height": 20,
                            "header": "1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\t12\t13\t14",
                            "position": "left"
                        },
                        {
                            "name": chromosome.name,
                            //"created": "2017-07-17T14:16:45.346835Z",
                            "server": supplementaryTracksBaseUrl + "/api/v1",
                            "tilesetUid": chromosome.tilesetUid,
                            "uid": "aXbmQTsMR2ao85gzBVJeRw",
                            "type": "vertical-chromosome-labels",
                            "options": {},
                            "width": 20,
                            //"height": 30,
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
        'height' : 400,
        'viewConfig' : null,
        'groupID' : null
    }

    constructor(props){
        super(props);
        this.initializeStorage = this.initializeStorage.bind(this);
        this.instanceContainerRefFunction = this.instanceContainerRefFunction.bind(this);
        this.getPrimaryViewID = this.getPrimaryViewID.bind(this);
        this.bindHiGlassEventHandlers = this.bindHiGlassEventHandlers.bind(this);
        this.updateCurrentDomainsInStorage = _.debounce(this.updateCurrentDomainsInStorage.bind(this), 200);

        this.initializeStorage(props); // Req'd before this.storagePrefix can be referenced.

        this.state = {
            'viewConfig' : props.viewConfig || HiGlassContainer.generateViewConfig(props.tilesetUid, _.pick(props, 'height', 'genomeAssembly', 'groupID'))
        };

        if (typeof props.mounted !== 'boolean'){
            this.state.mounted = false;
        }
    }

    initializeStorage(props = this.props){
        this.storagePrefix = props.groupID ? HiGlassLocalStorage.DEFAULT_PREFIX + props.groupID + '_' : HiGlassLocalStorage.DEFAULT_PREFIX; // Cache it
        this.storage = new HiGlassLocalStorage(this.storagePrefix);
    }

    componentDidMount(){
        if (typeof this.props.mounted === 'boolean'){
            return;
        }
        setTimeout(()=>{ // Allow tab CSS transition to finish (the render afterwards lags browser a little bit).
            if (!HiGlassComponent) {
                window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility
                HiGlassComponent = require('higlass/dist/scripts/hglib').HiGlassComponent;
            }
            this.setState({ 'mounted' : true });
        }, 500);
    }

    componentWillReceiveProps(nextProps){
        var nextState = {};

        if (nextProps.groupID !== this.props.groupID) {
            this.initializeStorage(nextProps); // Doesn't update own HiGlassComponent (or its viewConfig), but starts saving location to new groupID instance. May change depending on requirements.
        }

        if (nextProps.tilesetUid !== this.props.tilesetUid || nextProps.genomeAssembly !== this.props.genomeAssembly || nextProps.height !== this.props.height || nextProps.viewConfig !== this.props.viewConfig){
            nextState.viewConfig = nextProps.viewConfig || HiGlassContainer.generateViewConfig(nextProps.tilesetUid, _.pick(nextProps, 'height', 'genomeAssembly', 'groupID'));
        }
        if (_.keys(nextState).length > 0){
            this.setState(nextState);
        }
    }

    componentDidUpdate(pastProps, pastState){
        var hiGlassComponentExists = !!(this.refs.hiGlassComponent);
        if (!this.hiGlassComponentExists && hiGlassComponentExists){
            this.bindHiGlassEventHandlers();
            console.log('Binding event handlers to HiGlassComponent.');
        }
        this.hiGlassComponentExists = hiGlassComponentExists;
    }

    /**
     * Fade in div element containing HiGlassComponent after HiGlass initiates & loads in first tile etc. (about 500ms).
     * For prettiness only.
     */
    instanceContainerRefFunction(element){
        if (element){ // Fade this in. After HiGlass initiates & loads in first tile etc. (about 500ms). For prettiness only.
            setTimeout(function(){
                requestAnimationFrame(function(){
                    element.style.transition = null; // Use transition as defined in stylesheet
                    element.style.opacity = 1;
                });
            }, 500);
        }
    }

    getPrimaryViewID(){
        if (!this.state.viewConfig || !Array.isArray(this.state.viewConfig.views) || this.state.viewConfig.views.length === 0){
            return null;
        }
        return _.uniq(_.pluck(this.state.viewConfig.views, 'uid'))[0];
    }

    updateCurrentDomainsInStorage(){
        if (this.storage && this.refs.hiGlassComponent){
            var hiGlassComponent = this.refs.hiGlassComponent;
            var viewID = this.getPrimaryViewID();
            var hiGlassDomains = hiGlassComponent.api.getLocation(viewID);
            if (hiGlassDomains && Array.isArray(hiGlassDomains.xDomain) && Array.isArray(hiGlassDomains.yDomain) && hiGlassDomains.xDomain.length === 2 && hiGlassDomains.yDomain.length === 2){
                this.storage.saveDomains({ 'x' : hiGlassDomains.xDomain, 'y' : hiGlassDomains.yDomain });
            }
        }
    }

    /**
     * Binds functions to HiGlass events.
     * 
     * - this.updateCurrentDomainsInStorage is bound to 'location' change event.
     * - TODO: onDrag/Drop stuff.
     */
    bindHiGlassEventHandlers(){
        if (this.state.viewConfig && this.refs.hiGlassComponent){
            var hiGlassComponent = this.refs.hiGlassComponent,
                viewID = this.getPrimaryViewID();
            hiGlassComponent.api.on('location', this.updateCurrentDomainsInStorage, viewID);
        } else {
            console.warn('No HiGlass instance available.');
        }
    }

    render(){
        var { disabled, isValidating, tilesetUid, height, width, options, style, className } = this.props;
        let hiGlassInstance = null;
        const mounted = (this.state && this.state.mounted) || (this.props && this.props.mounted) || false;
        if (isValidating || !mounted){
            var placeholderStyle = (typeof height === 'number' && height >= 140) ? { 'paddingTop' : (height / 2) - 70 } : null;
            hiGlassInstance = (
                <div className="col-sm-12 text-center mt-4" style={placeholderStyle}>
                    <h3>
                        <i className="icon icon-lg icon-television"/>
                    </h3>
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
                <div className="higlass-instance" style={{ 'transition' : 'none', 'height' : height, 'width' : width || null }} ref={this.instanceContainerRefFunction}>
                    <HiGlassComponent options={options} viewConfig={this.state.viewConfig} width={width} ref="hiGlassComponent" />
                </div>
            );
        }

        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className={"higlass-view-container" + (className ? ' ' + className : '')} style={style}>
                <link type="text/css" rel="stylesheet" href="https://unpkg.com/higlass@1.0.0/dist/styles/hglib.css" />
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
            window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility
            if (!HiGlassComponent) {
                HiGlassComponent = require('higlass/dist/scripts/hglib').HiGlassComponent;
            }
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


