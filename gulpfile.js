var gulp = require('gulp');
var sass = require('gulp-sass');
var browserSync = require('browser-sync').create();

gulp.task('sass', function(){
  return gulp.src('scss/*.scss')
    .pipe(sass())
    .pipe(gulp.dest('css/'))
    .pipe(browserSync.reload({
      stream: true
  }))
});

gulp.task('watch', ['browserSync'], function(){
  gulp.watch('scss/*.scss', ['sass']); 
  // Other watchers
  gulp.watch('css/*.css', browserSync.reload); 
  gulp.watch('*.html', browserSync.reload); 
  gulp.watch('js/*.js', browserSync.reload);
})

gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: './'
    },
  })
})