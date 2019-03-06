const path = require('path');
const webpack = require('webpack');
const env = process.env.NODE_ENV;
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const PATHS = {
    "static": path.resolve(__dirname, 'src/encoded/static'),
    "build" : path.resolve(__dirname, 'src/encoded/static/build'),
};

const mode = (env === 'production' ? 'production' : 'development');

const plugins = [];

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

    // tell react to use production build
    plugins.push(new webpack.DefinePlugin({
        'process.env': {
            'NODE_ENV': '"production"'
        }
    }));

    // add chunkhash to chunk names for production only (it's slower)
    chunkFilename = '[name].[chunkhash].js';
    devTool = 'source-map';
} else if (env === 'quick') {
    devTool = 'eval'; // Fastest
} else if (env === 'development') {
    devTool = 'inline-source-map';
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
    minimize: mode === "production",
    minimizer: [
        //new UglifyJsPlugin({
        //    parallel: true,
        //    sourceMap: true
        //})
        new TerserPlugin({
            parallel: true,
            terserOptions:{
                compress: true,
                mangle: true,
                sourceMap: true
            }
        })
    ]
};


const webPlugins = plugins.slice(0);
const serverPlugins = plugins.slice(0);

if (mode === 'development'){
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
        resolveLoader : resolve,
        devtool: devTool, // No way to debug/log serverside JS currently, so may as well speed up builds for now.
        plugins: serverPlugins
    }
    //*/
];
