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
var fs = require('fs');
var url = require('url');
var path = require('path');
var express = require('express');
var expressSession = require('express-session');
var mongoose = require('mongoose');
var engine = require('jade').__express;
var lessMiddleware = require('less-middleware');
var flash = require('connect-flash');
var MongoStore = require('connect-mongo')(expressSession);
var _ = require('lodash');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');

global.__apppath = __dirname;
var app = express();
exports = module.exports = app;

// patch log4js
require('./logger');
var log4js = require('log4js');

// connect to mongo
require('./new-db');

// additional scripts for migrating data
// require('./scripts/0.0.1');


var mid = require('./express-middleware');
var conf = require('./conf');
var log = log4js.addLogger('express');

var siteURLParsed = url.parse(conf.site.url, false, true);
app.engine('jade', engine);
app.set('view engine', 'jade');
app.set('views', path.join(__dirname, '/../templates'));
app.locals._ = _;
app.set('basepath', siteURLParsed.pathname);
app.set('port', 3000);
app.use(flash());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());


// store express session in MongoDB
var sessionStore = new MongoStore({
  url: conf.mongo.uri,
});
var session = expressSession({
  store: sessionStore,
  secret: conf.session.secret,
  resave: false,
  saveUninitialized: false,
});

var exceptions = conf.sessionExceptions;
var sessionHandler = function(req, res, next) {
  function test(reg) {
    return reg.test(req.url);
  }
  if (exceptions.some(test)) { // we don't provide session for some exceptions
    return next();
  }
  return session(req,res,next);
};

app.use(sessionHandler);
app.use(mid.openmrsHelper);

//development
if ('development' === app.get('env')) {
  console.log('Running in development mode');

  app.use(errorHandler());

  var edt = require('express-debug');
  edt(app, {});

  app.use(log4js.connectLogger(log, {
    level: 'debug',
    format: ':method :status :url - :response-time ms',
  }));

  app.use('/resource', lessMiddleware('/less', {
    dest: '/stylesheets',
    pathRoot: path.join(__dirname, '/../resource/')
  }));


}

if ('production' === app.get('env')) {
  console.log('Running in production mode');
  app.use(express.errorHandler());

  app.use('/resource', lessMiddleware('/less', {
    dest: '/stylesheets',
    pathRoot: path.join(__dirname, '/../resource/'),
    once: true
  }));


}

app.use('/resource', express.static(path.join(__dirname, '/../resource/')));
app.use('/bower_components', express.static(path.join(__dirname,
  '/../bower_components/')));


require('./render-helpers');

/// DEBUG

// app.get('/sample', function (req, res) {
//   res.render('layouts/base');
// });

// app.get('/flash/:msg', function (req, res) {
//   req.flash('info', req.params.msg);
//   res.redirect('/sample');
// });

/// DEBUG

// fail if no configuration file found
try {
  fs.readFileSync(__dirname + '/conf.js');
} catch (e) {
  console.log('ERROR: Configuration file not found at (' +
    __dirname + '/conf.js)! Exiting…');
  return;
}



/* Load Modules */
// conf.userModules.forEach(function(module) {
//   require('./user-modules/' + module);
// });




/*
 *ROUTES
 *======
 * Things that might need to utilize root shall be put before this line,
 * or will be overridden by 404
*/
require('./routes')(app);


require('./db-admin')(app);

// this two shall be put at the end
app.use(require('./routes/404'));
app.use(require('./routes/error'));


process.on('uncaughtException', function(err) {
  console.log(err);
});

// Do something before close the app
var gracefulExit = function () {
  mongoose.connection.close(function () {
    console.log('Mongoose connection closed');
    process.exit();
  });
};
process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit);


/* App startup: */
app.listen(app.get('port'));

console.log('Express started on port ' + app.get('port'));
