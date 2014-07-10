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
var express = require('express');
var fs = require('fs');
var mail = require('nodemailer');
var app = express();

// establish module & global variables
exports = module.exports = app;
global.__apppath = __dirname;

require('./environment');
require('./new-db');

// fail if no configuration file found
try {
  fs.readFileSync(__dirname + '/conf.js');
} catch (e) {
  console.log('ERROR: Configuration file not found at (' +
    __dirname + '/conf.js)! Exiting…');
  return;
}


var Common = require('./openmrsid-common');
var conf = Common.conf;
var log = Common.logger.add('express');

mail.SMTP = conf.email.smtp;

/* Load Modules */
conf.systemModules.forEach(function(module) {
  require('./system-modules/' + module);
});
conf.userModules.forEach(function(module) {
  require('./user-modules/' + module);
});


/*
ROUTES
======
*/
require('./routes');


process.on('uncaughtException', function(err) {
  console.log(err);
});


/* App startup: */
app.listen(app.get('port'));
log.info('Express started on port ' + app.get('port'));
