var async = require('async');
var _ = require('lodash');

var Common = require(global.__commonModule);
var verification = Common.verification;
var utils = Common.utils;
var validate = Common.validate;
var User = Common.models.user;

exports.emailValidator = function (req, res, next) {
  var email = req.body.newEmail;
  var category = verification.categories.newEmail;

  var chkEmail = function (callback) {
    if (utils.isEmailValid(email)) {
      return callback();
    }
    return callback(true);
  };

  var findDuplicateInVerification = function (callback) {
    verification.search(email, category, function (err, instances) {
      if (err) {
        return callback(err);
      }
      if (instances.length > 0) {
        return callback(true);
      }
      return callback();
    });
  };

  var findDuplicateInEmailList = function (callback) {
    if (-1 !== _.indexOf(req.session.user.emailList)) {
      return callback(true);
    }
    return callback();
  };

  async.series([
    chkEmail,
    findDuplicateInVerification,
    findDuplicateInEmailList,
  ],
  function (err) {
    if ((typeof err) === 'boolean') {
      req.flash('error', 'You\'ve already added this');
      return res.redirect('/profile');
    }
    if (err) {
      return next(err);
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
