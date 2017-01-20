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
 *
 *
 * This source file contains the validation functions for all kinds of form.
 */

var path = require('path');

var _ = require('lodash');
var async = require('async');

var conf = require('./conf');
var log = require('log4js').addLogger('validation');
var utils = require('./utils');
var Recaptcha = utils.Recaptcha;

var User = require('./models/user');

var EMAIL_PLUS_MSG = 'No \'+\' allowed';
var WRONG_PASSWORD_MSG = 'Wrong password';
var ALREADY_USED_MSG = 'Already Used.';

var validate = {};

/**
 * These functions all follow this pattern.
 *
 * function(callback), where callback receives (err, errorState).
 * errorState can be true or false, or a string containing the error message.
 * true means this field is wrong.
 */

var isUsernameValid = utils.isUsernameValid;
var isEmailValid = utils.isEmailValid;

validate.chkUsernameInvalid = (username, callback) => {
	if (!isUsernameValid(username)) {
		return callback(null, true);
	}
	return callback(null, false);
};

validate.chkUsernameInvalidOrDup = (username, callback) => {
	if (!isUsernameValid(username)) {
		return callback(null, true);
	}
	User.findByUsername(username, (err, user) => {
		if (err) {
			return callback(err);
		}
		if (user) {
			// duplicate
			return callback(null, ALREADY_USED_MSG);
		}
		return callback(null, false);
	});
};

validate.chkEmailInvalid = (email, callback) => {
	if (!isEmailValid(email)) {
		return callback(null, true);
	}
	var allowPlus = conf.validation.allowPlusInEmail;
	if (-1 !== _.indexOf(email, '+') && !allowPlus) {
		// disobey the allowplus '+' rule
		return callback(null, EMAIL_PLUS_MSG);
	}
	return callback(null, false);
};

validate.chkEmailInvalidOrDup = (email, callback) => {
	validate.chkEmailInvalid(email, (err, result) => {
		if (err) {
			return callback(err);
		}
		if (result) {
			return callback(null, result);
		}
		User.findByEmail(email, (err, user) => {
			if (err) {
				return callback(err);
			}
			if (user) {
				// duplicate
				return callback(null, ALREADY_USED_MSG);
			}
			return callback(null, false);
		});
	});
};

validate.chkPassword = (password, passhash, callback) => {
	if (!utils.checkSSHA(password, passhash)) {
		return callback(null, WRONG_PASSWORD_MSG);
	}
	return callback(null, false);
};

validate.chkEmpty = (str, callback) => {
	if (_.isEmpty(str)) {
		return callback(null, true);
	}
	return callback(null, false);
};

//TODO Add maxlength limitation
validate.chkLength = (str, minLen, callback) => {
	if (_.isEmpty(str) || str.length < minLen) {
		// avoid undefined error
		return callback(null, true);
	}
	return callback(null, false);
};

validate.chkDiff = (strA, strB, callback) => callback(null, strA !== strB);

/**
 * captcha has these attributes and may get this way
 * {
 *   remoteip: req.connection.remoteAddress,
 *   response: req.body['g-recaptcha-response'],
 * }
 */
validate.chkRecaptcha = (captchaData, callback) => {
	var recaptcha = new Recaptcha(conf.validation.recaptchaPrivate);

	recaptcha.verify(captchaData, (err, success) => {
		if (err) {
			log.error('recaptcha error code', err);
		}
		if (!success) {
			return callback(null, true);
		}
		return callback(null, false);
	});
};

validate.perform = (validators, callback) => {
	async.parallel(validators, (err, results) => {
		var failed = false;
		var failures = {};

		if (err) {
			return callback(err);
		}

		// store the values
		_.forIn(results, (value, key) => {
			if (!value) { // valid
				return;
			}
			failed = true;
			failures[key] = value;
		});

		if (!failed) { // if all valid, pass the requests to next handler
			log.debug('successed for validation');
			return callback();
		}

		return callback(null, failures);
	});
};

exports = module.exports = validate;