const path = require('path');
const webpack = require('webpack');
const env = process.env.NODE_ENV;
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const fs = require('fs');

const PATHS = {
    "static": path.resolve(__dirname, 'src/encoded/static'),
    "build" : path.resolve(__dirname, 'src/encoded/static/build'),
};

const mode = (env === 'production' ? 'production' : 'development');

const plugins = [];

console.log("Opened webpack.config.js with env: " + env + " & mode: " + mode);

// don't include momentjs locales (large)
plugins.push(
    new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/
    })
);


let chunkFilename = '[name].js';
let devTool = 'source-map'; // Default, slowest.


if (mode === 'production') {
    // add chunkhash to chunk names for production only (it's slower)
    chunkFilename = '[name].[chunkhash].js';
    devTool = 'source-map';
} else if (env === 'quick') {
    devTool = 'eval'; // Fastest
} else if (env === 'development') {
    devTool = 'inline-source-map';
}


const rules = [
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
            path.resolve(__dirname, 'src/encoded/static')
        ],
        use: [
            {
                loader: 'babel-loader'
            }
        ]
    }
];

const resolve = {
    extensions : [".webpack.js", ".web.js", ".js", ".json", '.jsx'],
    //symlinks: false,
    //modules: [
    //    path.resolve(__dirname, '..', 'node_modules'),
    //    'node_modules'
    //]
};

const optimization = {
    usedExports: true,
    minimize: mode === "production",
    minimizer: [
        //new UglifyJsPlugin({
        //    parallel: true,
        //    sourceMap: true
        //})
        new TerserPlugin({
            parallel: true,
            sourceMap: true,
            terserOptions:{
                compress: true,
                mangle: true,
                warnings: true,
                output: {
                    comments: false
                }
            }
        })
    ]
};


const webPlugins = plugins.slice(0);
const serverPlugins = plugins.slice(0);

// Inform our React code of what build we're on.
// This works via a find-replace.
webPlugins.push(new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(env),
    'SERVERSIDE' : JSON.stringify(false),
    'BUILDTYPE' : JSON.stringify(env)
}));

serverPlugins.push(new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(env),
    'SERVERSIDE' : JSON.stringify(true),
    'BUILDTYPE' : JSON.stringify(env)
}));


if (env === 'development'){ // Skip for dev-quick
    console.log("Will analyze resulting bundles...");
    webPlugins.push(
        new BundleAnalyzerPlugin({
            "analyzerMode" : "static",
            "openAnalyzer" : false,
            "logLevel" : "warn",
            "reportFilename" : "report-web-bundle.html"
        })
    );
    serverPlugins.push(
        new BundleAnalyzerPlugin({
            "analyzerMode" : "static",
            "openAnalyzer" : false,
            "logLevel" : "warn",
            "reportFilename" : "report-server-renderer.html"
        })
    );
}

module.exports = [
    // for browser
    {
        mode: mode,
        entry: {
            "bundle"    : PATHS.static + '/browser'
        },
        target: "web",
        output: {
            path: PATHS.build,
            publicPath: '/static/build/',
            /**
             * @todo
             * Eventually we can change this to be chunkFilename as well, however this can only occur
             * after we refactor React to only render <body> element and then we can use
             * https://www.npmjs.com/package/chunkhash-replace-webpack-plugin, to replace the <script>
             * tag's src attribute. Alternatively could use an `inline.js`, to be included in serverside
             * html render, as entrypoint instd of `browser.js`.
             * For now, to prevent caching JS, we append a timestamp to JS request.
             */
            filename: '[name].js',
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
            { 'xmlhttprequest' : '{XMLHttpRequest:XMLHttpRequest}' }
        ],
        module: {
            rules: rules
        },
        optimization: optimization,
        resolve : resolve,
        //resolveLoader : resolve,
        devtool: devTool,
        plugins: webPlugins
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
            { 'higlass/dist/hglib' : '{HiGlassComponent:{}}' },
            'higlass',
            'higlass-register',
            'higlass-multivec',
            'auth0-lock',
            'aws-sdk',
            'src/encoded/static/components/utils/aws'
        ],
        output: {
            path: PATHS.build,
            filename: '[name].js',
            libraryTarget: 'umd',
            chunkFilename: chunkFilename,
        },
        module: {
            rules: rules.concat([
                { parser: { requireEnsure: false } }
            ])
        },
        optimization: optimization,
        resolve : resolve,
        //resolveLoader : resolve,
        devtool: devTool, // No way to debug/log serverside JS currently, so may as well speed up builds for now.
        plugins: serverPlugins
    }
    //*/
];
