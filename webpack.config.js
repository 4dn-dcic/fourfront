var path = require('path');
var webpack = require('webpack');
var env = process.env.NODE_ENV;

var PATHS = {
    static: path.resolve(__dirname, 'src/encoded/static'),
    build: path.resolve(__dirname, 'src/encoded/static/build'),
};

var mode = (env === 'production' ? 'production' : 'development');

var plugins = [];

// don't include momentjs locales (large)
plugins.push(
    new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/
    })
);

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

var rules = [
    // Strip @jsx pragma in react-forms, which makes babel abort
    {
        test: /\.js$/,
        loader: 'string-replace-loader',
        enforce: 'pre',
        query: {
            search: '@jsx',
            replace: 'jsx',
        }
    },
    // add babel to load .js files as ES6 and transpile JSX
    {
        test: /\.(js|jsx)$/,
        include: [
            path.resolve(__dirname, 'src/encoded/static'),
        ],
        use: [
            {
                loader: 'babel-loader'
            }
        ]
    }
];

var resolve = {
    extensions : [".webpack.js", ".web.js", ".js", ".json", '.jsx']
};

var optimization = {
    minimize: mode === "production"
};


module.exports = [
    // for browser
    {
        mode: mode,
        entry: {
            bundle: PATHS.static + '/browser',
        },
        target: "web",
        output: {
            path: PATHS.build,
            publicPath: '/static/build/',
            filename: '[name].js',          // TODO: Eventually we can change this to be chunkFilename as well, however this can only occur after we refactor React to only render <body> element and then we can use
                                            // this library, https://www.npmjs.com/package/chunkhash-replace-webpack-plugin, to replace the <script> tag's src attribute.
                                            // For now, to prevent caching JS, we append a timestamp to JS request.
            chunkFilename: chunkFilename,

            libraryTarget: "umd",
            library: "App",
            umdNamedDefine: true
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
            rules: rules
        },
        optimization: optimization,
        resolve : resolve,
        resolveLoader : resolve,
        devtool: devTool,
        plugins: plugins
    },
    // for server-side rendering
    ///*
    {
        mode: mode,
        entry: {
            renderer: PATHS.static + '/server',
        },
        target: 'node',
        // make sure compiled modules can use original __dirname
        node: {
            __dirname: true,
        },
        externals: [ // Anything which is not to be used server-side may be excluded
            'brace',
            'brace/mode/json',
            'brace/theme/solarized_light',
            'd3',
            'dagre-d3',
            '@babel/register', // avoid bundling babel transpiler, which is not used at runtime
            'higlass',
            'auth0-lock'
        ],
        output: {
            path: PATHS.build,
            filename: '[name].js',
            libraryTarget: 'commonjs2',
            chunkFilename: chunkFilename,
        },
        module: {
            rules: rules
        },
        optimization: optimization,
        resolve : resolve,
        resolveLoader : resolve,
        devtool: devTool, // No way to debug/log serverside JS currently, so may as well speed up builds for now.
        plugins: plugins
    }
    //*/
];
