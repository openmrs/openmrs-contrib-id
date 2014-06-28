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

var Recaptcha = require('recaptcha').Recaptcha;
var path = require('path');

var _ = require('lodash');

var Common = require(global.__commonModule);
var conf = Common.conf;
var log = Common.logger.add('validation');
var User = require(path.join(global.__apppath, 'model/user'));

var USERNAME_DUP_MSG = 'This username is already taken. Better luck next time';

var EMAIL_DUP_MSG = 'This email address is already registered. ' +
  'A unique email address must be provided.';

var EMAIL_PLUS_MSG = 'Due to incompatibilities with the Google Apps APIs, ' +
  'email addresses cannot contain "+".';

var validate = {};

/**
 * These functions all follow this pattern.
 *
 * function(callback), where callback receives (err, errorState).
 * errorState can be true or false, or a string containing the error message.
 * true means this field is wrong.
 */

var isUsernameValid = function (username) {
  var usernameRegex = conf.user.usernameRegex;
  if (_.isEmpty(username) || !usernameRegex.test(username)) {
    // ensure it not empty first, avoid auto-cast for (null) or (undefined)
    return false;
  }
  return true;
};

var isEmailValid = function (email) {
  var emailRegex = conf.email.validation.emailRegex;
  if (_.isEmpty(email) || !emailRegex.test(email)) {
    return false;
  }
  return true;
};

validate.chkUsernameInvalid = function (username, callback) {
  if (!isUsernameValid(username)) {
    return callback(null, true);
  }
  return callback(null, false);
};

validate.chkUsernameInvalidOrDup = function (username, callback) {
  if (!isUsernameValid(username)) {
    return callback(null, true);
  }
  User.findByUsername(username, function (err, user) {
    if (err) {
      return callback(err);
    }
    if (user) {
      // duplicate
      return callback(null, USERNAME_DUP_MSG);
    }
    return callback(null, false);
  });
};

validate.chkEmailInvalid = function(email, callback) {
  if (!isEmailValid(email)) {
    return callback(null, true);
  }
  return callback(null, false);
};

validate.chkEmailInvalidOrDup = function (email, callback) {
  if (!isEmailValid(email)) {
    return callback(null, true);
  }
  var allowPlus = conf.validation.allowPlusInEmail;
  if (-1 !== _.indexOf(email, '+') && !allowPlus) {
    // disobey the allowplus '+' rule
    return callback(null, EMAIL_PLUS_MSG);
  }
  User.findOne({emailList: email}, function (err, user) {
    if (err) {
      return callback(err);
    }
    if (user) {
      // duplicate
      return callback(null, EMAIL_DUP_MSG);
    }
    return callback(null, false);
  });
};

validate.chkEmpty = function (str, callback) {
  if (_.isEmpty(str)) {
    return callback(null, true);
  }
  return callback(null, false);
};

validate.chkLength = function(str, minLen, callback) {
  if (_.isEmpty(str) || str.length < minLen) {
    // avoid undefined error
    return  callback(null, true);
  }
  return callback(null, false);
};

/**
 * captcha has these attributes and may get this way
 * {
 *   remoteip: req.connection.remoteAddress,
 *   challenge: req.body.recaptcha_challenge_field,
 *   response: req.body.recaptcha_response_field,
 * }
 */
validate.chkRecaptcha = function(captchaData, callback) {
  var recaptcha = new Recaptcha(conf.validation.recaptchaPublic,
    conf.validation.recaptchaPrivate, captchaData
  );
  recaptcha.verify(function (success, errorCode) {
    if (errorCode) {
      log.debug('recaptcha error code', errorCode);
    }
    if (!success) {
      return callback(null, true);
    }
    return callback(null, false);
  });
};

// check for validation records (presumably coming from a failed POST that we're
// being redirected from). if any are found, move them to the render variables
validate.receive = function (req, res, next) {
  var rs = req.session;
  var rsv = rs.validation;

  if (rs && rsv && !_.isEmpty(rsv)) {
    res.locals(rsv); // include the properties from validation
    req.session.validation = {};
  }
  next();
};

exports = module.exports = validate;
