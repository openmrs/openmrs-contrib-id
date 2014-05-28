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
var MySQLSessionStore = require('connect-mysql-session')(express);
var url = require('url');
var path = require('path');
var lessMiddleware = require('less-middleware');
var Common = require(global.__commonModule);
var app = Common.app;
var conf = Common.conf;
var mid = Common.mid;
var log = Common.logger.add('environment');

/* http://expressjs.com/guide.html:
 * To alter the environment we can set the NODE_ENV environment variable,
 *   for example:
 *
 * $ NODE_ENV=production node app.js
 * This is very important, as many caching mechanisms are only enabled
 *   when in production.
 */

app.configure(function configureExpress() { // executed under all environments
  app.use(express.bodyParser());
  app.use(express.cookieParser());

  // store express session in MySQL
  var sessionStore = new MySQLSessionStore(
    conf.db.dbname,
    conf.db.username,
    conf.db.password, {
      // session timeout if browser does not terminate session (1 day)
      defaultExpiration: conf.session.duration,
      logging: false,
    }
  );
  app.use(
    express.session({
      store: sessionStore,
      secret: conf.session.secret
    })
  );

  app.use(mid.openmrsHelper());

  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/../views');

  var siteURLParsed = url.parse(conf.site.url, false, true);
  app.set('basepath', siteURLParsed.pathname);
});

app.configure('development', function() {
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

});

app.configure('production', function() {
  app.use(express.errorHandler());

	app.use('/resource', lessMiddleware('/less', {
		dest: '/stylesheets',
		pathRoot: path.join(__dirname, '/../resource/'),
		once: true
	}));

	app.use('/resource', express.static(path.join(__dirname, '/../resource/')));

});
