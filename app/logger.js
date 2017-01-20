'use strict';
/**
 * The contents of this file are subject to the OpenMRS Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */
var path = require('path');

var log4js = require('log4js');
var conf = require('./conf');

if (process.env.NODE_ENV === 'development') {
	log4js.setGlobalLogLevel('debug');
} else if (process.env.NODE_ENV === 'production') {
	log4js.setGlobalLogLevel('info');
}

log4js.replaceConsole();
log4js.loadAppender('console');
log4js.loadAppender('file');

var set = new Set();
var logFile = log4js.appenders.file(
	path.join(__dirname, conf.logger.relativePath)
);

log4js.addLogger = name => {
	if (!set.has(name)) {
		set.add(name);
		log4js.addAppender(logFile, name);
	}
	return log4js.getLogger(name);
};

var signupFile = log4js.appenders.file(
	path.join(__dirname, '/../logs/signuplog.log')
);
log4js.addAppender(signupFile, 'signup');