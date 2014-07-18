/**
 * This file contains some middleware for signup, like validation.
 */

var signupConf = require('../conf.signup.json');

var Common = require(global.__commonModule);
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

  var validators = {
    username: validate.chkUsernameInvalidOrDup.bind(null,username),
    primaryEmail: validate.chkEmailInvalidOrDup.bind(null,primaryEmail),
    firstName: validate.chkEmpty.bind(null, body.firstName),
    lastName: validate.chkEmpty.bind(null, body.lastName),
    password: validate.chkLength.bind(null, body.password, 8),
    recaptcha_response_field: validate.chkRecaptcha.bind(null, captchaData),
  };

  validate.perform(validators, req, res, next);
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
