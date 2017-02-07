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
const fs = require('fs');
const url = require('url');
const path = require('path');
const express = require('express');
const expressSession = require('express-session');
const mongoose = require('mongoose');
const engine = require('pug').__express;
const lessMiddleware = require('less-middleware');
const flash = require('connect-flash');
const MongoStore = require('connect-mongo')(expressSession);
const _ = require('lodash');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const errorHandler = require('errorhandler');

global.__apppath = __dirname;
const app = express();
exports = module.exports = app;

// patch log4js
require('./logger');
const log4js = require('log4js');

// connect to mongo
require('./new-db');


const mid = require('./express-middleware');
const conf = require('./conf');
const log = log4js.addLogger('express');

const siteURLParsed = url.parse(conf.site.url, false, true);
app.engine('pug', engine);
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '/../templates'));
app.locals._ = _;
app.set('basepath', siteURLParsed.pathname);
app.set('port', 3000);
app.use(flash());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());
app.use(cookieParser());


// store express session in MongoDB
const sessionStore = new MongoStore({
	url: conf.mongo.uri,
});
const session = expressSession({
	store: sessionStore,
	secret: conf.session.secret,
	resave: false,
	saveUninitialized: false,
});

const exceptions = conf.sessionExceptions;
const sessionHandler = (req, res, next) => {
	function test(reg) {
		return reg.test(req.url);
	}
	if (exceptions.some(test)) { // we don't provide session for some exceptions
		return next();
	}
	return session(req, res, next);
};

app.use(sessionHandler);
app.use(mid.openmrsHelper);

//development
if ('development' === app.get('env')) {
	log.info('Running in development mode');

	app.use(errorHandler());

	_.EDT_hidden = true;
	const edt = require('express-debug');
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
	log.info('Running in production mode');
	app.use(errorHandler());

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

if (process.env.NODE_ENV === 'development') {

	app.get('/debug/view/:viewName', (req, res) => {
		res.render(`views/${req.params.viewName}`);
	});


	// app.get('/flash/:msg', function (req, res) {
	//   req.flash('info', req.params.msg);
	//   res.redirect('/sample');
	// });
}

/// DEBUG

// fail if no configuration file found
try {
	fs.readFileSync(`${__dirname}/conf.js`);
} catch (e) {
	console.log(`ERROR: while openning configuration file at (${__dirname}/conf.js)! Exiting…`);
	console.error(e);
}


/*
 *ROUTES
 *======
 * Things that might need to utilize root shall be put before this line,
 * or will be overridden by 404
 */
require('./routes')(app);

/* Load Modules */
conf.userModules.forEach(module => {
	require(`./user-modules/${module}`)(app);
});


require('./db-admin')(app, express);

// this two shall be put at the end
app.use(require('./routes/404'));
app.use(require('./routes/error'));


process.on('uncaughtException', err => {
	log.error(err);
});

// Do something before close the app
const gracefulExit = () => {
	mongoose.connection.close(() => {
		log.info('Mongoose connection closed');
		process.exit();
	});
};
process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit);


/* App startup: */
app.listen(app.get('port'));

log.info(`Express started on port ${app.get('port')}`);
