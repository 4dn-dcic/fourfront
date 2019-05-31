var CryptoJS = require('crypto-js');
import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import memoize from 'memoize-one';
import { Button } from 'react-bootstrap';
import { itemUtil } from './object';
import { isServerSide } from './misc';
import patchedConsoleInstance from './patched-console';
const console = patchedConsoleInstance;

import { File } from './typedefs';


/**
 * Gets file_format string from a file.
 * Requires file_format to be embedded.
 * Currently file_format.display_title is same as file_format.file_format, so either property is fine.
 * This may change in the future and would require file_format.file_format to be embedded.
 *
 * @param {File} file - A File Item JSON
 * @returns {string|null} Format of the file.
 */
export function getFileFormatStr(file){
    return (file && file.file_format && (file.file_format.file_format || file.file_format.display_title)) || null;
}


/**
 * Pass a File Item through this function to determine whether to fetch more of it via AJAX or not.
 *
 * Use presence of 'status', '@type', and 'display_title' property to determine if File object/Item we have
 * is complete in its properties or not.
 *
 * @param {File} file - Object representing an embedded file. Should have display_title, at minimum.
 * @returns {boolean} True if complete, false if not.
 * @throws Error if file is not an object.
 */
export function isFileDataComplete(file){
    if (!file || typeof file !== 'object') throw new Error('File param is not an object.');
    if (isServerSide() || !window || !document){
        return true; // For tests, primarily.
    }
    if (typeof file.status !== 'string') {
        return false;
    }
    if (typeof file.display_title !== 'string') {
        return false;
    }
    if (!Array.isArray(file['@type'])) {
        return false;
    }
    return true;
}

/** For FileMicroscropy files. */
export function getLightSourceCenterMicroscopeSettingFromFile(channel, fileItem){
    if (typeof channel !== 'string' || channel.slice(0,2) !== 'ch' || !fileItem) return null;
    return fileItem.microscope_settings && fileItem.microscope_settings[channel + '_light_source_center_wl'];
}



/**
 * Extends file (creates a copy) with properties:
 * `{ from_experiment : { from_experiment_set : { accession }, accession }, from_experiment_set : { accession }`
 *
 */
export function extendFile(file, experiment, experimentSet){
    return _.extend(
        {}, file, {
            'from_experiment' : _.extend(
                {}, experiment, { 'from_experiment_set' : experimentSet }
            ),
            'from_experiment_set' : experimentSet
        }
    );
}



/**********************************
 *** Grouping-related functions ***
 **********************************/

/**
 * Basic greedy file grouping algorithm.
 *
 * @param {{ related_files: { relationship_type : string, file: Object }[] }[]} files - List of File Items.
 * @param {boolean} isBidirectional - If set to true, runs slightly faster.
 * @returns {File[][]} A list of groups (lists) of files grouped by their related_files connection(s).
 */
