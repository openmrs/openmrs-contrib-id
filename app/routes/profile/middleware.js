'use strict';
var async = require('async');
var _ = require('lodash');

var verification = require('../../email-verification');
var validate = require('../../validate');
var utils = require('../../utils');
var User = require('../../models/user');

var EMAIL_DUP_MSG = 'This email address is already registered. ' +
  'A unique email address must be provided.';

exports.emailValidator = function (req, res, next) {
  req.body.newEmail = req.body.newEmail.toLowerCase();
  var email = req.body.newEmail;
  var category = verification.categories.newEmail;

  var findDuplicateInVerification = function (validateError, callback) {
    if (validateError) {
      return callback(null, validateError);
    }
    verification.search(email, category, function (err, instances) {
      if (err) {
        return callback(err);
      }
      if (instances.length > 0) {
        return callback(null, EMAIL_DUP_MSG);
      }
      return callback(null, false);
    });
  };

  async.waterfall([
    validate.chkEmailInvalidOrDup.bind(null, email),
    findDuplicateInVerification,
  ],
  function (err, validateError) {
    if (err) {
      return next(err);
    }
    if (validateError) {
      var msg = 'Invalid email, please check again.';
      if (_.isString(validateError)) {
        msg = validateError;
      }
      req.flash('error', msg);
      return res.redirect('/profile');
    }
    return next();
  });
};

exports.profileValidator = function (req, res, next) {
  var firstName = req.body.firstName;
  var lastName = req.body.lastName;
  var validators = {
    firstName: validate.chkEmpty.bind(null, firstName),
    lastName: validate.chkEmpty.bind(null, lastName),
  };
  validate.perform(validators, req, res, next);
};

exports.passwordValidator = function (req, res, next) {

  // Look up the user's canonical record to read the password. (it's not stored
  // on req.session.user for security purposes.)
  User.findById(req.session.user._id).exec()
  .then(function(user) {

    var passhash = user.password;
    var currentpassword = req.body.currentpassword;
    var newpassword = req.body.newpassword;
    var confirmpassword = req.body.confirmpassword;
    var validators = {
      currentpassword: validate.chkPassword.bind(null,currentpassword,passhash),
      newpassword: validate.chkLength.bind(null,newpassword,8),
      confirmpassword: validate.chkDiff.bind(null,newpassword, confirmpassword),
    };
    validate.perform(validators, req, res, next);

  }, next);
};
