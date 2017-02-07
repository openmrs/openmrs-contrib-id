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

const path = require('path');

const _ = require('lodash');
const async = require('async');

const conf = require('./conf');
const log = require('log4js').addLogger('validation');
const utils = require('./utils');
const Recaptcha = utils.Recaptcha;

const User = require('./models/user');

const EMAIL_PLUS_MSG = 'No \'+\' allowed';
const WRONG_PASSWORD_MSG = 'Wrong password';
const ALREADY_USED_MSG = 'Already Used.';

const validate = {};

/**
 * These functions all follow this pattern.
 *
 * function(callback), where callback receives (err, errorState).
 * errorState can be true or false, or a string containing the error message.
 * true means this field is wrong.
 */

const isUsernameValid = utils.isUsernameValid;
const isEmailValid = utils.isEmailValid;

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
	const allowPlus = conf.validation.allowPlusInEmail;
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
	const recaptcha = new Recaptcha(conf.validation.recaptchaPrivate);

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
		let failed = false;
		const failures = {};

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
			log.debug('validation successful');
			return callback();
		}

		return callback(null, failures);
	});
};

exports = module.exports = validate;
