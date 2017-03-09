var aws = require('aws-sdk');

var getS3UploadUrl = module.exports = function (filename, filetype) {
    aws.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    var s3 = new aws.S3();

    var params = {
        Bucket: 'carlv',
        Key: filename,
        Expires: 60,
        ContentType: filetype
    };

    s3.getSignedUrl('putObject', params, function(err, data) {
        if (err) {
            console.log(err);
            return null;
        } else {
            console.log(data);
            return data;
        }
    });
};
