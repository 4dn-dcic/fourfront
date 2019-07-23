var gulp        = require('gulp'),
    PluginError = require('plugin-error'),
    log         = require('fancy-log'),
    webpack     = require('webpack'),
    sass        = require('node-sass'),
    fs          = require('fs');


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


// TODO: Just use command-line `node-sass` ?

const cssOutputLocation = './src/encoded/static/css/style.css';

var doSassBuild = (done, options = {}) => {
    sass.render({
        file: './src/encoded/static/scss/style.scss',
        outFile: './src/encoded/static/css/style-map.css', // sourceMap location
        outputStyle: options.outputStyle || 'compressed',
        sourceMap: true
    }, function(error, result) { // node-style callback from v3.0.0 onwards
        if (error) {
            console.error("Error", error.status, error.file, error.line + ':' + error.column);
            console.log(error.message);
            done();
        } else {
            //console.log(result.css.toString());

            console.log("Finished compiling SCSS in", result.stats.duration, "ms");
            console.log("Writing to", cssOutputLocation);

            fs.writeFile(cssOutputLocation, result.css.toString(), null, function(err){
                if (err){
                    return console.error(err);
                }
                console.log("Wrote " + cssOutputLocation);
                done();
            });
        }
    });
}


const devSlow       = gulp.series(setDevelopment, doWebpack, watch);
const devQuick      = gulp.series(setQuick, doWebpack, watch);
const build         = gulp.series(setProduction, doWebpack);
const buildQuick    = gulp.series(setQuick, doWebpack);

gulp.task('dev', devSlow);
gulp.task('default', devQuick);
gulp.task('dev-quick', devQuick);
gulp.task('build', build);
gulp.task('build-quick', buildQuick);

gulp.task('build-scss', (done) => doSassBuild(done, {}));
gulp.task('build-scss-dev', (done) => {
    doSassBuild(
        () => {
            console.log('Watching for changes (if ran via `npm run watch-scss`)');
            done();
        },
        { outputStyle : 'expanded' }
    );
});

