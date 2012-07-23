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
	Common = require('./openmrsid-common'),
	app = Common.app,
	log = Common.logger.add('middleware'),
	conf = Common.conf;

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
	var current = app.helpers()._locals, replace = new Object();

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
};

exports.restrictTo = function(role) {
	return function(req, res, next) {
		var fail = function() {
			req.flash('error', 'You are not authorized to access this resource.');
			if (req.session.user) {
				if (req.url=='/') res.redirect(url.resolve(conf.site.url, '/disconnect'));
				else res.redirect('/');
			}
			else res.redirect(url.resolve(conf.site.url, '/login?destination='+encodeURIComponent(req.url)));
		};

		if (req.session.user) {
			if (req.session.user.memberof.indexOf(role) > -1) next();
			else fail();
		}
		else fail();
	};
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
		log.info(req.session.user[conf.user.username]+': denied access to anonymous-only '+req.url);
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
};

// stops a manually-submitted POST from omitting the captcha
// validation itself is handled by validate.js
exports.forceCaptcha = function(req, res, next) {
	if (req.body && req.body.recaptcha_challenge_field && req.body.recaptcha_response_field)
		next();
	else { // make captchas empty strings, so they will be validated (and fail)
		req.body.recaptcha_challenge_field = "";
		req.body.recaptcha_response_field = "";
		next();
	}
};

exports.stripNewlines = function(req, res, next) {
	log.trace('before: '+req.body.loginusername);
	if (req.body) {
		for (var field in req.body) {
			req.body[field] = req.body[field].replace(/(\r\n|\n|\r)/gm,"");
		}

		log.trace('after: '+req.body.loginusername);
	}
	next();
};

// parse paramater tables submitted with "param-table" view. passes an object
exports.parseParamTable = function(req, res, next) {
	var generatedList = [];
	for (var a in req.body) {
		log.trace("parsing "+a+": "+req.body[a]);
		var split = /([0-9]+)-(\D+)/.exec(a), // splits to name and number of input
			ind = parseInt(split[1]), type = split[2];

		if (!req.body[a]) continue; // skip if this link is blank

		if (!generatedList[ind]) {
			generatedList[ind] = {}; // create if it doesn't exist (first item of this link)
			generatedList[ind].id = ind;
		}

		generatedList[ind][type] = req.body[a];
	}
	res.local('params', generatedList);
	next();
};

// ADDED in hope of bot detection
exports.logSignup = function(req, res, next) {
var id = req.body.username, first = req.body.firstname, last = req.body.lastname, email = req.body.email,
    captchaChallenge = req.body.recaptcha_challenge_field, captchaResponse = req.body.recaptcha_response_field;

require("./logger").signup.info("-----\n"
+"SIGNUP FORM POSTED. Details follow:\n"
+"Username: "+id
+"\nFirst/Last: "+first+" "+last
+"\nEmail: "+email
+"\nCaptcha Challenge: "+captchaChallenge
+"\nCaptcha Response: "+captchaResponse+"\n");

next();
}
