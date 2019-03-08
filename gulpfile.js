var gulp        = require('gulp'),
    PluginError = require('plugin-error'),
    log         = require('fancy-log'),
    webpack     = require('webpack');


var setProduction = (done) => {
    process.env.NODE_ENV = 'production';
    done();
};

var setQuick = (done) => {
    process.env.NODE_ENV = 'quick';
    done();
};

var setDevelopment = (done) => {
    process.env.NODE_ENV = 'development';
    done();
};

function webpackOnBuild(done) {
    var start = Date.now();
    return function (err, stats) {
        if (err) {
            throw new PluginError("webpack", err);
        }
        log("[webpack]", stats.toString({
            colors: true
        }));
        var end = Date.now();
        log("Build Completed, running for " + ((end - start)/1000)) + 's';
        if (done) { done(err); }
    };
}

var doWebpack = (cb) => {
    var webpackConfig = require('./webpack.config.js');
    webpack(webpackConfig).run(webpackOnBuild(cb));
};

var watch = () => {
    var webpackConfig = require('./webpack.config.js');
    webpack(webpackConfig).watch(300, webpackOnBuild());
};


const devSlow       = gulp.series(setDevelopment, doWebpack, watch);
const devQuick      = gulp.series(setQuick, doWebpack, watch);
const build         = gulp.series(setProduction, doWebpack);
const buildQuick    = gulp.series(setQuick, doWebpack);

gulp.task('dev', devSlow);
gulp.task('default', devQuick);
gulp.task('dev-quick', devQuick);
gulp.task('build', build);
gulp.task('build-quick', buildQuick);