export function groupFilesByRelations(files, isBidirectional=true){

    const groups = [];
    const ungroupedFiles = files.slice(0);
    const encounteredIDs = new Set();

    var currGroup       = [ ungroupedFiles.shift() ],
        currGroupIdx    = 0,
        currFile, currFileID, ungroupedIter, anotherUngroupedFile;

    while (ungroupedFiles.length > 0){

        if (currGroupIdx >= currGroup.length){
            // No more left to add to curr. group. Start new one.
            groups.push(currGroup);
            currGroup = [ ungroupedFiles.shift() ];
            currGroupIdx = 0;
        }

        currFile = currGroup[currGroupIdx];
        currFileID = itemUtil.atId(currFile);

        if (!currFileID) {
            // No view permission most likely, continue.
            currGroupIdx++;
            continue;
        }

        // Handle unidirectional cases from this file pointing to others.
        // Bidirectional cases are implicitly handled as part of this.
        _.forEach(currFile.related_files || [], function(relatedFileEmbeddedObject){
            const relatedFileID = itemUtil.atId(relatedFileEmbeddedObject.file);
            const relationshipType = relatedFileEmbeddedObject.relationship_type; // Unused
            if (!relatedFileID){
                // Most likely no view permissions
                // Cancel out -- remaining file (if any) will be picked up as part of while loop.
                return;
            }
            if (encounteredIDs.has(relatedFileID)){
                // Has been encountered already, likely as part of bidirectional connection.
                return;
            }
            const relatedFileIndex = _.findIndex(ungroupedFiles, function(ungroupedFile){
                return relatedFileID === itemUtil.atId(ungroupedFile);
            });
            if (relatedFileIndex === -1){
                console.warn("Could not find related_file \"" + relatedFileID + "\" in list of ungrouped files.");
                return;
            }

            const relatedFile = ungroupedFiles[relatedFileIndex];
            ungroupedFiles.splice(relatedFileIndex, 1);
            currGroup.push(relatedFile);
        });

        if (!isBidirectional){
            // Handle unidirectional cases from other files pointing to this 1.
            for (ungroupedIter = 0; ungroupedIter < ungroupedFiles.length; ungroupedIter++){
                anotherUngroupedFile = ungroupedFiles[ungroupedIter];

                _.forEach(anotherUngroupedFile.related_files || [], function(relatedFileEmbeddedObject){
                    const relatedFileID = itemUtil.atId(relatedFileEmbeddedObject.file);
                    if (!relatedFileID){
                        // Most likely no view permissions
                        // Cancel out -- remaining file (if any) will be picked up as part of while loop.
                        return;
                    }
                    if (encounteredIDs.has(relatedFileID)){
                        // Has been encountered already, likely as part of bidirectional connection.
                        return;
                    }
                    if (relatedFileID === currFileID){
                        currGroup.push(anotherUngroupedFile);
                        ungroupedFiles.splice(ungroupedIter, 1);
                        ungroupedIter--;
                    }
                });
            }
        }

        encounteredIDs.add(currFileID);
        currGroupIdx++;
    }

    groups.push(currGroup);

    return groups;
}

export function extractSinglyGroupedItems(groups){
    const [ multiFileGroups, singleFileGroups ] = _.partition(groups, function(g){
        return g.length > 1;
    });
    return [ multiFileGroups, _.flatten(singleFileGroups, true) ];
}


/**
 * Filter a list of files down to those with a value for `quality_metric` and `quality_metric.overall_quality_status`.
 *
 * @deprecated If Raw Files also start have quality_metric_summary populated, then we can migrate away from & delete this func.
 *
 * @param {File[]} files                    List of files, potentially with quality_metric.
 * @param {boolean} [checkAny=false]        Whether to run a _.any (returning a boolean) instead of a _.filter, for performance in case don't need the files themselves.
 * @returns {File[]|true} Filtered list of files or boolean for "any", depending on `checkAny` param.
 */
export const filterFilesWithEmbeddedMetricItem = memoize(function(files, checkAny=false){
    var func = checkAny ? _.any : _.filter;
    return func(files, function(f){
        return f.quality_metric && f.quality_metric.overall_quality_status;
    });
});


export const filterFilesWithQCSummary = memoize(function(files, checkAny=false){
    var func = checkAny ? _.any : _.filter;
    return func(files, function(f){
        return (
            Array.isArray(f.quality_metric_summary) &&
            f.quality_metric_summary.length > 0 &&
            // Ensure all unique titles
            f.quality_metric_summary.length === Array.from(new Set(_.pluck(f.quality_metric_summary, 'title'))).length
        );
    });
});

/**
 * Groups files with a `quality_metric_summary` property by the concatanated
 * unique titles of the summary items/columns.
 *
 * @param {File[]} filesWithMetrics - List of files which all contain a `quality_metric_summary`.
 * @returns {File[][]} Groups of files as 2d array.
 */
