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
const gzip          = require('gulp-gzip');
const compression   = require("compression");
const browserSync = require('browser-sync').create();


/* Sass to css gulp task */
gulp.task('sass', function(){
  return gulp.src('_assets/scss/*.scss')
    .pipe(sass())
    .pipe(gulp.dest('css/'))
    .pipe(browserSync.reload({
      stream: true
  }))
});

/* Compile the JS for the main index page */
gulp.task('scripts-main', function(){
  return gulp.src([ '_assets/js/indexDB.js', '_assets/js/dbhelper.js', '_assets/js/main.js'])
      .pipe(concat('main.js'))
      .pipe(gulp.dest('js/'))
      .pipe(babel({
        presets: ['es2015']
       }))
      .pipe(rename('main.min.js'))
      .pipe(gulp.dest('js/'))
});

/* Compile the JS for the single restaurant page */
gulp.task('scripts-restaurant', function(){
  return gulp.src([ '_assets/js/indexDB.js', '_assets/js/dbhelper.js', '_assets/js/restaurant_info.js'])
      .pipe(concat('restaurant_info.js'))
      .pipe(gulp.dest('js/'))
      .pipe(babel({
        presets: ['es2015']
       }))
      .pipe(rename('restaurant_info.min.js'))
      .pipe(gulp.dest('js/'))
});

/* Compile the JS for the main index page */
// gulp.task('minify', () => {
//   return gulp.src('js/all.js')
//     .pipe(babel({
//       presets: ['es2015']
//     }))
//     .pipe(uglify())
//     .pipe(rename('main.min.js'))
//     .pipe(gulp.dest('js/'));
// });

/* Optimise images */
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

/* Convert images to webp */
gulp.task('webp', () =>
    gulp.src('_assets/img/*.jpg')
        .pipe(webp())
        .pipe(gulp.dest('img/'))
);

/* Resze images */
gulp.task('imgResize', function () {
  gulp.src('_assets/img/*.jpg')
    .pipe(imageResize({
      width : 250
    }))
    .pipe(rename(function (path) { path.basename += "-250px"; }))
    .pipe(gulp.dest('img/'));
});

/* watch browser sync setup */
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
      baseDir: './',
      middleware: compression()
    },
  })
})


/* watch browser sync setup */
gulp.task('serve', function(){
  browserSync.init({
    server: {
      baseDir: './',
      middleware: compression()
    },
  })
})
