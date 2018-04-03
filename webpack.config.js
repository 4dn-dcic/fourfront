var path = require('path');
var webpack = require('webpack');
var env = process.env.NODE_ENV;
var FlowtypePlugin = require('flowtype-loader/plugin');

var PATHS = {
    static: path.resolve(__dirname, 'src/encoded/static'),
    build: path.resolve(__dirname, 'src/encoded/static/build'),
};

var plugins = [];
// don't include momentjs locales (large)
plugins.push(new webpack.IgnorePlugin(/^\.\/locale$/, [/moment$/]));
var chunkFilename = '[name].js';
var devTool = 'source-map'; // Default, slowest.

if (env === 'production') {
    // tell react to use production build
    plugins.push(new webpack.DefinePlugin({
        'process.env': {
            'NODE_ENV': '"production"'
        }
    }));
    // uglify code for production
    plugins.push(new webpack.optimize.UglifyJsPlugin({minimize: true, compress: { warnings: false}}));
    // add chunkhash to chunk names for production only (it's slower)
    chunkFilename = '[name].[chunkhash].js';
    devTool = 'source-map';
} else if (env === 'quick') {
    devTool = 'eval'; // Fastest
} else if (env === 'quick-uglified') {
    // Uglify JS for dev as well on task 'npm run dev-uglified' -
    // slightly slower but reduces invariant violations where
    // client-side render != server-side reason (*perhaps* allowing clientside JS to exec faster)
    // set 'beautify : true' to get nicer output (whitespace, linebreaks) for debugging.
    plugins.push(new webpack.optimize.UglifyJsPlugin({compress: false, mangle: false, minimize: false, sourceMap: true}));
    devTool = 'source-map';
}

plugins.push(new FlowtypePlugin());

var preLoaders = [
    // Strip @jsx pragma in react-forms, which makes babel abort
    {
        test: /\.js$/,
        loader: 'string-replace',
        query: {
            search: '@jsx',
            replace: 'jsx',
        }
    },
    {
        test: /\.js$/,
        loader: "flowtype",
        exclude: /node_modules/
    }
];

var loaders = [
    // add babel to load .js files as ES6 and transpile JSX
    {
        test: /\.(js|jsx)$/,
        include: [
            path.resolve(__dirname, 'src/encoded/static'),
        ],
        loader: 'babel',
    },
    {
        test: /\.json$/,
        loader: 'json',
    }
];

var resolve = {
    extensions : ["", ".webpack.js", ".web.js", ".js", ".json", '.jsx']
};

module.exports = [
    // for browser
    {
        context: PATHS.static,
        entry: {inline: './inline'},
        output: {
            path: PATHS.build,
            publicPath: '/static/build/',
            filename: '[name].js',
            chunkFilename: chunkFilename,
        },
        // https://github.com/hapijs/joi/issues/665
        // stub modules on client side depended on by joi (a dependency of jwt)
        node: {
            net: "empty",
            tls: "empty",
            dns: "empty",
        },
        externals: [
            {'xmlhttprequest' : '{XMLHttpRequest:XMLHttpRequest}'}
        ],
        module: {
            preLoaders: preLoaders,
            loaders: loaders,
        },
        resolve : resolve,
        resolveLoader : resolve,
        devtool: devTool,
        plugins: plugins,
        debug: true
    },
    // for server-side rendering
    ///*
    {
        entry: {
            renderer: './src/encoded/static/server.js',
        },
        target: 'node',
        // make sure compiled modules can use original __dirname
        node: {
            __dirname: true,
        },
        externals: [
            'brace',
            'brace/mode/json',
            'brace/theme/solarized_light',
            'd3',
            'dagre-d3',
            'babel-core/register', // avoid bundling babel transpiler, which is not used at runtime
            'higlass'
        ],
        output: {
            path: PATHS.build,
            filename: '[name].js',
            libraryTarget: 'commonjs2',
            chunkFilename: chunkFilename,
        },
        module: {
            preLoaders: preLoaders,
            loaders: loaders,
        },
        resolve : resolve,
        resolveLoader : resolve,
        devtool: devTool, // No way to debug/log serverside JS currently, so may as well speed up builds for now.
        plugins: plugins,
        debug: false // See devtool comment.
    }
    //*/
];
