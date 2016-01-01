'use strict';
var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var path = require('path');
var fs = require('fs');
var conf = require('./app/conf');

gulp.task('scripts', function () {
  var fd = fs.openSync(path.join(__dirname, 'resource/scripts/consts.js'), 'w');
  fs.writeSync(fd, 'usernameRegex = ' + conf.user.usernameRegex + ';\n');
  fs.writeSync(fd, 'emailRegex = ' + conf.email.validation.emailRegex + ';\n');
  fs.closeSync(fd);

  return gulp.src([
    'resource/scripts/consts.js',
    'resource/scripts/signup.js',
    'resource/scripts/form.js',
    'resource/scripts/jquery-addon.js',
    'bower_components/cryptojslib/rollups/md5.js'])
    .pipe(concat('min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('resource/scripts/'));
});


