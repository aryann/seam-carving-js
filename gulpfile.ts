const browserify = require("browserify");
const buffer = require("vinyl-buffer");
const connect = require("gulp-connect");
const del = require("del");
const glob = require("glob");
const gulp = require("gulp");
const source = require("vinyl-source-stream");
const sourcemaps = require("gulp-sourcemaps");
const tsify = require("tsify");
const uglify = require("gulp-uglify");

const browsertify = browserify({
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
    livereload: true,
  });
});

function compileJs() {
  let buf = browsertify
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
