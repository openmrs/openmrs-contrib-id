var async = require('async');
var _ = require('lodash');
var path = require('path');

var signupConf = require('../conf.signup.json');

var Common = require(global.__commonModule);
var conf = Common.conf;

var User = require(path.join(global.__apppath, 'model/user'));

var USERNAME_DUP_MSG = 'This username is already taken. Better luck next time';

var EMAIL_DUP_MSG = 'This email address is already registered. ' +
  'A unique email address must be provided.';

var EMAIL_PLUS_MSG = 'Due to incompatibilities with the Google Apps APIs, ' +
  'email addresses cannot contain "+".';


function validator(req, res, next) {
  var body = req.body;
  var failed = false;
  var values = {};
  var failures = {};
  var failreasons = {};
  var cacheList = ['username', 'firstName', 'lastName', 'primaryEmail'];

  function chkUsername(callback) {
    var usernameRegex = conf.usernameRegex;
    var username = body.username;

    if (_.isEmpty(username) || !usernameRegex.test(username)) {
      return callback(null, {username: true});
    }
    User.findOne({username: username}, function (err, user) {
      if (err) {
        return callback(err);
      }
      return callback(null, {username: USERNAME_DUP_MSG});
    });
  }

  function chkPrimaryEmail(callback) {
    var emailRegex = conf.email.validation.emailRegex;
    var primaryEmail = body.primaryEmail;
    var allowPlus = conf.validation.allowPlusInEmail; // should be moved in
    if (_.isEmpty(primaryEmail) || !emailRegex.test(primaryEmail)) {
      return callback(null, {primaryEmail: true});
    }
    if (-1 === _.indexOf(primaryEmail, '+') && !allowPlus) {
      return callback(null, {primaryEmail: EMAIL_PLUS_MSG});
    }
    User.findOne({emailList: primaryEmail}, function (err, user) {
      if (err) {
        return callback(err);
      }
      return callback(null, {primaryEmail: EMAIL_DUP_MSG});
    });
  }

  function chkNames(callback) {
    var lastName = body.lastName;
    var firstName = body.firstName;
    var ret = {};
    if (_.isEmpty(lastName)) {
      ret.lastName = true;
    }
    if (_.isEmpty(firstName)) {
      ret.firstName = true;
    }
    return callback(null, ret);
  }


  async.series([
    chkUsername,
    chkPrimaryEmail,
    chkNames,

  ],
  function (err, results) {
    if (err) {
      return next(err);
    }
    if (_.isEmpty(results)) {
      // push local
      return next();
    }
  });
}

module.exports = {

  // If an expected field isn't submitted, give it a value of an empty string.
  // This is useful because with the empty string, the submission error will
  // be caught by validation middleware.
  includeEmpties: function includeEmpties(req, res, next) {
    console.log(req.body);

    signupConf.signupFieldNames.forEach(function(n) {
      req.body[n] = req.body[n] || '';
    });
    next();
  },
  validator: validator,
};
