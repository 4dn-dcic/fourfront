var ga = require('google-analytics');

var parseError = module.exports.parseError = function (response) {
    if (response instanceof Error) {
        return Promise.resolve({
            status: 'error',
            title: response.message,
            '@type': ['AjaxError', 'Error']
        });
    }
    // As of new fetch, whole response is json

    return(response);
    
    return Promise.resolve({
        status: 'error',
        title: response.statusText,
        code: response.status,
        '@type': ['AjaxError', 'Error']
    });
};
