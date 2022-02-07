// Entry point for server rendering subprocess

/* jshint strict: false */

import 'source-map-support/register';
import { HTTPStream, transformResponse } from 'subprocess-middleware';
import { appRenderFxn } from './libs/react-middleware';

const argv = process.argv.slice(2);
const debug = (argv[0] === '--debug');

const http_stream = new HTTPStream({
    "app"            : transformResponse(appRenderFxn),
    // Doesn't work if false currently -- console contents/msgs would get emitted into http_stream and then into process.stdout (atop html response body)
    // todo: explore more along w. or after Node14 upgrade path and potential replacement of subprocess_middleware with python-react (in pypi) or similar.
    "captureConsole" : true
});

http_stream.pipe(process.stdout);

if (debug) {
    var value = argv[1] || '{}';
    if (value.slice(0, 5) === 'file:') {
        value = require('fs').readFileSync(value.slice(5));
    } else {
        value = Buffer.from(value, 'utf8');
    }
    http_stream.write('HTTP/1.1 200 OK\r\nX-Request-URL: http://localhost/\r\nContent-Length: ' + value.length + '\r\n\r\n');
    http_stream.write(value);
    http_stream.end();
} else {
    process.stdin.pipe(http_stream);
    process.stdin.resume();
}
