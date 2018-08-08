'use strict';

let watchify = require('watchify');
let browserify = require('browserify');
let gulp = require('gulp');
let source = require('vinyl-source-stream');
let buffer = require('vinyl-buffer');
let log = require('gulplog');
let sourcemaps = require('gulp-sourcemaps');
let assign = require('lodash.assign');
let path = require('path')
let madge = require('madge')

// add custom browserify options here
let customOpts = {
    entries: [path.resolve(__dirname) + '/app.js'],
    debug: true
};
let opts = assign({}, watchify.args, customOpts);
let b = watchify(browserify(opts));

b.transform('babelify', { presets: ['@babel/preset-env'] })

b.on('update', bundle); // on any dep update, runs the bundler
b.on('log', log.info); // output build logs to terminal

bundle()

// madge(path.resolve(__dirname + '/app.js')).then(function(res){
//     console.log('Objects', res.obj())
//     console.log('Warnings', res.warnings())
//     console.log('Circular', res.circular())
// })

function bundle() {
    console.log('Re-compiling....')
    return b
        .bundle()
    // log errors if they happen
        .on('error', log.error.bind(log, 'Browserify Error'))
        .pipe(source('bundle.js'))
    // optional, remove if you don't need to buffer file contents
        .pipe(buffer())
    // optional, remove if you dont want sourcemaps
        .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
    // Add transformation tasks to the pipeline here.
        .pipe(sourcemaps.write('./')) // writes .map file
        .pipe(gulp.dest('./build/'));
}

