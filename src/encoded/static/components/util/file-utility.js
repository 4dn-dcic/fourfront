var CryptoJS = require('crypto-js');


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

/*
Adapted from http://stackoverflow.com/questions/39112096
Takes a file object and optional callback progress function
*/
var getLargeMD5 = module.exports.getLargeMD5 = function(file, cbProgress) {
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
