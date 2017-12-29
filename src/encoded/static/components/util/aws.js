import * as aws from 'aws-sdk';

/** 
 * Is this used? Should we put it into util/index.js exports? Rename to 'AWS' to prevent confusion with 'aws-sdk' package?
 */

// Function for generating a presigned url for front end s3 uploads.
// uses a file input (i.e. from <input type=file...>) and an object
// containing upload credentials (from /types/file.py)
var s3PresignedUrl = module.exports.s3PresignedUrl = function (file, upload_credentials) {

    aws.config.update({
        accessKeyId: upload_credentials.access_key,
        secretAccessKey: upload_credentials.secret_key,
        sessionToken: upload_credentials.session_token
    });

    var s3 = new aws.S3();
    var params = {
        Bucket: 'encoded-4dn-files',
        Key: upload_credentials.key,
        Expires: 60,
        ContentType: file.type
    };

    s3.getSignedUrl('putObject', params, function(err, data) {
        if (err) {
            console.log(err);
            return null;
        } else {
            return data;
        }
    });
};

// Uploads a given file to s3 (encoded-4dn-files bucket) using the metadata
// for a given object. upload_credentials is an object, made from /types/file.py
// File is given from <input type=file>
var s3UploadFile = module.exports.s3UploadFile = function(file, upload_credentials){

    aws.config.update({
        accessKeyId: upload_credentials.access_key,
        secretAccessKey: upload_credentials.secret_key,
        sessionToken: upload_credentials.session_token
    });

    // get s3 bucket identity from upload url
    // should be in form: "s3://<bucket>/<extra stuff>"
    var upload_url = upload_credentials.upload_url;
    var bucket = null;
    if(upload_url.slice(0,5) === 's3://'){
        upload_url = upload_url.slice(5, upload_url.length);
        bucket = upload_url.split('/')[0];
    }
    // back up
    if(!bucket){
        bucket = "encoded-4dn-files";
    }
    var s3 = new aws.S3();
    // this function returns an uploadManager
    return s3.upload({Bucket: bucket, Key: upload_credentials.key, Body: file });
};
