/**
 * This file handles users' password related request.
 */
var path = require('path');
var async = require('async');
var _ = require('lodash');

var settings = require('../settings');

var Common = require(global.__commonModule);
var mid = Common.mid;
var log = Common.logger.add('express');
var validate = Common.validate;
var utils = Common.utils;

var app = Common.app;

var User = require(path.join(global.__apppath, 'model/user'));

app.get('/password', mid.forceLogin, validate.receive(),
  function(req, res, next) {

  res.render(path.join(settings.viewPath,'edit-password'));
});

app.post('/password', mid.forceLogin, validate(), function(req, res, next) {
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
    user.password = utils.getSHA(req.body.newpassword);
    user.save(callback);
  };

  async.waterfall([
    findUser,
    changePassword,
  ],
  function (err) {
    log.trace('password change no errors');
    log.info(updUser.username + ': password updated');

    req.flash('success', 'Password changed.');
    res.redirect('/');
  });
});
