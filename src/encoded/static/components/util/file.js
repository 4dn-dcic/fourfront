var CryptoJS = require('crypto-js');
import React from 'react';
import PropTypes from 'prop-types';


/**
 * Use presence of 'status' property to determine if File object/Item we have
 * is complete in its properties or not.
 * 
 * @param {Object} file - Object representing an embedded file. Should have display_title, at minimum.
 * @returns {boolean} True if complete, false if not.
 * @throws Error if file is not an object.
 */
export function isFileDataComplete(file){
    if (!file || typeof file !== 'object') throw new Error('File param is not an object.');
    if (typeof file.status !== 'string') {
        return false;
    }
    if (typeof file.link_id !== 'string') {
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





/*** Common React Classes ***/

export class FileDownloadButton extends React.Component {

    static defaultProps = {
        'title' : 'Download',
        'disabled' : false
    }

    render(){
        var { href, className, disabled, title, filename } = this.props;
        return (
            <a href={ href } className={(className || '') + " btn btn-default btn-info download-button " + (disabled ? ' disabled' : '')} download data-tip={filename || null}>
                <i className="icon icon-fw icon-cloud-download"/>{ title ? <span>&nbsp; { title }</span> : null }
            </a>
        );
    }
}

export class FileDownloadButtonAuto extends React.Component {

    static propTypes = {
        'result' : PropTypes.shape({
            'href' : PropTypes.string.isRequired,
            'filename' : PropTypes.string.isRequired,
        })
    }

    static defaultProps = {
        'canDownloadStatuses' : [
            'uploaded',
            'released',
            'replaced',
            'submission in progress',
            'released to project'
        ]
    }

    canDownload(){
        var file = this.props.result;
        if (!file || typeof file !== 'object'){
            console.error("Incorrect data type");
            return false;
        }
        if (typeof file.status !== 'string'){
            console.error("No 'status' property on file:", file);
            return false;
        }

        if (this.props.canDownloadStatuses.indexOf(file.status) > -1){
            return true;
        }
        return false;
    }

    render(){
        var file = this.props.result;
        var props = {
            'href' : file.href,
            'filename' : file.filename,
            'disabled' : !this.canDownload()
        };
        return <FileDownloadButton {...props} {...this.props} />;
    }
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
        readChunked(file, (chunk, offs, total) => {
            md5.update(chunk);
            if (cbProgress) {
                cbProgress(Math.round(offs / total * 100));
            }
        }, err => {
            if (err) {
                reject(err);
            } else {
                var hash = md5.finalize();
                var hashHex = hash.toString(CryptoJS.enc.Hex);
                resolve(hashHex);
            }
        });
    });
};
