var ga = require('google-analytics');

var parseError = module.exports.parseError = function (response) {
    if (response instanceof Error) {
        return Promise.resolve({
            status: 'error',
            title: response.message,
            '@type': ['AjaxError', 'Error']
        });
    }
    var content_type = response.headers.get('Content-Type') || '';
    content_type = content_type.split(';')[0];
    if (content_type == 'application/json') {
        return response.json();
    }
    return Promise.resolve({
        status: 'error',
        title: response.statusText,
        code: response.status,
        '@type': ['AjaxError', 'Error']
    });
};

var parseAndLogError = module.exports.parseAndLogError = function (cause, response) {
    var promise = parseError(response);
    promise.then(data => {
        ga('send', 'exception', {
            'exDescription': '' + cause + ':' + data.code + ':' + data.title,
            'location': window.location.href
        });
    });
    return promise;
};
