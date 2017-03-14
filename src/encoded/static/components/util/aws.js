var aws = require('aws-sdk');

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

    var s3 = new aws.S3();
    // this function returns an uploadManager
    return s3.upload({Bucket: "encoded-4dn-files", Key: upload_credentials.key, Body: file });
};
