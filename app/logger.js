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
var log4js = require('log4js'),
	conf = require('./conf');
	
log4js.loadAppender('console');
log4js.loadAppender('file');	
var	file = log4js.appenders.file(__dirname + conf.logger.relativePath);

log4js.replaceConsole();
log4js.addAppender(file, 'console'); // added by default

// call this to get a log for any module
exports.add = function(logname) {
	var thisLog = log4js.getLogger(logname);
	log4js.addAppender(file, logname);
	
	// use environment specified for Express
	if (process.env.NODE_ENV == 'development') thisLog.setLevel('debug');
	else if (process.env.NODE_ENV == 'production') thisLog.setLevel('info');
	else if (process.env.NODE_ENV == 'trace') thisLog.setLevel('trace');
	else thisLog.setLevel('debug');
	
	return thisLog;
};