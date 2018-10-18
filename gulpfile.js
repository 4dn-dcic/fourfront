var gulp        = require('gulp'),
    PluginError = require('plugin-error'),
    log         = require('fancy-log'),
    webpack     = require('webpack');


gulp.task('default', ['webpack', 'watch']);
gulp.task('dev', ['default']);
gulp.task('dev-quick', ['set-quick', 'webpack', 'watch']);
gulp.task('dev-uglified', ['set-quick-uglified','default']);
gulp.task('build', ['set-production', 'webpack']);
gulp.task('build-quick', ['set-quick', 'webpack']);

gulp.task('set-production', [], function () {
    process.env.NODE_ENV = 'production';
});

gulp.task('set-quick', [], function () {
    process.env.NODE_ENV = 'quick';
});

gulp.task('set-quick-uglified', [], function () {
    process.env.NODE_ENV = 'quick-uglified';
});

var webpackOnBuild = function (done) {
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
};

gulp.task('webpack', [], function (cb) {
    var webpackConfig = require('./webpack.config.js');
    webpack(webpackConfig).run(webpackOnBuild(cb));
});

gulp.task('watch', [], function (cb) {
    var webpackConfig = require('./webpack.config.js');
    webpack(webpackConfig).watch(300, webpackOnBuild());
});
