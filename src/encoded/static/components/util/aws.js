var aws = require('aws-sdk');

var getS3UploadUrl = module.exports = function (file, creds) {
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
            console.log('?? ', data);
            return data;
        }
    });
};
