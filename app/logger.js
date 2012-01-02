/* LOGGER.JS
 * TODO FOR RELEASE:
 * - nothing
 */
var log4js = require('log4js'),
	file = log4js.fileAppender(__dirname + '/../logs/openmrsid.log');

log4js.addAppender(file, 'console'); // added by default

// call this to get a log for any module
exports.add = function(logname) {
	var thisLog = log4js.getLogger(logname);
	log4js.addAppender(file, logname);
	
	// use environment specified for Express
	if (process.env.NODE_ENV == 'development') thisLog.setLevel('debug');
	if (process.env.NODE_ENV == 'production') thisLog.setLevel('info');
	else thisLog.setLevel('debug');
	
	return thisLog;
};