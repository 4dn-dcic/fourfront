import * as aws from 'aws-sdk';


// Uploads a given file to s3 using the upload_credentials metadata
// for a given object. upload_credentials is an object, made from /types/file.py
// File is given from <input type=file>
// If you return null, the upload will fail with a warning message
var s3UploadFile = module.exports.s3UploadFile = function(file, upload_credentials){

    aws.config.update({
        accessKeyId: upload_credentials.AccessKeyId,
        secretAccessKey: upload_credentials.SecretAccessKey,
        sessionToken: upload_credentials.SessionToken
    });

    // get s3 bucket identity from upload url
    // should be in form: "s3://<bucket>/<extra stuff>"
    var upload_url = upload_credentials.upload_url;
    var bucket = null;
    if(upload_url.slice(0,5) === 's3://'){
        upload_url = upload_url.slice(5, upload_url.length);
        bucket = upload_url.split('/')[0];
    }
    // back up. will abort the upload and alert user if null is returned
    if(!bucket){
        return null;
    }
    var s3 = new aws.S3();
    // this function returns an uploadManager
    return s3.upload({Bucket: bucket, Key: upload_credentials.key, Body: file });
};
