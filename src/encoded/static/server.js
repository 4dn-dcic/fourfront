// Entry point for server rendering subprocess

/* jshint strict: false */

import 'source-map-support/register';
import App from './components';
import { HTTPStream } from 'subprocess-middleware';
import { build as buildRendererFxn } from './libs/react-middleware';

const argv = process.argv.slice(2);
const debug = (argv[0] === '--debug');

const appRendererFxn = buildRendererFxn(App);
const http_stream = HTTPStream({
    "app"            : appRendererFxn,
    "captureConsole" : !debug
});

http_stream.pipe(process.stdout);

if (debug) {
    var value = argv[1] || '{}';
    if (value.slice(0, 5) === 'file:') {
        value = require('fs').readFileSync(value.slice(5));
    } else {
        value = new Buffer(value, 'utf8');
    }
    http_stream.write('HTTP/1.1 200 OK\r\nX-Request-URL: http://localhost/\r\nContent-Length: ' + value.length + '\r\n\r\n');
    http_stream.write(value);
    http_stream.end();
} else {
    process.stdin.pipe(http_stream);
    process.stdin.resume();
}