export const groupFilesByQCSummaryTitles = memoize(function(filesWithMetrics, sep="\t"){
    return _.pluck(
        Array.from(
            _.reduce(filesWithMetrics, function(m, file, i){
                const titles = _.pluck(file.quality_metric_summary, 'title');
                const titlesAsString = titles.join(sep); // Using Tab as is unlikely character to be used in a title column.
                if (!m.has(titlesAsString)){
                    m.set(titlesAsString, []);
                }
                m.get(titlesAsString).push(file);
                return m;
            }, new Map())
        ),
        1
    );
});

/**************************
 ** Common React Classes **
 ************************/

export class FileDownloadButton extends React.PureComponent {

    static defaultProps = {
        'title' : 'Download',
        'disabled' : false,
        'size' : null
    };

    render(){
        var { href, className, disabled, title, filename, size } = this.props;
        return (
            <a href={ href } className={(className || '') + " btn btn-default btn-primary download-button btn-block " + (disabled ? ' disabled' : '') + (size ? ' btn-' + size : '')} download data-tip={filename || null}>
                <i className="icon icon-fw icon-cloud-download"/>{ title ? <span>&nbsp; { title }</span> : null }
            </a>
        );
    }
}

export class FileDownloadButtonAuto extends React.PureComponent {

    static canDownload(file, validStatuses = FileDownloadButtonAuto.defaultProps.canDownloadStatuses){
        if (!file || typeof file !== 'object'){
            console.error("Incorrect data type");
            return false;
        }
        if (typeof file.status !== 'string'){
            console.error("No 'status' property on file:", file);
            return false;
        }

        if (validStatuses.indexOf(file.status) > -1){
            return true;
        }
        return false;
    }

    static propTypes = {
        'result' : PropTypes.shape({
            'href' : PropTypes.string.isRequired,
            'filename' : PropTypes.string.isRequired,
        }).isRequired
    };

    static defaultProps = {
        'canDownloadStatuses' : [
            'uploaded',
            'released',
            'replaced',
            'submission in progress',
            'released to project',
            'archived'
        ]
    };

    canDownload(){ return FileDownloadButtonAuto.canDownload(this.props.result, this.props.canDownloadStatuses); }

    render(){
        var file = this.props.result;
        var isDisabled = !this.canDownload();
        var props = {
            'href' : file.href,
            'filename' : file.filename,
            'disabled' : isDisabled,
            'title' : isDisabled ? 'Not ready to download' : FileDownloadButton.defaultProps.title
        };
        return <FileDownloadButton {...this.props} {...props} />;
    }
}

export class ViewFileButton extends React.Component {

    static defaultProps = {
        'className' : "text-ellipsis-container mb-1",
        'target' : "_blank",
        'bsStyle' : "primary",
        'href' : null,
        'disabled' : false,
        'title' : null,
        'mimeType' : null,
        'size' : null
    };

    render(){
        var { filename, href, target, title, mimeType, size } = this.props;
        var action = 'View', extLink = null, preLink = null;

        preLink = <i className="icon icon-fw icon-cloud-download" />;

        var fileNameLower = (filename && filename.length > 0 && filename.toLowerCase()) || '';
        var fileNameLowerEnds = {
            '3' : fileNameLower.slice(-3),
            '4' : fileNameLower.slice(-4),
            '5' : fileNameLower.slice(-5)
        };
        if (isFilenameAnImage(fileNameLowerEnds)){
            action = 'View';
            preLink = <i className="icon icon-fw icon-picture-o" />;
        } else if (fileNameLowerEnds['4'] === '.pdf'){
            action = 'View';
            //if (target === '_blank') extLink = <i className="icon icon-fw icon-external-link"/>;
            preLink = <i className="icon icon-fw icon-file-pdf-o" />;
        } else if (fileNameLowerEnds['3'] === '.gz' || fileNameLowerEnds['4'] === '.zip' || fileNameLowerEnds['4'] === '.tgx'){
            action = 'Download';
        }

        return (
            <Button bsSize={size} download={action === 'Download' ? true : null} {..._.omit(this.props, 'filename', 'title')} title={filename} data-tip={mimeType}>
                <span className={title ? null : "text-400"}>
                    { preLink } { action } { title || (filename && <span className="text-600">{ filename }</span>) || 'File' } { extLink }
                </span>
            </Button>
        );
    }
}

