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
 
var express = require('express'),
	MySQLSessionStore = require('connect-mysql-session')(express),
	url = require('url'),
	Common = require('./openmrsid-common'),
	app = Common.app,
	conf = Common.conf
	mid = Common.mid
	log = Common.logger.add('environment');

/* http://expressjs.com/guide.html:
 * To alter the environment we can set the NODE_ENV environment variable, for example:
 *
 * $ NODE_ENV=production node app.js
 * This is very important, as many caching mechanisms are only enabled when in production.
 */
 
app.configure(function(){ // executed under all environments
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({
		store: new MySQLSessionStore(conf.db.dbname, conf.db.username, conf.db.password, {
			defaultExpiration: conf.session.duration, // session timeout if browser does not terminate session (1 day)
			logging: false
		}),
		secret: conf.session.secret
	}));
		
	app.use(mid.openmrsHelper());
	
	app.set('view engine', 'ejs');
	app.set('views', __dirname + '/../views');
	
	var siteURLParsed = url.parse(conf.site.url, false, true);
	app.set('basepath', siteURLParsed.pathname);
});

app.configure('development', function(){
	app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));	
	
});

app.configure('production', function(){
	app.use(express.errorHandler());
	
});