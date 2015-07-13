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

var Common = require(global.__commonModule);
var conf = Common.conf;
var log = Common.logger.add('validation');
var utils = Common.utils;
var Recaptcha = utils.Recaptcha;

var User = require(path.join(global.__apppath, 'model/user'));

var USERNAME_DUP_MSG = 'This username is already taken. Better luck next time';

var EMAIL_DUP_MSG = 'This email address is already registered. ' +
  'A unique email address must be provided.';

var EMAIL_PLUS_MSG = 'Due to incompatibilities with the Google Apps APIs, ' +
  'email addresses cannot contain "+".';

var WRONG_PWD_MSG = 'Wrong password, please check';

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
  var allowPlus = conf.validation.allowPlusInEmail;
  if (-1 !== _.indexOf(email, '+') && !allowPlus) {
    // disobey the allowplus '+' rule
    return callback(null, EMAIL_PLUS_MSG);
  }
  return callback(null, false);
};

validate.chkEmailInvalidOrDup = function (email, callback) {
  validate.chkEmailInvalid(email, function(err, result) {
    if (err) {
      return callback(err);
    }
    if (result) {
      return callback(null, result);
    }
    User.findByEmail(email, function (err, user) {
      if (err) {
        return callback(err);
      }
      if (user) {
        // duplicate
        return callback(null, EMAIL_DUP_MSG);
      }
      return callback(null, false);
    });
  });
};

validate.chkPassword = function (password, passhash, callback) {
  if (!utils.checkSSHA(password, passhash)) {
    return callback(null, WRONG_PWD_MSG);
  }
  return callback(null, false);
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

validate.chkDiff = function (strA, strB, callback) {
  return callback(null, strA !== strB);
};

/**
 * captcha has these attributes and may get this way
 * {
 *   remoteip: req.connection.remoteAddress,
 *   response: req.body['g-recaptcha-response'],
 * }
 */
validate.chkRecaptcha = function(captchaData, callback) {
  var recaptcha = new Recaptcha(conf.validation.recaptchaPrivate);

  recaptcha.verify(captchaData, function (err, success) {
    if (err) {
      log.error('recaptcha error code', err);
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
    _.merge(res.locals, rsv);
    req.session.validation = {};
  }
  next();
};

//
validate.perform = function (validators, req, res, next) {
  async.parallel(validators, function (err, results) {
    var failed = false;
    var values = {};
    var failures = {};
    var failReason = {};
    // values should be cached to reuse
    var cacheList = ['username', 'firstName', 'lastName', 'primaryEmail'];

    if (err) {
      return next(err);
    }

    // store the values
    _.forIn(results, function (value, key) {
      if (!value) {// valid
        if (-1 !== _.indexOf(cacheList, key)) {
          values[key] = req.body[key];
        }
        return;
      }
      failed = true;
      failures[key] = value;
      if (_.isString(value)) {
        failReason[key] = value;
      }
    });

    if (!failed) { // if all valid, pass the requests to next handler
      log.debug('successed for validation');
      return next();
    }

    req.session.validation = {
      values: values,
      fail: failures,
      failReason: failReason,
    };
    req.flash('error','Please review all the items and try again');
    return res.redirect(req.url);
  });
};

exports = module.exports = validate;