export function isFilenameAnImage(filename, suppressErrors = false){
    var fileNameLower, fileNameLowerEnds;
    if (typeof filename === 'string'){
        fileNameLower = (filename && filename.length > 0 && filename.toLowerCase()) || '';
        // Store ending(s) into object so we don't have to call `fileNameLower.slice` per each comparison.
        fileNameLowerEnds = {
            '3' : fileNameLower.slice(-3),
            '4' : fileNameLower.slice(-4),
            '5' : fileNameLower.slice(-5)
        };
    } else if (filename && typeof filename === 'object' && filename['3'] && filename['4']) {
        fileNameLowerEnds = filename;
    } else if (!suppressErrors) {
        throw new Error('Param \'filename\' must be a string or pre-formatted map of last char-lengths to their values.');
    } else {
        return false;
    }
    return (
        fileNameLowerEnds['5'] === '.tiff' ||
        fileNameLowerEnds['4'] === '.jpg' ||
        fileNameLowerEnds['5'] === '.jpeg' ||
        fileNameLowerEnds['4'] === '.png' ||
        fileNameLowerEnds['4'] === '.bmp' ||
        fileNameLowerEnds['4'] === '.gif'
    );
}


/*** MD5 Related ***/

/*
Return a cryptojs WordArray given an arrayBuffer (elemtent 0). Also return
original arraylength contained within buffer (element 1)
Solution originally: https://groups.google.com/forum/#!msg/crypto-js/TOb92tcJlU0/Eq7VZ5tpi-QJ
*/
function arrayBufferToWordArray(ab) {
    var i8a = new Uint8Array(ab);
    var a = [];
    for (var i = 0; i < i8a.length; i += 4) {
        a.push(i8a[i] << 24 | i8a[i + 1] << 16 | i8a[i + 2] << 8 | i8a[i + 3]);
    }
    // WordArrays are UTF8 by default
    var result = CryptoJS.lib.WordArray.create(a, i8a.length);
    return [result, i8a.length];
}

function readChunked(file, chunkCallback, endCallback) {
    var fileSize = file.size;
    var chunkSize = 4 * 1024 * 1024; // 4MB chunks
    var offset = 0;

    var reader = new FileReader();
    reader.onload = function() {
        if (reader.error) {
            endCallback(reader.error || {});
            return;
        }
        var wordArrayRes = arrayBufferToWordArray(reader.result);
        offset += wordArrayRes[1];
        // callback for handling read chunk
        chunkCallback(wordArrayRes[0], offset, fileSize);
        if (offset >= fileSize) {
            endCallback(null);
            return;
        }
        readNext();
    };

    reader.onerror = function(err) {
        endCallback(err || {});
    };

    function readNext() {
        var fileSlice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(fileSlice);
    }
    readNext();
}

/**
 * Adapted from http://stackoverflow.com/questions/39112096
 * Takes a file object and optional callback progress function
 *
 * @param {File} file - Instance of a File class (subclass of Blob).
 * @param {function} cbProgress - Callback function on progress change. Accepts a 0-1 float value.
 * @returns {Promise} AJAX Promise object.
 */

export function getLargeMD5(file, cbProgress) {
    return new Promise((resolve, reject) => {
        // create algorithm for progressive hashing
        var md5 = CryptoJS.algo.MD5.create();
        readChunked(
            file,
            function(chunk, offs, total){
                md5.update(chunk);
                if (cbProgress) {
                    cbProgress(Math.round(offs / total * 100));
                }
            },
            function(err){
                if (err) {
                    reject(err);
                } else {
                    var hash = md5.finalize();
                    var hashHex = hash.toString(CryptoJS.enc.Hex);
                    resolve(hashHex);
                }
            }
        );
    });
}
