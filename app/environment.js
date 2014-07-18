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
var connect = require('connect');
var MongoStore = require('connect-mongo')(express);
var url = require('url');
var path = require('path');
var lessMiddleware = require('less-middleware');
var engine = require('ejs-locals');
var flash = require('connect-flash');

var app = require('./app');
var conf = require('./conf');
var mid = require('./express-middleware');
var log = require('./logger').add('environment');


/* http://expressjs.com/guide.html:
 * To alter the environment we can set the NODE_ENV environment variable,
 *   for example:
 *
 * $ NODE_ENV=production node app.js
 * This is very important, as many caching mechanisms are only enabled
 *   when in production.
 */

// common environments
var siteURLParsed = url.parse(conf.site.url, false, true);

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/../views');
app.locals._layoutFile = '/layout.ejs';
app.set('basepath', siteURLParsed.pathname);
app.set('port', 3000);

app.use(flash());
app.use(express.bodyParser()); // should be replaced
app.use(express.cookieParser());

// store express session in MongoDB
var sessionStore = new MongoStore({
  url: conf.mongo.uri,
  username: conf.mongo.username,
  password: conf.mongo.password,
});
var session = express.session({
  store: sessionStore,
  secret: conf.session.secret,
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
  log.info('Running in development mode');

  app.use(express.errorHandler({
    showStack: true,
    dumpExceptions: true
  }));
  app.use(connect.logger('dev'));

  app.use('/resource', lessMiddleware('/less', {
    dest: '/stylesheets',
    pathRoot: path.join(__dirname, '/../resource/')
  }));

  app.use('/resource', express.static(path.join(__dirname, '/../resource/')));

}

if ('production' === app.get('env')) {
  log.info('Running in production mode');
  app.use(express.errorHandler());

  app.use('/resource', lessMiddleware('/less', {
    dest: '/stylesheets',
    pathRoot: path.join(__dirname, '/../resource/'),
    once: true
  }));

  app.use('/resource', express.static(path.join(__dirname, '/../resource/')));

}
