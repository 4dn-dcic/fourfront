var CryptoJS = require('crypto-js');

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
        offset += reader.result.length;
        // callback for handling read chunk
        chunkCallback(reader.result, offset, fileSize);
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
        reader.readAsBinaryString(fileSlice);
    }
    readNext();
}

/*
Adapted from http://stackoverflow.com/questions/39112096
Takes a file object and optional callback progress function
*/
var getChunkedMD5 = module.exports.getChunkedMD5 = function(file, cbProgress) {
    return new Promise((resolve, reject) => {
        var md5 = CryptoJS.algo.MD5.create();
        readChunked(file, (chunk, offs, total) => {
            md5.update(CryptoJS.enc.Latin1.parse(chunk));
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
}
