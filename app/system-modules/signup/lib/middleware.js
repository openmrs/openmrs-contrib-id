/**
 * This file contains some middleware for signup, like validation.
 */
var async = require('async');
var _ = require('lodash');
var path = require('path');
var Recaptcha = require('recaptcha').Recaptcha;

var signupConf = require('../conf.signup.json');

var Common = require(global.__commonModule);
var conf = Common.conf;
var log = Common.logger.add('signup validation');

var User = require(path.join(global.__apppath, 'model/user'));

var USERNAME_DUP_MSG = 'This username is already taken. Better luck next time';

var EMAIL_DUP_MSG = 'This email address is already registered. ' +
  'A unique email address must be provided.';

var EMAIL_PLUS_MSG = 'Due to incompatibilities with the Google Apps APIs, ' +
  'email addresses cannot contain "+".';


function validator(req, res, next) {
  var body = req.body;

  var chkUsername = function(callback) {
    var usernameRegex = conf.user.usernameRegex;
    var username = body.username;

    if (_.isEmpty(username) || !usernameRegex.test(username)) {
      // empty or not valid
      return callback(null, true);
    }
    User.findOne({username: username}, function (err, user) {
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

  var chkPrimaryEmail = function(callback) {
    var emailRegex = conf.email.validation.emailRegex;
    var primaryEmail = body.primaryEmail;
    // should be moved in signup conf
    var allowPlus = conf.validation.allowPlusInEmail;
    if (_.isEmpty(primaryEmail) || !emailRegex.test(primaryEmail)) {
      //empty or not valid
      return callback(null, true);
    }
    if (-1 !== _.indexOf(primaryEmail, '+') && !allowPlus) {
      // disobey the allowplus '+' rule
      return callback(null, EMAIL_PLUS_MSG);
    }
    User.findOne({emailList: primaryEmail}, function (err, user) {
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

  var chkName = function(name, callback) {
    if (_.isEmpty(name)) {
      return callback(null, true);
    }
    return callback(null, false);
  };

  var chkPassword = function(callback) {
    var password = body.password;
    if (_.isEmpty(password) || password.length < 8) {
      // empty or too short
      return  callback(null, true);
    }
    return callback(null, false);
  };

  var chkRecaptcha = function(callback) {
    var captchaData = {
      remoteip: req.connection.remoteAddress,
      challenge: req.body.recaptcha_challenge_field,
      response: req.body.recaptcha_response_field,
    };
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

  async.series({
    username: chkUsername,
    primaryEmail: chkPrimaryEmail,
    firstName: chkName.bind(null, body.firstName),
    lastName: chkName.bind(null, body.lastName),
    password: chkPassword,
    recaptcha_response_field: chkRecaptcha,
  },
  function (err, results) {
    var failed = false;
    var values = {};
    var failures = {};
    var failReason = {};
    // values should be cached to reuse
    var cacheList = ['username', 'firstName', 'lastName', 'primaryEmail'];

    if (err) {
      return next(err);
    }

    _.forIn(results, function (value, key) {
      if (!value && -1 !== _.indexOf(cacheList, key)) {// valid
        values[key] = body[key];
        return;
      }
      failed = true;
      failures[key] = value;
      if (_.isString(value)) {
        failReason[key] = value;
      }
    });

    if (!failed) { // if all valid, pass the requests to next handler
      return next();
    }

    req.session.validation = {
      values: values,
      fail: failures,
      failReason: failReason,
    };
    return res.redirect(req.url);
  });
}

module.exports = {

  // If an expected field isn't submitted, give it a value of an empty string.
  // This is useful because with the empty string, the submission error will
  // be caught by validation middleware.
  includeEmpties: function includeEmpties(req, res, next) {
    signupConf.signupFieldNames.forEach(function(n) {
      req.body[n] = req.body[n] || '';
    });
    next();
  },
  validator: validator,
};
