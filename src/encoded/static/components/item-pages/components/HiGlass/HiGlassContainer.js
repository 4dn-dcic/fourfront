'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { isServerSide, ajax, console, fileUtil } from './../../../util';
import { requestAnimationFrame } from './../../../viz/utilities';
import { HiGlassLocalStorage } from './HiGlassLocalStorage';
import { HiGlassPlainContainer } from './HiGlassPlainContainer';



/**
 * Default set of options for HiGlassConfigurator functions.
 *
 * @type {Object}
 * @constant
 */
const DEFAULT_GEN_VIEW_CONFIG_OPTIONS = {
    'height' : 600,
    'baseUrl' : "https://higlass.4dnucleome.org",
    'supplementaryTracksBaseUrl' : "https://higlass.io",
    'initialDomains' : {
        'x' : [-10000000, 3300000000],
        'y' : [-8000000, 3100000000],
    },
    'extraViewProps' : [],
    'index' : 0,
    'storagePrefix' : HiGlassLocalStorage.DEFAULT_PREFIX,
    'groupID' : null,
    'baseViewProps' : null,
    'excludeAnnotationTracks' : false,
    'contentTrackOptions' : null,
    'annotationTrackOptions' : null
};



/**
 * Dictionary (Object) of functions for building out a viewConfig. Uses common 'options' dictionary.
 *
 * @type {Object.<function>}
 */
