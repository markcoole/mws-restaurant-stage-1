const gulp = require('gulp');
const sass = require('gulp-sass');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
const pump = require('pump');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const imageResize = require('gulp-image-resize');
const rename = require("gulp-rename");
const browserSync = require('browser-sync').create();

gulp.task('sass', function(){
  return gulp.src('_assets/scss/*.scss')
    .pipe(sass())
    .pipe(gulp.dest('css/'))
    .pipe(browserSync.reload({
      stream: true
  }))
});

gulp.task('scripts-main', function(){
  return gulp.src([ '_assets/js/dbhelper.js', '_assets/js/responsiveLazy.js', '_assets/js/main.js'])
      .pipe(concat('main.js'))
      .pipe(gulp.dest('js/'));
});

gulp.task('scripts-restaurant', function(){
  return gulp.src([ '_assets/js/dbhelper.js', '_assets/js/restaurant_info.js'])
      .pipe(concat('restaurant_info.js'))
      .pipe(gulp.dest('js/'));
});

gulp.task('minify', () => {
  return gulp.src('js/all.js')
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(uglify())
    .pipe(rename('main.min.js'))
    .pipe(gulp.dest('js/'));
});

gulp.task('images', () =>
    gulp.src('_assets/img/*')
        .pipe(imagemin([
          imagemin.gifsicle({interlaced: true}),
          imagemin.jpegtran({progressive: true}),
          imagemin.optipng({optimizationLevel: 5}),
          imagemin.svgo({
              plugins: [
                  {removeViewBox: true},
                  {cleanupIDs: false}
              ]
          })
      ], {verbose: true}))
        .pipe(gulp.dest('img/'))
);

gulp.task('webp', () =>
    gulp.src('_assets/img/*.jpg')
        .pipe(webp())
        .pipe(gulp.dest('img/'))
);

gulp.task('imgResize', function () {
  gulp.src('_assets/img/*.jpg')
    .pipe(imageResize({
      width : 250
    }))
    .pipe(rename(function (path) { path.basename += "-250px"; }))
    .pipe(gulp.dest('img/'));
});

gulp.task('watch', ['browserSync'], function(){
  gulp.watch('scss/*.scss', ['sass']); 
  // Other watchers
  gulp.watch('css/*.css', browserSync.reload); 
  gulp.watch('*.html', browserSync.reload); 
  gulp.watch('js/*.js', browserSync.reload);
  gulp.watch('js/sw/*.js', browserSync.reload);
})

gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: './'
    },
  })
})
