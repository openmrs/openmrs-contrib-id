'use strict';
/**
 * This file handles users' password related request.
 */
var path = require('path');
var async = require('async');
var _ = require('lodash');

var common = require('../../common');
var conf = require('../../conf');
var verification = require('../../email-verification');
var validate = require('../../validate');
var log = require('log4js').addLogger('express');
var mid = require('../../express-middleware');
var User = require('../../models/user');



exports = module.exports = function (app) {


// AJAX
app.post('/password', mid.forceLogin,
  function(req, res, next) {

  if (!req.xhr) {
    return next();
  }


  var updUser = req.session.user;

  // Look up the user's canonical record to read the password. (it's not stored
  // on req.session.user for security purposes.)
  var findUser = function (callback) {
    User.findByUsername(updUser.username, function (err, user) {
      if (err) {
        return callback(err);
      }
      if (_.isEmpty(user)) {
        return callback(new Error('User not found for ' + updUser.username));
      }
      return callback(null, user);
    });
  };

  var validation = function (user, callback) {
    var passhash = user.password;
    var currentpassword = req.body.currentpassword;
    var newpassword = req.body.newpassword;
    var confirmpassword = req.body.confirmpassword;
    var validators = {
      currentpassword: validate.chkPassword.bind(null,currentpassword,passhash),
      newpassword: validate.chkLength.bind(null,newpassword,8),
      confirmpassword: validate.chkDiff.bind(null,newpassword, confirmpassword),
    };

    validate.perform(validators, function (err, validateError) {
      if (!_.isEmpty(validateError)) {
        return res.json({fail: validateError});
      }
      return callback(null, user);
    });

  };


  var changePassword = function (user, callback) {
    user.password = req.body.newpassword;
    user.save(callback);
  };

  async.waterfall([
    findUser,
    validation,
    changePassword,
  ],
  function (err, user) {
    log.trace('password change no errors');
    log.info(updUser.username + ': password updated');

    req.session.user = user;
    return res.json({success: true});
  });
});


};
