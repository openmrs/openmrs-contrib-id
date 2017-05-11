'use strict';
const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');

const path = require('path');
const fs = require('fs');
const conf = require('./app/conf');

gulp.task('default', ['scripts']);

gulp.task('scripts', () => {
	// generate consts.js
	const fd = fs.openSync(path.join(__dirname, 'resource/scripts/consts.js'), 'w');
	fs.writeSync(fd, `usernameRegex = ${conf.user.usernameRegex};\n`);
	fs.writeSync(fd, `emailRegex = ${conf.email.validation.emailRegex};\n`);
	fs.closeSync(fd);

	return gulp.src([
			'resource/scripts/consts.js',
			'resource/scripts/jquery-addon.js',
			'resource/scripts/form.js',
			'resource/scripts/signup.js',
			'resource/scripts/profile.js',
			'resource/scripts/reset-public.js',
			'resource/scripts/reset-private.js',
			'bower_components/cryptojslib/rollups/sha512.js'
		])
		.pipe(concat('min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('resource/scripts/'));
});
