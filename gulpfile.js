var browserify = require("browserify");
var buffer = require("vinyl-buffer");
var connect = require("gulp-connect");
var del = require("del");
var glob = require("glob");
var gulp = require("gulp");
var source = require("vinyl-source-stream");
var sourcemaps = require("gulp-sourcemaps");
var tsify = require("tsify");
var uglify = require("gulp-uglify");

var browsertify = browserify({
  basedir: ".",
  debug: true,
  entries: glob.sync("src/*.ts"),
  cache: {},
  packageCache: {}
});

gulp.task("connect", function() {
  connect.server({
    root: "dist",
    port: 8080,
    livereload: true
  });
});

function compileJs() {
  var buf = browsertify
    .plugin(tsify)
    .transform("babelify", {
      presets: ["es2015"],
      extensions: [".ts"]
    })
    .bundle()
    .pipe(source("bundle.js"))
    .pipe(buffer());

  if (process.env.PROD) {
    buf = buf.pipe(uglify());
  } else {
    buf = buf
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write("./"));
  }
  return buf.pipe(gulp.dest("dist"));
}

gulp.task("copy-static-files", function() {
  return gulp.src(["src/*.html", "src/*.jpg"]).pipe(gulp.dest("dist"));
});

gulp.task("clean", function() {
  return del("dist");
});

gulp.task("build", gulp.series("clean", "copy-static-files", compileJs));

gulp.task("load", gulp.series("build", "connect"));
