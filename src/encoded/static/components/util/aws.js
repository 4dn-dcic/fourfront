var aws = require('aws-sdk');

var getS3UploadUrl = module.exports.getS3UploadUrl = function (file, creds) {
    aws.config.update({
        accessKeyId: creds.access_key,
        secretAccessKey: creds.secret_key
    });

    var s3 = new aws.S3();

    var params = {
        Bucket: 'encoded-4dn-files',
        Key: file.name,
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

var uploadFile = module.exports.uploadFile = function(file, object){
    console.log('uploading...', file);
    var creds = object.upload_credentials || {};

    aws.config.region = 'us-east-1'; // Region
    // AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    //         IdentityPoolId: 'us-east-1:aca0f696-1bc7-4bcb-9a05-c2ba52202e8b',
    // });
    aws.config.update({
        accessKeyId: creds.access_key,
        secretAccessKey: creds.secret_key
    });

    // FF-617 get these from an endpoint?
    // or try cognito?

    console.log('config:', aws.config);
    var s3 = new aws.S3();
    // this function returns an uploadManager
    return s3.upload({Bucket: "encoded-4dn-files", Key: creds.key, Body: file });
};
