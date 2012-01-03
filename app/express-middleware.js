/* EXPRESS-MIDDLEWARE.JS
 * TODO FOR RELEASE:
 * - move site title 'OpenMRS ID' into configuration
 */
var crypto = require('crypto'),
	Recaptcha = require('recaptcha').Recaptcha,
	connect = require('connect'),
	url = require('url'),
	app = require('./app').app,
	log = require('./logger').add('middleware'),
	conf = require('./conf');
	
// insert our own helpers to be used in rendering
app.helpers({
	// reset error validation variables
	clearErrors: function() {
		app.helpers({failed: false, values: {}, fail: {}, failReason: {}});
	},
	defaultSidebar: conf.defaultSidebar,
	failed: false, fail: {}, values: {},
	aboutHTML: conf.aboutHTML,
	siteURL: conf.siteURL,
	conf: conf
	
});

app.dynamicHelpers({
	flash: function(req){
		// Makes it easier to display flash messages, which are created via req.flash() and erased each page render
		return req.flash();
	},

	clear: function(){
		// Change undefined variables to default values; keep us from getting "undefined" errors from EJS
		var current = app.helpers()._locals, replace = new Object;
		
		replace.title = (current.title) ? current.title : conf.site.title;
		replace.failed = (current.failed) ? current.failed : false;
		replace.showHeadlineAvatar = (current.showHeadlineAvatar) ? current.showHeadlineAvatar : true;
		
		['defaultSidebar', 'sidebar'].forEach(function(prop){
			replace[prop] = (current[prop]) ? current[prop] : [];
		});
		['bodyAppend', 'headAppend', 'headline', 'aboutHTML', 'viewName'].forEach(function(prop){
			replace[prop] = (current[prop]) ? current[prop] : '';
		});
		['flash', 'fail', 'values', 'failReason', 'navLinks'].forEach(function(prop){
			replace[prop] = (current[prop]) ? current[prop] : {};
		});
		app.helpers(replace);
	},
	
	userNavLinks: function(req){
		// Uses login state and privileges to generate the links to include in the user navigation bar
		var list = conf.userNavLinks,
			toRender = {};
			
		for (link in list) {
			if (list[link].visibleLoggedOut) {
				if (!req.session.user) toRender[link] = list[link];
			}
			else if (list[link].visibleLoggedIn) {
				if (list[link].requiredGroup) {
					if (req.session.user && req.session.user.memberof.indexOf(list[link].requiredGroup) > -1)
						toRender[link] = list[link];
				}
				else if (req.session.user) toRender[link] = list[link];
			}
		}
		
		// Hand the result back to EJS
		app.helpers({navLinks: toRender});
	},
	
	// determine which non-default sidebars to render
	// this code should read from the conf.js "pages" structure (see to-dos)
	/*groupPermissionSidebar: function(req) {
		var permissionSidebar = {'sidebar/crowd': 'crowd-administrators'},
			loggedOutSidebar = ['sidebar/id-whatis', 'sidebar/forgotpassword'],
		
		if (!req.session.user) // not logged in, show sidebar
			app.helpers({sidebar: loggedOutSidebar});
		else {
			sidebarsToRender = [] // sidebar elements to be rendered
			for (theSidebar in permissionSidebar) {
				if (req.session.user.memberof.indexOf(permissionSidebar[theSidebar]) > -1) // if user is in required group
					sidebarsToRender.push(theSidebar);
			}
			app.helpers({sidebar: sidebarsToRender});
		}	
	}*/
	
});

exports.openmrsHelper = function(){
	return function(req, res, next){
		if (req.url != '/favicon.ico') {
			if (req.session.user) {
				var mailHash = crypto.createHash('md5').update(req.session.user.mail).digest('hex');
				app.helpers({connected: true, user: req.session.user, mailHash: mailHash});	
			}
			else app.helpers({connected: false});
		}
		next();
	};
};

exports.clear = function(){
	var current = app.helpers()._locals, replace = new Object;
	
	// change undefined variables to default values
	replace.title = (current.title) ? current.title : conf.site.titleg;
	replace.failed = (current.failed) ? current.failed : false;
	
	['defaultSidebar', 'sidebar'].forEach(function(prop){
		replace[prop] = (current[prop]) ? current[prop] : [];
	});
	['bodyAppend', 'headAppend'].forEach(function(prop){
		replace[prop] = (current[prop]) ? current[prop] : '';
	});
	['flash', 'fail', 'values', 'failReason'].forEach(function(prop){
		replace[prop] = (current[prop]) ? current[prop] : {};
	});
	app.helpers(replace);
}

exports.restrictTo = function(role) {
	return function(req, res, next) {
		if (req.session.user) {
			if (req.session.user.memberof.indexOf(role) > -1) next()
			else {
				req.flash('error', 'You are not authorized to access this resource.');
				if (req.url=='/') res.redirect(url.resolve(conf.site.url, '/disconnect'));
				else res.redirect('/');
			}
		}
		else next();
	}
};

exports.forceLogin = function(req, res, next) {
	if (req.session.user) next();
	else {
		log.info('anonymous user: denied access to login-only '+req.url);
		req.flash('error', 'You must be logged in to access '+req.url);
		res.redirect(url.resolve(conf.site.url, '/login?destination='+encodeURIComponent(req.url)));
	}
};

exports.forceLogout = function(req, res, next) {
	if (req.session.user) {
		log.info(req.session.user+': denied access to anonymous-only '+req.url);
		req.flash('error', 'You must be logged out to access '+req.url);
		res.redirect('/');
	}
	else next();
};

// not used anywhere anymore, may be removed soon
exports.useTabber = function(req, res, next) {
	var append = app.helpers()._locals.headAppend,
		toAppend = '<script type="text/javascript" src="/resource/omrsid-tab.js"></script>';
		
	(typeof append == 'string') ? append += toAppend : append = toAppend;
	res.local('headAppend', append);
	append = undefined;
	next();
}