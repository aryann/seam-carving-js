var gulp = require('gulp');
var browserify = require('browserify');
var connect = require('gulp-connect');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var tsify = require('tsify');
var uglify = require('gulp-uglify');
var fancy_log = require('fancy-log');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');
var paths = {
    pages: ['src/*.html', 'src/*.jpg']
};

gulp.task('copy-html', function () {
    return gulp.src(paths.pages)
        .pipe(gulp.dest('dist'));
});

var watchedBrowserify = watchify(browserify({
    basedir: '.',
    debug: true,
    entries: ['src/main.ts'],
    cache: {},
    packageCache: {}
}));

function bundle() {
    return watchedBrowserify
    .plugin(tsify)
    .transform('babelify', {
        presets: ['es2015'],
        extensions: ['.ts']
    })
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(buffer())
    //.pipe(sourcemaps.init({loadMaps: true}))
    //.pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist'));
}

gulp.task('connect', function () {
    connect.server({
        root: 'dist',
        port: 8080,
        livereload: true
    });
});

gulp.task('default', gulp.series(gulp.parallel('copy-html'), bundle, 'connect'));
watchedBrowserify.on('update', bundle);
watchedBrowserify.on('log', fancy_log);
