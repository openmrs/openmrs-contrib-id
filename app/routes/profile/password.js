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



var profileMid = require('./middleware');

exports = module.exports = function (app) {


app.post('/password', mid.forceLogin, profileMid.passwordValidator,
  function(req, res, next) {

  var updUser = req.session.user;

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
  var changePassword = function (user, callback) {
    user.password = req.body.newpassword;
    user.save(callback);
  };

  async.waterfall([
    findUser,
    changePassword,
  ],
  function (err, user) {
    log.trace('password change no errors');
    log.info(updUser.username + ': password updated');

    req.flash('success', 'Password changed.');
    req.session.user = user;
    res.redirect('/profile');
  });
});


};
