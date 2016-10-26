var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');


gulp.task('default', ['webpack', 'watch']);
gulp.task('dev', ['default']);
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
  var date = new Date();
  return function (err, stats) {
    if (err) {
      throw new gutil.PluginError("webpack", err);
    }
    gutil.log("[webpack]", stats.toString({
      colors: true
    }));
    gutil.log("Build Completed"); // Gives (useful) time after each completed compile
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
