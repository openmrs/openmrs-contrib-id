/**
 * This file contains some middleware for signup, like validation.
 */
var async = require('async');
var _ = require('lodash');

var signupConf = require('../conf.signup.json');

var Common = require(global.__commonModule);
var log = Common.logger.add('signup validation');
var validate = Common.validate;


function validator(req, res, next) {
  // just aliases
  var body = req.body;
  var username = body.username;
  var primaryEmail = body.primaryEmail;
  var captchaData = {
    remoteip: req.connection.remoteAddress,
    challenge: req.body.recaptcha_challenge_field,
    response: req.body.recaptcha_response_field,
  };

  async.parallel({
    username: validate.chkUsernameInvalidOrDup.bind(null,username),
    primaryEmail: validate.chkEmailInvalidOrDup.bind(null,primaryEmail),
    firstName: validate.chkEmpty.bind(null, body.firstName),
    lastName: validate.chkEmpty.bind(null, body.lastName),
    password: validate.chkLength.bind(null, body.password, 8),
    recaptcha_response_field: validate.chkRecaptcha.bind(null, captchaData),
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

    // store the values
    _.forIn(results, function (value, key) {
      if (!value) {// valid
        if (-1 !== _.indexOf(cacheList, key)) {
          values[key] = body[key];
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
      log.debug('failed for validation');
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
