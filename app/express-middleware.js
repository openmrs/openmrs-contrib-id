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
		replace.showSidebar = (current.showSidebar) ? current.showSidebar : true;
		
		['defaultSidebar', 'sidebar'].forEach(function(prop){
			replace[prop] = (current[prop]) ? current[prop] : [];
		});
		['bodyAppend', 'headAppend', 'headline', 'aboutHTML', 'viewName', 'sentTo'].forEach(function(prop){
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
			
		var startDate = Date.now();
		log.trace('userNavLinks: entering for loop');
		if (req.session.user) log.trace('userNavLinks: current groups: '+req.session.user.memberof.toString());
		
		for (var link in list) {
			
			// determine if session has access to page
			if (list[link].visibleLoggedOut) {
				if (!req.session.user) toRender[link] = list[link];
			}
			else if (list[link].visibleLoggedIn) {
				/* DISABLED due to bugs - ITSM-
				if (list[link].requiredGroup) {
					if (req.session.user && req.session.user.memberof.indexOf(list[link].requiredGroup) > -1)
						toRender[link] = list[link];
				}
				else */if (req.session.user) toRender[link] = list[link];
			}
			else toRender[link] = list[link];
		}
		var timeTaken = Date.now() - startDate;
		log.trace('userNavLinks: outside for loop, took '+timeTaken);
		
		// Hand the result back to EJS
		app.helpers({navLinks: toRender});
		
		// debug
		var names = '';
		for (page in toRender) names += page+', ';
		log.trace('will render nav-links: '+names);
	},
	
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

// set a secondaryemail field to an array, prevents a lot of validation bugs
exports.secToArray = function(req, res, next) {
	if (req.body && req.body.secondaryemail) {
		var secmail = req.body.secondaryemail;
		req.body.secondaryemail = (typeof secmail == 'string') ? [secmail] : secmail;
	}
	next();
}

// stops a manually-submitted POST from omitting the captcha
// validation itself is handled by validate.js
exports.forceCaptcha = function(req, res, next) {
	if (req.body && req.body.recaptcha_challenge_field && req.body.recaptcha_response_field) 
		next();
	else {
		res.send('Forbidden', { 'Content-Type': 'text/plain' }, 403);
		res.end();
	}
};

exports.stripNewlines = function(req, res, next) {
	log.trace('before: '+req.body.loginusername);
	if (req.body) {
		for (field in req.body) {
			req.body[field] = req.body[field].replace(/(\r\n|\n|\r)/gm,"");
		}

		log.trace('after: '+req.body.loginusername);
	}
	next();
}

// not used anywhere anymore, may be removed soon
exports.useTabber = function(req, res, next) {
	var append = app.helpers()._locals.headAppend,
		toAppend = '<script type="text/javascript" src="/resource/omrsid-tab.js"></script>';
		
	(typeof append == 'string') ? append += toAppend : append = toAppend;
	res.local('headAppend', append);
	append = undefined;
	next();
}