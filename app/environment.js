/* ENVIRONMENT.JS
 * TODO FOR RELEASE:
 * - nothing
 */
var express = require('express'),
	MySQLSessionStore = require('connect-mysql-session')(express),
	url = require('url'),
	app = require('./app').app,
	conf = require('./conf'),
	mid = require('./express-middleware'),
	log = require('./logger').add('environment');

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
		store: new MySQLSessionStore(conf.session.dbname, conf.session.username, conf.session.password, {
			defaultExpiration: 1000*60*60*24, // session timeout if browser does not terminate session (1 day)
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

	app.use(express.errorHandler({ showStack: true, html: true, dumpExceptions: true }));	
			
	app.error(function(err, req, res, next){
		log.error(err.stack);
		res.render('error', {e: err});
	});
});

app.configure('production', function(){
	app.use(express.errorHandler());
});