export const HiGlassConfigurator = {

    /**
     * AJAX request tilesetUid from higlass server then call either successCallback or fallbackCallback param.
     * Used as a helper function by FileView to check if HiGlass UID of file is valid/registered with HiGlass server
     * before marking the tab as not disabled.
     *
     * @async
     * @param {string} tilesetUid - Same as FileItem.higlass_uid.
     * @param {function} successCallback - Executed upon successful validation of tilesetUid param.
     * @param {function?} [failureCallback] - Executed upon failure to validate tilesetUid.
     * @param {string?} [server] - The base URL or server where tilesetUid would be registered. If not supplied, DEFAULT_GEN_VIEW_CONFIG_OPTIONS.baseUrl is used.
     * @returns {void}
     */
    'validateTilesetUid' : function(tilesetUid, successCallback, failureCallback = null, server = null){
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

    /**
     * Grabs values for `initialXDomain` and `initialYDomain` from LocalStorage via HiGlassLocalStorage.
     * If none available, falls back to and returns `options.initialDomains` values.
     *
     * @param {{ storagePrefix: string, initialDomains: { x: number[], y: number[] }, groupID: string }} options - Options for configurator.
     * @returns {{ x: number[], y: number[] }} Object with 'x' and 'y' keys & initial domain values to use as part of a newly-generated viewConfig.
     */
    'getInitialDomainsFromStorage' : function(options){
        var storagePrefix = options.storagePrefix || HiGlassLocalStorage.DEFAULT_PREFIX,
            initialDomains = options.initialDomains || DEFAULT_GEN_VIEW_CONFIG_OPTIONS.initialDomains;

        if (typeof options.groupID === 'string'){ // Handle groupID w/o needing to rename/transform prior to this function.
            storagePrefix = HiGlassLocalStorage.DEFAULT_PREFIX + options.groupID + '_';
        }

        // Grab existing singleton HiGlassLocalStorage instance via constructor (or create new) in order to grab domains.
        var storage = new HiGlassLocalStorage(storagePrefix);
        return (storage && storage.getDomains()) || initialDomains;
    },

    /**
     * Returns a JSON object pre-filled with some common values to use as base of VIEWCONFIG which to extend with views.
     * Updates key values from `options.viewConfigBase` object, if any supplied.
     *
     * @param {{ viewConfigBase?: Object, supplementaryTracksBaseUrl: string }} options - Options for configurator. Should have value for `supplementaryTracksBaseUrl`, at minimum.
     * @returns {{ editable: boolean, zoomFixed: boolean, exportViewUrl: string, zoomLocks: Object, locationLocks: Object, trackSourceServers: string[] }} ViewConfig base object.
     */
    'generateViewConfigBase' : function(options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){
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
                (options.supplementaryTracksBaseUrl || options.baseUrl) + "/api/v1" // Needs to be higlass currently for searchbox to work (until have some coord/search tracks or something in 54.86.. server?).
            ]
        }, options.viewConfigBase || {});
    },

    /**
     * Returns a JSON object pre-filled with some common values to use as base of viewConfig VIEW which to extend with tracks.
     * Updates key values from `options.extraViewProps` object, if any supplied.
     *
     * Uses `options.extraViewProps.genomePositionSearchBox` for genome search box values, if supplied, or generates it dynamically from
     * `options.supplementaryTracksBaseUrl` (subject to change, if we move supplementary tracks), `chromosomeAndAnnotation`, and hard-coded
     * value for autocomplete tileset.
     *
     * Sets layout using `options.extraViewProps.layout` (if available) and/or hard-coded defaults, via `HiGlassConfigurator.generateDefaultLayoutForViewItem`.
     * Sets initialXDomain and initialYDomain using `HiGlassConfigurator.getInitialDomainsFromStorage()` which falls back to `options.initialDomains`.
     *
     * @param {string?} [viewUID] - ID of view to set. If not supplied, one is generated from a static string and `options.index` where `options.index` is assumed to be sourced from a counter of views.
     * @param {{ chromosome: { infoid: string } }} [chromosomeAndAnnotation={}] - Object with chromosome and annotation config info to get infoid from.
     * @param {{ extraViewProps?: Object, supplementaryTracksBaseUrl: string, index?: number, baseUrl: string }} options - Options for configurator. Should have value for `supplementaryTracksBaseUrl`, at minimum.
     * @returns {{ uid: string, layout: Object, initialXDomain: number[], initialYDomain: number[], autocompleteSource: string, genomePositionSearchBox: Object }} ViewConfig base object.
     */
    'generateViewConfigViewBase' : function(viewUID = null, chromosomeAndAnnotation = {}, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){
        var { index, extraViewProps, baseUrl, supplementaryTracksBaseUrl } = options;

        viewUID = viewUID || "view-4dn-" + index;

        var genomeSearchUrl = (chromosomeAndAnnotation && chromosomeAndAnnotation.chromosome && chromosomeAndAnnotation.chromosome.server) || supplementaryTracksBaseUrl || baseUrl; // Currently available on HiGlass servers.
        var initialDomains = HiGlassConfigurator.getInitialDomainsFromStorage(options);
        var evp_gpsb = (extraViewProps && extraViewProps.genomePositionSearchBox) || {};

        return _.extend({
            "uid"                       : viewUID,
            "layout"                    : HiGlassConfigurator.generateDefaultLayoutForViewItem(viewUID, (extraViewProps && extraViewProps.layout) || null),
            "initialXDomain"            : initialDomains.x,
            "initialYDomain"            : initialDomains.y,
            "autocompleteSource"        : "/api/v1/suggest/?d=P0PLbQMwTYGy-5uPIQid7A&",
            "genomePositionSearchBox"   : {
                "autocompleteServer"        : evp_gpsb.autocompleteServer || (genomeSearchUrl + "/api/v1"),
                "autocompleteId"            : evp_gpsb.autocompleteId || "P0PLbQMwTYGy-5uPIQid7A",
                "chromInfoServer"           : evp_gpsb.chromInfoServer || (genomeSearchUrl + "/api/v1"),
                "chromInfoId"               : evp_gpsb.chromInfoId || (chromosomeAndAnnotation && chromosomeAndAnnotation.chromosome && chromosomeAndAnnotation.chromosome.infoid) || "NOT SET",
                "visible"                   : (typeof evp_gpsb.visible === 'boolean' ? evp_gpsb.visible : true)
            }
        }, _.omit(extraViewProps, 'layout', 'genomePositionSearchBox'));
    },

    'chromosomeAndAnnotationFromGenomeAssembly' : function(genomeAssembly = 'GRCh38'){
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
        } else if (genomeAssembly == 'dm6') { // Fly
            return {
                'annotation' : {
                    'name':         'Gene Annotations (dm6)',
                    'tilesetUid':   'B2skqtzdSLyWYPTYM8t8lQ'
                },
                'chromosome' : {
                    'name':         'Chromosome Axis',
                    'tilesetUid':   'f2FZsbCBTbyIx7A-xiRq5Q',
                    'infoid':       'dm6'
                }
            };
        } else {
            throw new Error("No genome assembly supplied.");
        }
    },

    'generateDefaultLayoutForViewItem'(viewItemID, extraLayout = {}){
        return _.extend({
            'moved' : false,
            'static' : true,
            'i' : viewItemID,
            'w' : 12, 'h' : 12,
            'x' : 0,  'y' : 0
        }, extraLayout);
    },


    // ViewConfig

    'generateViewConfigForMultipleViews' : function(viewConfigGenFxn = HiGlassConfigurator.mcool.generateViewConfig, files, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){

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

    'generateTopAnnotationTrack' : function(trackBaseServer, { chromosome, annotation }, annotationTrackOptions){
        return {
            "name": annotation.name,
            //"created": "2017-07-14T15:27:46.989053Z",
            "server"    : (annotation.server || trackBaseServer) + "/api/v1",
            "tilesetUid": annotation.tilesetUid,
            "type"      : "horizontal-gene-annotations",
            "options"   : _.extend({
                "labelColor"        : "black",
                "labelPosition"     : "hidden",
                "plusStrandColor"   : "black", //"blue",
                "minusStrandColor"  : "black", //"red",
                "trackBorderWidth"  : 0,
                "trackBorderColor"  : "black",
                "name"              : annotation.name
            }, annotationTrackOptions || {}),
            "minHeight" : 55,
            "height"    : 55,
            "header"    : "1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\t12\t13\t14",
            "position"  : "top",
            "orientation": "1d-horizontal",
            "uid"       : "top-annotation-track"
        };
    },

    'generateTopChromosomeTrack' : function(trackBaseServer, { chromosome, annotation }){
        return {
            "name"          : chromosome.name,
            //"created": "2017-07-17T14:16:45.346835Z",
            "server"        : (chromosome.server || trackBaseServer) + "/api/v1",
            "tilesetUid"    : chromosome.tilesetUid,
            "type"          : "horizontal-chromosome-labels",
            "local"         : true,
            "minHeight"     : 30,
            "thumbnail"     : null,
            "options"       : {},
            "height"        : 30,
            "position"      : "top",
            "orientation"   : "1d-horizontal",
            "uid"           : "top-chromosome-track"
        };
    },

    // The following sub-objects' 'generateViewConfig' functions take in a tilesetUid (str or list of objects) + and options object (super-set of 'props' passed to HiGlassContainer).

    'mcool' : {

        'generateCenterTrack' : function(file, height, options){
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
                    _.extend({
                        "server": options.baseUrl + "/api/v1",
                        "tilesetUid": file.higlass_uid,
                        "type": "heatmap",
                        "position": "center",
                        "uid": "GjuZed1ySGW1IzZZqFB9BA", // ? Unnecessary?
                        "name" : file.display_title
                    }, options.contentTrackOptions || {})
                ],
                "position": "center"
            };
        },

        'generateLeftAnnotationTrack' : function(trackBaseServer, { chromosome, annotation }, annotationTrackOptions){
            return {
                "name"      : annotation.name,
                //"created": "2017-07-14T15:27:46.989053Z",
                "server"    : trackBaseServer + "/api/v1",
                "tilesetUid": annotation.tilesetUid,
                "uid"       : "left-annotation-track",
                "type"      : "vertical-gene-annotations",
                "options": _.extend({
                    "labelColor"        : "black",
                    "labelPosition"     : "hidden",
                    "plusStrandColor"   : "black", //"blue",
                    "minusStrandColor"  : "black", //"red",
                    "trackBorderWidth"  : 0,
                    "trackBorderColor"  : "black",
                    "name": annotation.name
                }, annotationTrackOptions || {}),
                "width"     : 55,
                "header"    : "1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\t12\t13\t14",
                "orientation": "1d-vertical",
                "position"  : "left"
            };
        },

        'generateLeftChromosomeTrack' : function(trackBaseServer, { chromosome, annotation }){
            return {
                "name"          : chromosome.name,
                //"created": "2017-07-17T14:16:45.346835Z",
                "server"        : (chromosome.server || trackBaseServer) + "/api/v1",
                "tilesetUid"    : chromosome.tilesetUid,
                "uid"           : "left-chromosome-track",
                "type"          : "vertical-chromosome-labels",
                "options"       : {},
                "width"         : 20,
                "minWidth"      : 20,
                "orientation"   : "1d-vertical",
                "position"      : "left"
            };
        },

        'generateView' : function(file, options){
            var { height, baseUrl, supplementaryTracksBaseUrl, extraViewProps, index, contentTrackOptions } = options;

            var passedOptions = _.extend({}, options, {
                'extraViewProps' : (Array.isArray(extraViewProps) && extraViewProps[index]) || extraViewProps,
                'contentTrackOptions' : (Array.isArray(contentTrackOptions) && contentTrackOptions[index]) || contentTrackOptions
            });

            // Track definitions, default to human.
            var chromosomeAndAnnotation = HiGlassConfigurator.chromosomeAndAnnotationFromGenomeAssembly(file.genome_assembly);
            var genomeSearchUrl = supplementaryTracksBaseUrl || baseUrl; // Currently available on HiGlass servers.
    
            return _.extend(HiGlassConfigurator.generateViewConfigViewBase("view-4dn-mcool-" + index, chromosomeAndAnnotation, passedOptions), {
                "tracks": {
                    "top" : [
                        HiGlassConfigurator.generateTopAnnotationTrack(genomeSearchUrl, chromosomeAndAnnotation, options.annotationTrackOptions),
                        HiGlassConfigurator.generateTopChromosomeTrack(genomeSearchUrl, chromosomeAndAnnotation)
                    ],
                    "left" : [
                        HiGlassConfigurator.mcool.generateLeftAnnotationTrack(genomeSearchUrl, chromosomeAndAnnotation, options.annotationTrackOptions),
                        HiGlassConfigurator.mcool.generateLeftChromosomeTrack(genomeSearchUrl, chromosomeAndAnnotation)
                    ],
                    "center": [ HiGlassConfigurator.mcool.generateCenterTrack(file, height - 50, passedOptions) ],
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
        'generateViewConfig' : function(files, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){

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

            var file = files[0],
                fileFormat = fileUtil.getFileFormatStr(file);

            if (!file) throw new Error('No file supplied.');
            if (!fileFormat || fileFormat !== 'mcool'){
                console.error('File does not have "file_format" : "mcool"!');
            }

            return _.extend(HiGlassConfigurator.generateViewConfigBase(options), {
                "views": [ HiGlassConfigurator.mcool.generateView(file, options) ]
            });
        }

    },

    'bigwig' : {

        'generateTopContentTrack' : function(bigWigFile, options, { chromosome, annotation }, idx, all){

            var trackHeight = Math.min(Math.max(Math.floor((options.height - 150) / all.length), 20), options.height - 150),
                styleOptions = {
                    "lineStrokeColor"       : "black",
                    "labelPosition"         : "topRight",
                    "labelColor"            : "black",
                    "labelTextOpacity"      : 0.3,
                    "lineStrokeWidth"       : 1.25,
                    "trackBorderWidth"      : 0,
                    "trackBorderColor"      : "black",
                    "showMousePosition"     : true,
                    "mousePositionColor"    : "#999999",
                    "showTooltip"           : false,
                    "axisPositionHorizontal": "left",
                },
                hasExpSetInfo = !!(bigWigFile.from_experiment && bigWigFile.from_experiment.from_experiment_set && bigWigFile.from_experiment.from_experiment_set.accession),
                isOnlyFile = all.length === 1,
                contentTrackOptions = options.contentTrackOptions;

            if (!isOnlyFile && hasExpSetInfo){
                var isFromExperiment = bigWigFile.from_experiment.accession !== 'NONE';
                if (!isFromExperiment){ // Means it came from ExpSet and not Exp, style it to be more prominent compared to Exp processed files.
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

            if (Array.isArray(contentTrackOptions)){
                contentTrackOptions = contentTrackOptions[options.index];
            }

            return {
                "uid"       : "bigwig-content-track-" + idx,
                "tilesetUid": bigWigFile.higlass_uid,
                "height"    : trackHeight,
                "position"  : "top",
                "server"    : options.baseUrl + "/api/v1",
                "type"      : "horizontal-divergent-bar",
                "options"   : _.extend(styleOptions, {
                    "name"          : bigWigFile.display_title,
                    "valueScaling"  : "linear",
                    "coordSystem"   : chromosome.infoid || "NOT SET",
                    "colorRange"    : [
                        "white",
                        "rgba(245,166,35,1.0)",
                        "rgba(208,2,27,1.0)",
                        "black"
                    ]
                }, contentTrackOptions || {})
            };
        },

        'generateView' : function(files, options){
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

        'generateViewConfig' : function(files, options = DEFAULT_GEN_VIEW_CONFIG_OPTIONS){
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

            var allFileFormats = _.uniq(_.filter(_.map(files, fileUtil.getFileFormatStr))),
                fileFormat = allFileFormats[0];

            var fxnByFormatDict = {
                'mcool' : HiGlassConfigurator.mcool.generateViewConfig,
                'bw'    : HiGlassConfigurator.bigwig.generateViewConfig,
                'bg'    : HiGlassConfigurator.bigwig.generateViewConfig,
                'bed'   : HiGlassConfigurator.bigwig.generateViewConfig,
                'beddb' : HiGlassConfigurator.bigwig.generateViewConfig
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

    static propsToViewConfigGeneratorOptions(props){
        return _.pick(props, 'height', 'groupID', 'extraViewProps', 'viewConfigBase', 'contentTrackOptions', 'annotationTrackOptions');
    }

    static propTypes = {
        'files' : PropTypes.arrayOf(PropTypes.shape({
            '@id' : PropTypes.string.isRequired,
            'uuid' : PropTypes.string.isRequired,
            'accession' : PropTypes.string.isRequired,
            'higlass_uid' : PropTypes.string,
            'file_format' : PropTypes.shape({
                'file_format' : PropTypes.string,
                'display_title' : PropTypes.string.isRequired
            }),
            'genome_assembly' : PropTypes.string.isRequired
        })).isRequired,
        'extraViewProps' : PropTypes.arrayOf(PropTypes.object),
        'viewConfigBase' : PropTypes.object.isRequired,
        'contentTrackOptions' : PropTypes.object
    }

    static defaultProps = {
        'options' : { 'bounded' : true },
        'isValidating' : false,
        'disabled' : false,
        'height' : 400,
        'groupID' : null,
        'files' : null,
        'generateViewConfigUsingFxn' : null,
        'extraViewProps' : [],
        'viewConfigBase' : {
            "editable"  : true,
            "zoomFixed" : false
        }
    }

    constructor(props){
        super(props);
        this.initializeStorage = this.initializeStorage.bind(this);
        this.updateCurrentDomainsInStorage = this.updateCurrentDomainsInStorage.bind(this);
        this.bindHiGlassEventHandlers = this.bindHiGlassEventHandlers.bind(this);
        this.initializeStorage();
        this.state = {
            'viewConfig' : HiGlassContainer.whichGenerateViewConfigFxnToUse(props)(props.files, HiGlassContainer.propsToViewConfigGeneratorOptions(props))
        };
    }

    componentWillReceiveProps(nextProps){
        var nextState = {};

        if (this.props.files != nextProps.files || nextProps.height !== this.props.height){
            this.setState({
                'viewConfig' : HiGlassContainer.whichGenerateViewConfigFxnToUse(nextProps)(nextProps.files, HiGlassContainer.propsToViewConfigGeneratorOptions(nextProps))
            });
        }

        if (nextProps.groupID !== this.props.groupID) {
            // Doesn't update own HiGlassComponent (or its viewConfig), but starts saving location to new groupID instance. May change depending on requirements.
            this.initializeStorage(nextProps); 
        }
    }

    componentDidMount(){
        this.bindHiGlassEventHandlers();
    }

    initializeStorage(props = this.props){
        this.storagePrefix = props.groupID ? HiGlassLocalStorage.DEFAULT_PREFIX + props.groupID + '_' : HiGlassLocalStorage.DEFAULT_PREFIX; // Cache it
        this.storage = new HiGlassLocalStorage(this.storagePrefix);
    }

    updateCurrentDomainsInStorage(){
        var viewConfig       = this.state.viewConfig,
            hiGlassComponent = this.getHiGlassComponent();

        if (this.storage && hiGlassComponent){
            var viewID              = HiGlassPlainContainer.getPrimaryViewID(viewConfig),
                hiGlassDomains      = hiGlassComponent.api.getLocation(viewID);

            if (hiGlassDomains && Array.isArray(hiGlassDomains.xDomain) && Array.isArray(hiGlassDomains.yDomain) && hiGlassDomains.xDomain.length === 2 && hiGlassDomains.yDomain.length === 2){
                var newDomainsToSave = { 'x' : hiGlassDomains.xDomain, 'y' : hiGlassDomains.yDomain };
                if (!HiGlassPlainContainer.does2DTrackExist(viewConfig)){ // If we only have 1D tracks, don't update Y position.
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
        var viewConfig          = this.state.viewConfig,
            hiGlassComponent    = this.getHiGlassComponent(),
            viewID              = HiGlassPlainContainer.getPrimaryViewID(viewConfig);

        if (viewConfig && hiGlassComponent){
            hiGlassComponent.api.on('location', this.updateCurrentDomainsInStorage, viewID);
        } else if (!hiGlassComponent) {
            console.warn('No HiGlass instance available. Retrying...');
            setTimeout(()=>{
                this.bindHiGlassEventHandlers();
            }, 500);
        }
    }

    getHiGlassComponent(){
        return this && this.refs && this.refs.plainContainer && this.refs.plainContainer.getHiGlassComponent();
    }

    render(){
        var props = _.extend({}, _.omit(this.props, 'files', 'extraViewProps'), this.state);
        return <HiGlassPlainContainer {...props} ref="plainContainer" />;
    }

}

