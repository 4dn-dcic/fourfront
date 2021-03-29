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
        options: {
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
            // This was causing problems in other areas, maybe it will fix our deploy problems? -kmp 2-Mar-2021
            // parallel: true,
            parallel: false,
            sourceMap: true,
            terserOptions:{
                compress: true,
                mangle: true,
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


if (env === 'development'){
    // Skip for `npm run dev-quick` (`env === "quick"`) since takes a while
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
        // node: {
        //     net: "empty",
        //     tls: "empty",
        //     dns: "empty",
        // },
        externals: [
            { 'xmlhttprequest' : '{XMLHttpRequest:XMLHttpRequest}' }
        ],
        module: {
            rules: rules
        },
        optimization: optimization,
        resolve: {
            ...resolve,
            alias: {
                'higlass-dependencies': path.resolve(__dirname, "./src/encoded/static/components/item-pages/components/HiGlass/higlass-dependencies.js"),
                'package-lock.json': path.resolve(__dirname, "./package-lock.json"),
                "statistics-page-components" : path.resolve(__dirname, "./src/encoded/static/components/static-pages/components/StatisticsPageViewBody"),
            },
            /**
             * From Webpack CLI:
             * webpack < 5 used to include polyfills for node.js core modules by default.
             * This is no longer the case. Verify if you need this module and configure a polyfill for it.
             * If you want to include a polyfill, you need to:
             *   - add a fallback 'resolve.fallback: { "zlib": require.resolve("browserify-zlib") }'
             *   - install 'browserify-zlib'
             * If you don't want to include a polyfill, you can use an empty module like this:
             *   resolve.fallback: { "zlib": false }
             */
            // fallback: {
            //     "zlib": false
            //      TODO: Upgrade to webpack v5.
            //      TODO: polyfill some, update some to other libs, & exclude rest
            // }
        },
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
        externals: [
            // Anything which is not to be used server-side may be excluded
            // Anything that generates an extra bundle should be excluded from
            // server-side build since it might overwrite web bundle's code-split bundles.
            // But probably some way to append/change name of these chunks in this config.
            {
                'd3': 'd3',
                '@babel/register': '@babel/register',
                'higlass-dependencies': 'empty-module',
                // These remaining /higlass/ defs aren't really necessary
                // but probably speed up build a little bit.
                'higlass/dist/hglib' : 'empty-module',
                'higlass-register': 'empty-module',
                'higlass-multivec': 'empty-module',
                'auth0-lock': 'empty-module',
                'aws-sdk': 'empty-module',
                'package-lock.json': 'empty-module',
                "statistics-page-components" : 'empty-module',
                "micro-meta-app-react" : 'empty-module',
                // Below - prevent some stuff in SPC from being bundled in.
                // These keys are literally matched against the string values, not actual path contents, hence why is "../util/aws".. it exactly what within SPC/SubmissionView.js
                // We can clean up and change to 'aws-utils' in here in future as well and alias it to spc/utils/aws. But this needs to be synchronized with SPC and 4DN.
                // We could have some 'ssr-externals.json' file in SPC (letting it define its own, per own version) and merge it into here.
                // 'aws-utils': 'empty-module',
                '../util/aws': 'empty-module'
            }
        ],
        output: {
            path: PATHS.build,
            filename: '[name].js',
            libraryTarget: 'umd',
            chunkFilename: chunkFilename,
        },
        module: {
            rules
        },
        optimization: optimization,
        resolve: {
            ...resolve,
            // fallback: {
            //     "zlib": false
            // }
        },
        //resolveLoader : resolve,
        devtool: devTool, // No way to debug/log serverside JS currently, so may as well speed up builds for now.
        plugins: serverPlugins
    }
    //*/
];
