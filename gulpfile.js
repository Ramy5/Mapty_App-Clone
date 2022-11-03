let gulp = require("gulp"),
  prefix = require("gulp-autoprefixer"),
  compress = require("gulp-zip");

gulp.task("html", async function () {
  return gulp.src("./index.html").pipe(gulp.dest("dist"));
});

gulp.task("css", async function () {
  return gulp
    .src("./css/mapty.css")
    .pipe(prefix("last 2 version"))
    .pipe(gulp.dest("dist/css"));
});

gulp.task("js", async function () {
  return gulp.src("./js/mapty.js").pipe(gulp.dest("dist/js"));
});

gulp.task("compress", async function () {
  return gulp
    .src("dist/**/*.*")
    .pipe(compress("Website.zip"))
    .pipe(gulp.dest("."));
});

gulp.task("watch", async function () {
  gulp.watch("./index.html", gulp.series("html"));
  gulp.watch("./css/mapty.css", gulp.series("css"));
  gulp.watch("./js/mapty.js", gulp.series("js"));
  gulp.watch("dist/**/*.*", gulp.series("compress"));
});

gulp.task("default", gulp.series("watch"));
