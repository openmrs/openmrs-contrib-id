'use strict';
/**
 * This file handles the password-reset functionalities
 */

var path = require('path');
var async = require('async');
var _ = require('lodash');

var conf = require('../../conf');
var mid = require('../../express-middleware');
var validate = require('../../validate');
var verification = require('../../email-verification');
var utils = require('../../utils');
var log = require('log4js').addLogger('express');

var User = require('../../models/user');

exports = module.exports = function (app) {


app.get('/reset', mid.forceLogout, function(req, res, next) {
  res.render('views/reset-public');
});

app.post('/reset', mid.forceLogout, function(req, res, next) {
  // case-insensitive
  var resetCredential = req.body.resetCredential.toLowerCase();
  var USER_NOT_FOUND_MSG = 'User data not found';
  var REQUIRED = 'Username or e-mail address is required to continue.';

  var filter = {};
  if (resetCredential.indexOf('@') < 0) {
    filter.username = resetCredential;
  } else {
    filter.emailList = resetCredential;
  }

  var checkInput = function(callback) {
    if(resetCredential === '') {
        req.flash('error',REQUIRED);
        return res.redirect('/reset');
    }else {
     callback();
   }
  };

  var findUser = function (callback) {
    User.findByFilter(filter, function (err, user) {
      if (err) {
        return callback(err);
      }
      if (_.isEmpty(user)) {
        log.info('reset requested for nonexistent user "' +
          resetCredential + '"');
        return callback(new Error(USER_NOT_FOUND_MSG));
      }
      callback(null, user);
    });
  };

  var sendEmails = function (user, callback) {
    var username = user.username;
    var emails = user.emailList;

    var emailPath = path.join(__dirname, '../../../templates/emails');
    var sendEmail = function (address, cb) {
      verification.begin({
        addr: address,
        username: username,
        category: 'new password',
        callback: '/reset',
        subject: '[OpenMRS] Password Reset for ' + username,
        templatePath: path.join(emailPath, 'password-reset.jade'),
        locals: {
          username: username,
          displayName: user.displayName,
          allEmails: emails,
        },
      }, cb);
    };
    async.each(emails, sendEmail, callback);
  };

  async.waterfall([
    checkInput,
    findUser,
    sendEmails,
  ],
  function (err) {
    if (err && err.message !== USER_NOT_FOUND_MSG) {
      return next(err);
    }
    req.flash('info', 'If the specified account exists,' +
      ' an email has been sent to your address(es) ' +
      'with further instructions to reset your password.');
    return res.redirect('/');
  });
});

app.get('/reset/:id', mid.forceLogout,
  function(req, res, next) {

  var id = utils.urlDecode64(req.params.id);
  verification.check(id, function(err, valid, locals) {
    if (err) {
      return next(err);
    }
    if (valid) {
      res.render('views/reset-private', {
        username: locals.username,
      });
    } else {
      req.flash('error',
        'The requested password reset has expired or does not exist.');
      res.redirect('/');
    }
  });
});

app.post('/reset/:id', mid.forceLogout,
  function(req, res, next) {


  var id = utils.urlDecode64(req.params.id);
  var npass = req.body.newPassword;
  var cpass = req.body.confirmPassword;


  var validation = function (callback) {
    var validators = {
      newPassword: validate.chkLength.bind(null, npass, 8),
      confirmPassword: validate.chkDiff.bind(null, npass, cpass),
    };

    validate.perform(validators, function (err, failures) {
      if (err) {
        return callback(err);
      }
      if (_.isEmpty(failures)) {
        return callback();
      }
      res.json({fail: failures});
    });
  };

  var chkVerification = function (callback) {
    verification.check(id, function(err, valid, locals) {
      if (err) {
        return next(err);
      }
      if (!valid) {
        req.flash('error',
          'The requested password reset has expired or does not exist.');
        return res.redirect('/');
      }
      return callback(null, locals.username);
    });
  };

  var update = function (username, callback) {
    User.findByUsername(username, function (err, user) {
      if (err) {
        return next(err);
      }
      user.password = npass;

      user.save(function (err) {
        if (err) {
          log.error('password reset failed');
          return next(err);
        }
        log.info('password reset for "' + username + '"');
        verification.clear(req.params.id); // remove validation from DB
        req.flash('success', 'Password has been reset successfully. ' +
          'You may now log in across the OpenMRS Community.');
        res.redirect('/');
      });
    })
  };

  async.waterfall([
    validation,
    chkVerification,
    update,
  ]);
});


};
