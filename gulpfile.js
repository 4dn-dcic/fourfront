var gulp        = require('gulp'),
    PluginError = require('plugin-error'),
    log         = require('fancy-log'),
    webpack     = require('webpack'),
    sass        = require('node-sass');


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



var doSassBuild = (done) => {
    sass.render({
          file: './src/encoded/static/scss/style.scss',
          outFile: './src/encoded/static/css/style.css',
          outputStyle: 'compressed'
    }, function(error, result) { // node-style callback from v3.0.0 onwards
      if (error) {
            console.log(error.status); // used to be "code" in v2x and below
            console.log(error.column);
            console.log(error.message);
            console.log(error.line);
      } else {
            console.log(result.css.toString());

            console.log(result.stats);

            console.log(result.map.toString());
            // or better
            console.log(JSON.stringify(result.map)); // note, JSON.stringify accepts Buffer too
        }
        done();
    });
}


const devSlow       = gulp.series(setDevelopment, doWebpack, watch);
const devQuick      = gulp.series(setQuick, doWebpack, watch);
const build         = gulp.series(setProduction, doWebpack);
const buildQuick    = gulp.series(setQuick, doWebpack);
const buildSass     = gulp.series(setProduction, doSassBuild);

gulp.task('dev', devSlow);
gulp.task('default', devQuick);
gulp.task('dev-quick', devQuick);
gulp.task('build', build);
gulp.task('build-quick', buildQuick);
gulp.task('build-scss', buildSass);

