import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { isServerSide, ajax, console } from './../../util';
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
    'extraViewProps' : [],
    //'genomeAssembly' : 'GRCh38',
    'index' : 0,
    'storagePrefix' : HiGlassLocalStorage.DEFAULT_PREFIX,
    'groupID' : null,
    'baseViewProps' : null,
    'excludeAnnotationTracks' : false
};

/** Dictionary (Object) of functions for building out a viewConfig. Uses common 'options' dictionary. */
export const HiGlassConfigurator = {

    /**
     * AJAX request tilesetUid from higlass server then call either successCallback or fallbackCallback param.
     *
     * @async
     */
    validateTilesetUid : function(tilesetUid, successCallback, failureCallback = null, server = null){
        if (!failureCallback) failureCallback = function(){ console.error('Failed to validate tilesetUid:', tilesetUid, server); };
        if (!server) server = DEFAULT_GEN_VIEW_CONFIG_OPTIONS.baseUrl;

        if (!tilesetUid || !server) {
            failureCallback();
            return false;
        }

        if (Array.isArray(tilesetUid)){
            successCallback = _.after(tilesetUid.length - 1, successCallback);
        }

        function doValidation(currTilesetUid){
            ajax.load(server + '/api/v1/tileset_info/?d=' + currTilesetUid, (resp)=>{
                if (resp[tilesetUid] && resp[tilesetUid].name && Array.isArray(resp[tilesetUid].min_pos) && Array.isArray(resp[tilesetUid].max_pos) && resp[tilesetUid].min_pos.length > 0 && resp[tilesetUid].max_pos.length > 0) {
                    successCallback();
                } else {
                    failureCallback();
                }
            }, 'GET', failureCallback);
        }

        if (Array.isArray(tilesetUid)){
            if (tilesetUid.length === 0) {
                failureCallback();
                return;
            } else if (tilesetUid[0] && typeof tilesetUid[0] === 'object' && tilesetUid[0].tilesetUid){
                tilesetUid = _.pluck(tilesetUid, 'tilesetUid');
            }
            if (!_.every(tilesetUid, function(tuid){ return typeof tuid === 'string'; })) {
                failureCallback();
                return;
            }
            _.forEach(tilesetUid, doValidation);
        }
        doValidation(tilesetUid);
    },

    getInitialDomainsFromStorage : function(options){
        var storagePrefix = options.storagePrefix || HiGlassLocalStorage.DEFAULT_PREFIX,
            initialDomains = options.initialDomains || DEFAULT_GEN_VIEW_CONFIG_OPTIONS.initialDomains;

        if (typeof options.groupID === 'string'){ // Handle groupID w/o needing to rename/transform prior to this function.
            storagePrefix = HiGlassLocalStorage.DEFAULT_PREFIX + options.groupID + '_';
        }

        // Grab existing singleton HiGlassLocalStorage instance via constructor (or create new) in order to grab domains.
        var storage = new HiGlassLocalStorage(storagePrefix);
        return (storage && storage.getDomains()) || initialDomains;
    },

    generateViewConfigBase : function(options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){
        return _.extend({
            "editable"  : true,
            "zoomFixed" : false,
            "exportViewUrl": "/api/v1/viewconfs",
            "zoomLocks" : {
                "locksByViewUid" : {},
                "locksDict" : {}
            },
            "locationLocks" : {
                "locksByViewUid" : {},
                "locksDict" : {}
            },
            "trackSourceServers": [
                options.supplementaryTracksBaseUrl + "/api/v1" // Needs to be higlass currently for searchbox to work (until have some coord/search tracks or something in 54.86.. server?).
            ]
        }, options.viewConfigBase || {});
    },

    generateViewConfigViewBase : function(viewUID = null, chromosomeAndAnnotation = {}, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){
        var { index, extraViewProps, baseUrl, supplementaryTracksBaseUrl } = options;
        viewUID = viewUID || "view-4dn-" + index;

        var genomeSearchUrl = supplementaryTracksBaseUrl || baseUrl; // Currently available on HiGlass servers.
        var initialDomains = HiGlassConfigurator.getInitialDomainsFromStorage(options);

        return _.extend({
            "uid" : "view-4dn-" + options.index,
            "layout": HiGlassConfigurator.generateDefaultLayoutForViewItem(viewUID, (extraViewProps && extraViewProps.layout) || null),
            "initialXDomain": initialDomains.x,
            "initialYDomain" : initialDomains.y,
            "autocompleteSource": "/api/v1/suggest/?d=P0PLbQMwTYGy-5uPIQid7A&",
            "genomePositionSearchBox": {
                "autocompleteServer": genomeSearchUrl + "/api/v1",
                "autocompleteId": "P0PLbQMwTYGy-5uPIQid7A",
                "chromInfoServer": genomeSearchUrl + "/api/v1",
                "chromInfoId": (chromosomeAndAnnotation && chromosomeAndAnnotation.chromosome && chromosomeAndAnnotation.chromosome.infoid) || "NOT SET",
                "visible": true
            },

            "editable"  : true,
            "zoomFixed" : false,
            "exportViewUrl": "/api/v1/viewconfs",
            "zoomLocks" : {
                "locksByViewUid" : {},
                "locksDict" : {}
            },
            "locationLocks" : {
                "locksByViewUid" : {},
                "locksDict" : {}
            },
            "trackSourceServers": [
                options.supplementaryTracksBaseUrl + "/api/v1" // Needs to be higlass currently for searchbox to work (until have some coord/search tracks or something in 54.86.. server?).
            ]
        }, options.viewConfigViewBase || {});
    },

    chromosomeAndAnnotationFromGenomeAssembly : function(genomeAssembly = 'GRCh38'){
        if (genomeAssembly === 'GRCh38'){ // Human
            return {
                'annotation' : {
                    'name':         'Gene Annotations (hg38)',
                    'tilesetUid':   'P0PLbQMwTYGy-5uPIQid7A'
                },
                'chromosome' : {
                    'name':         'Chromosome Axis',
                    'tilesetUid':   'NyITQvZsS_mOFNlz5C2LJg',
                    'infoid':       'hg38'
                }
            };
        } else if (genomeAssembly == 'GRCm38') { // Mouse
            return {
                'annotation' : {
                    'name':         'Gene Annotations (mm10)',
                    'tilesetUid':   'QDutvmyiSrec5nX4pA5WGQ'
                },
                'chromosome' : {
                    'name':         'Chromosome Axis',
                    'tilesetUid':   'EtrWT0VtScixmsmwFSd7zg',
                    'infoid':       'mm10'
                }
            };
        } else {
            throw new Error("No genome assembly supplied.");
        }
    },

    generateDefaultLayoutForViewItem(viewItemID, extraLayout = {}){
        return _.extend({
            'moved' : false,
            'static' : true,
            'i' : viewItemID,
            'w' : 12, 'h' : 12,
            'x' : 0,  'y' : 0
        }, extraLayout);
    },


    // ViewConfig

    isTilesetUidAValidListOfObjects : function(tilesetUid){
        return (Array.isArray(tilesetUid) && _.every(tilesetUid, function(uidObj){  return (uidObj && typeof uidObj === 'object' && typeof uidObj.tilesetUid === 'string'); })) || false;
    },

    generateViewConfigForMultipleViews : function(viewConfigGenFxn = HiGlassConfigurator.mcool.generateViewConfig, files, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){

        // Generate all configs normally
        var allConfigs = _.map(files, function(file, idx){
            return viewConfigGenFxn([file], _.extend({}, options, { 'index' : idx }));
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
    },

    generateTopAnnotationTrack : function(trackBaseServer, { chromosome, annotation }){
        return {
            "name": annotation.name,
            //"created": "2017-07-14T15:27:46.989053Z",
            "server": trackBaseServer + "/api/v1",
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
            "minHeight" : 55,
            "height": 55,
            "header": "1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\t12\t13\t14",
            "position": "top",
            "orientation": "1d-horizontal",
            "uid" : "top-annotation-track"
        };
    },

    generateTopChromosomeTrack : function(trackBaseServer, { chromosome, annotation }){
        return {
            "name": chromosome.name,
            //"created": "2017-07-17T14:16:45.346835Z",
            "server": trackBaseServer + "/api/v1",
            "tilesetUid": chromosome.tilesetUid,
            "type": "horizontal-chromosome-labels",
            "local": true,
            "minHeight": 30,
            "thumbnail": null,
            "options": {},
            //"width": 20,
            "height": 30,
            "position": "top",
            "orientation": "1d-horizontal",
            "uid" : "top-chromosome-track"
        };
    },

    // The following sub-objects' 'generateViewConfig' functions take in a tilesetUid (str or list of objects) + and options object (super-set of 'props' passed to HiGlassContainer).

    mcool : {

        generateCenterTrack : function(file, height, trackBaseServer){
            /*
            var tilesetUidStr;
            if (typeof file.higlass_uid !== 'string') {
                console.warn('File does not have higlass_uid, attempting to use its UUID instead.', file.uuid, file);
                tilesetUidStr = file.uuid;
                if (!tilesetUidStr) throw new Error("No UUID or higlass_uid available on file.");
            } else {
                tilesetUidStr = file.higlass_uid;
            }
            */
            return {
                "uid": "center-mcool-track",
                "type": "combined",
                "height": height,
                "contents": [
                    {
                        "server": trackBaseServer + "/api/v1",
                        "tilesetUid": file.higlass_uid,
                        "type": "heatmap",
                        "position": "center",
                        "uid": "GjuZed1ySGW1IzZZqFB9BA", // ? Unnecessary?
                        "name" : file.display_title
                    }
                ],
                "position": "center"
            };
        },

        generateLeftAnnotationTrack : function(trackBaseServer, { chromosome, annotation }){
            return {
                "name": annotation.name,
                //"created": "2017-07-14T15:27:46.989053Z",
                "server": trackBaseServer + "/api/v1",
                "tilesetUid": annotation.tilesetUid,
                "uid": "left-annotation-track",
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
                "orientation": "1d-vertical",
                "position": "left"
            };
        },

        generateLeftChromosomeTrack : function(trackBaseServer, { chromosome, annotation }){
            return {
                "name": chromosome.name,
                //"created": "2017-07-17T14:16:45.346835Z",
                "server": trackBaseServer + "/api/v1",
                "tilesetUid": chromosome.tilesetUid,
                "uid": "left-chromosome-track",
                "type": "vertical-chromosome-labels",
                "options": {},
                "width": 20,
                "minWidth" : 20,
                "orientation": "1d-vertical",
                //"height": 30,
                "position": "left"
            };
        },

        generateView : function(file, options){
            var { height, baseUrl, supplementaryTracksBaseUrl, extraViewProps, index } = options;

            if (Array.isArray(extraViewProps)){
                extraViewProps = extraViewProps[index];
            }

            // Track definitions, default to human.
            var chromosomeAndAnnotation = HiGlassConfigurator.chromosomeAndAnnotationFromGenomeAssembly(file.genome_assembly);
            var genomeSearchUrl = supplementaryTracksBaseUrl || baseUrl; // Currently available on HiGlass servers.
    
            return _.extend(HiGlassConfigurator.generateViewConfigViewBase("view-4dn-mcool-" + index, chromosomeAndAnnotation, options), {
                "tracks": {
                    "top" : [
                        HiGlassConfigurator.generateTopAnnotationTrack(genomeSearchUrl, chromosomeAndAnnotation),
                        HiGlassConfigurator.generateTopChromosomeTrack(genomeSearchUrl, chromosomeAndAnnotation)
                    ],
                    "left" : [
                        HiGlassConfigurator.mcool.generateLeftAnnotationTrack(genomeSearchUrl, chromosomeAndAnnotation),
                        HiGlassConfigurator.mcool.generateLeftChromosomeTrack(genomeSearchUrl, chromosomeAndAnnotation)
                    ],
                    "center": [ HiGlassConfigurator.mcool.generateCenterTrack(file, height - 50, baseUrl) ],
                    "right": [],
                    "bottom": []
                }
            });
        },

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
        generateViewConfig : function(files, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){

            options = _.extend({}, DEFAULT_GEN_VIEW_CONFIG_OPTIONS, options); // Use defaults for non-supplied options

            // Make sure to override non-falsy-allowed values with defaults.
            _.forEach(['baseUrl', 'supplementaryTracksBaseUrl', 'initialDomains', 'genomeAssembly', 'extraViewProps'], function(k){
                options[k] = options[k] || DEFAULT_GEN_VIEW_CONFIG_OPTIONS[k];
            });

            if (!Array.isArray(files)) throw new Error('Files must be an array');
            if (files.length === 0) throw new Error('Files list must have at least 1 file.');

            // If we have more than one file, generate multiple views -- 1 per file.
            if (files.length > 1){
                return HiGlassConfigurator.generateViewConfigForMultipleViews(HiGlassConfigurator.mcool.generateViewConfig, files, options); // Merge views into 1 array
            }

            // Continuing code assumes a single MCOOL file.

            const file = files[0];

            if (!file) throw new Error('No file supplied.');
            if (file.file_format !== 'mcool') console.error('File does not have "file_format" : "mcool"!');

            return _.extend(HiGlassConfigurator.generateViewConfigBase(options), {
                "views": [ HiGlassConfigurator.mcool.generateView(file, options) ]
            });
        }

    },

    bigwig : {

        generateTopContentTrack : function(bigWigFile, options, { chromosome, annotation }, idx, all){

            var trackHeight = Math.min(Math.max(Math.floor((options.height - 150) / all.length), 20), 150),
                styleOptions = {
                    "lineStrokeColor": "black",
                    "labelPosition": "topLeft",
                    "labelColor": "black",
                    "labelTextOpacity": 0.3,
                    "lineStrokeWidth": 1.25,
                    "trackBorderWidth": 0,
                    "trackBorderColor": "black",
                    "showMousePosition": false,
                    "mousePositionColor": "#999999",
                    "showTooltip": false
                };

            var hasExpSetInfo = !!(bigWigFile.from_experiment && bigWigFile.from_experiment.from_experiment_set && bigWigFile.from_experiment.from_experiment_set.accession);

            if (hasExpSetInfo){
                var isFromExperiment = bigWigFile.from_experiment.accession !== 'NONE';
                if (!isFromExperiment){
                    styleOptions.lineStrokeWidth = 2;
                    //styleOptions.showTooltip = true;
                    styleOptions.labelTextOpacity = 1;
                    styleOptions.labelColor = '#888';
                } else {
                    styleOptions.lineStrokeColor = '#333';
                    styleOptions.labelColor = '#888';
                    styleOptions.labelTextOpacity = 0.5;
                }
            }

            return {
                "uid": "bigwig-content-track-" + idx,
                "tilesetUid": bigWigFile.higlass_uid,
                "height": trackHeight,
                "position": "top",
                "server": options.baseUrl + "/api/v1",
                "type": "horizontal-line",
                "options": _.extend(styleOptions, {
                    "name" : bigWigFile.display_title,
                    "valueScaling": "linear",
                    "coordSystem": chromosome.infoid || "NOT SET",
                    "axisPositionHorizontal": "right",
                })
            };
        },

        generateView : function(files, options){
            var { height, baseUrl, supplementaryTracksBaseUrl, extraViewProps, index, excludeAnnotationTracks } = options;

            // Track definitions, default to human.
            var commonGenomeAssembly = _.uniq(_.filter(_.pluck(files, 'genome_assembly')))[0]; // Use first for now.
            var chromosomeAndAnnotation = HiGlassConfigurator.chromosomeAndAnnotationFromGenomeAssembly(commonGenomeAssembly);

            var genomeSearchUrl = supplementaryTracksBaseUrl || baseUrl; // Currently available on HiGlass servers.

            var initialDomains = HiGlassConfigurator.getInitialDomainsFromStorage(options);

            const tracks = []; // Will be used as single 'top' tracks list.

            if (!excludeAnnotationTracks) {
                tracks.push(HiGlassConfigurator.generateTopAnnotationTrack(genomeSearchUrl, chromosomeAndAnnotation));
                tracks.push(HiGlassConfigurator.generateTopChromosomeTrack(genomeSearchUrl, chromosomeAndAnnotation));
            }

            _.forEach(files, function(file, idx, all){
                tracks.push(
                    HiGlassConfigurator.bigwig.generateTopContentTrack(file, options, chromosomeAndAnnotation, idx, all)
                );
            });

            return _.extend(HiGlassConfigurator.generateViewConfigViewBase("view-4dn-bigwig-" + index, chromosomeAndAnnotation, options), {
                "tracks": {
                    "top" : tracks,
                    "left" : [],
                    "center": [],
                    "right": [],
                    "bottom": []
                },
            });
        },

        generateViewConfig : function(files, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){
            options = _.extend({}, DEFAULT_GEN_VIEW_CONFIG_OPTIONS, options); // Use defaults for non-supplied options

            // Make sure to override non-falsy-allowed values with defaults.
            _.forEach(['baseUrl', 'supplementaryTracksBaseUrl', 'initialDomains', 'genomeAssembly', 'extraViewProps'], function(k){
                options[k] = options[k] || DEFAULT_GEN_VIEW_CONFIG_OPTIONS[k];
            });

            if (!Array.isArray(files)) throw new Error('Files must be an array');
            if (files.length === 0) throw new Error('Files list must have at least 1 file.');
            var isMultipleViews = !!(Array.isArray(files[0])); // If we have files in nested arrays, then assume we subdivide them into multiple views.

            if (isMultipleViews){
                throw new Error('Subidividing bigwig lists into multiple views is not supported __yet__.');
                // TODO - generateMultipleViewConfigs
            }

            return _.extend(HiGlassConfigurator.generateViewConfigBase(options), {
                "views": [ HiGlassConfigurator.bigwig.generateView(files, options) ]
            });
        }

    }



};


export class HiGlassContainer extends React.PureComponent {

    /**
     * Using props (or object with same keys) from HiGlassContainer, determines which viewConfig generation function to return.
     *
     * Only used if no viewConfig passed into HiGlassContainer directly.
     * Currently uses fileFormat predominantly.
     *
     * @param {{ fileFormat: string, generateViewConfigUsingFxn : function }} props - Props (or similar) from HiGlassContainer.
     * @returns {function} Function to generate a viewConfig with, which itself must be passed a tilesetUid (str or obj) and options.
     */
    static whichGenerateViewConfigFxnToUse({ generateViewConfigUsingFxn, files }){

        let fxnToUse = generateViewConfigUsingFxn;
        if (!fxnToUse){

            var allFileFormats = _.uniq(_.filter(_.pluck(files, 'file_format'))),
                fileFormat = allFileFormats[0];

            var fxnByFormatDict = {
                'mcool' : HiGlassConfigurator.mcool.generateViewConfig,
                'bw'    : HiGlassConfigurator.bigwig.generateViewConfig,
                'bg'    : HiGlassConfigurator.bigwig.generateViewConfig
            };

            if (allFileFormats.length === 1){
                fxnToUse = fxnByFormatDict[fileFormat];
            } else {
                console.warn("Multiple file formats detected in files passed to HiGlass, using viewConfig generation function for first file_format only for now.", allFileFormats);
                fxnToUse = fxnByFormatDict[fileFormat];
            }
        }
        if (typeof fxnToUse !== 'function'){
            throw Error('Could not determine viewConfig generation function to use.');
        }
        return fxnToUse;
    }

    static does2DTrackExist(viewConfig){

        var found = false;
        
        _.forEach(viewConfig.views || [], function(view){
            if (found) return;
            _.forEach((view.tracks && view.tracks.center) || [], function(centerTrack){
                if (found) return;
                if (centerTrack.position === 'center') {
                    found = true;
                }
            });
        });

        return found;
    }

    static defaultProps = {
        'options' : { 'bounded' : true },
        'isValidating' : false,
        'disabled' : false,
        'height' : 400,
        'viewConfig' : null,
        'groupID' : null,
        'files' : null,
        'generateViewConfigUsingFxn' : null,
        'extraViewProps' : [],
        'viewConfigBase' : {
            "editable"  : true,
            "zoomFixed" : false
        }
    }

    static propTypes = {
        'files' : PropTypes.arrayOf(PropTypes.shape({
            '@id' : PropTypes.string.isRequired,
            'uuid' : PropTypes.string.isRequired,
            'accession' : PropTypes.string.isRequired,
            'higlass_uid' : PropTypes.string,
            'file_format' : PropTypes.string.isRequired,
            'genome_assembly' : PropTypes.string.isRequired
        })).isRequired,
        'extraViewProps' : PropTypes.arrayOf(PropTypes.object)
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
            'mounted' : false,
            'viewConfig' : props.viewConfig || HiGlassContainer.whichGenerateViewConfigFxnToUse(props)(props.files, _.pick(props, 'height', 'groupID', 'extraViewProps', 'viewConfigBase'))
        };
    }

    initializeStorage(props = this.props){
        this.storagePrefix = props.groupID ? HiGlassLocalStorage.DEFAULT_PREFIX + props.groupID + '_' : HiGlassLocalStorage.DEFAULT_PREFIX; // Cache it
        this.storage = new HiGlassLocalStorage(this.storagePrefix);
    }

    componentDidMount(){
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

        if (this.props.files != nextProps.files || nextProps.height !== this.props.height || nextProps.viewConfig !== this.props.viewConfig){
            nextState.viewConfig = nextProps.viewConfig || HiGlassContainer.whichGenerateViewConfigFxnToUse(nextProps)(nextProps.files, _.pick(nextProps, 'height', 'groupID', 'extraViewProps', 'viewConfigBase'));
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
                var newDomainsToSave = { 'x' : hiGlassDomains.xDomain, 'y' : hiGlassDomains.yDomain };
                if (!HiGlassContainer.does2DTrackExist(this.state.viewConfig)){ // If we only have 1D tracks, don't update Y position.
                    var existingDomains = this.storage.getDomains();
                    if (existingDomains){
                        newDomainsToSave.y = existingDomains.y;
                    }
                }
                this.storage.saveDomains(newDomainsToSave);
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

    render(){
        var { disabled, isValidating, viewConfig, context, height } = this.props;
        /**
         * TODO: Some state + UI functions to make higlass view full screen.
         * Should try to make as common as possible between one for workflow tab & this. Won't be 100% compatible since adjust workflow detail tab inner elem styles, but maybe some common func for at least width, height, etc.
         */
        return (
            <div className="higlass-tab-view-contents">
                <HiGlassContainer {...{ disabled, isValidating, viewConfig, height }} files={[context]} />
            </div>
        );
    }
}


