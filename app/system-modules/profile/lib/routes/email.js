/**
 * This file handles all user-email request
 */
var path = require('path');
var async = require('async');
var _ = require('lodash');

var Common = require(global.__commonModule);
var conf = Common.conf;
var mid = Common.mid;
var log = Common.logger.add('express');
var verification = Common.verification;
var app = Common.app;

var User = require(path.join(global.__apppath, 'model/user'));

var settings = require('../settings');
var profileMid = require('../middleware');

var NOT_FOUND_MSG = 'Verification record not found';


app.get('/profile-email/verify/:id', function(req, res, next) {
  // check for valid profile-email verification ID

  var newEmail = '';
  var newUser = {};
  var verifyId = req.params.id;

  var checkVerification = function (callback) {
    verification.check(req.params.id, function (err, valid, locals) {
      if (!valid) {
        req.flash('error', 'Profile email address verification not found.');
        return callback(new Error(NOT_FOUND_MSG));
      }
      newEmail = locals.mail;
      return callback(null, locals.username);
    });
  };

  var findUser = function (username, callback) {
    User.findByUsername(username, callback);
  };

  var updateUser = function (user, callback) {
    user.emailList.push(newEmail);
    newUser = user;
    user.save(function (err, username) {
      if (err) {
        return callback(err);
      }
      log.info('successfully updated email for ' + username);
      return callback();
    });
  };

  var clearRecord = function (callback) {
    verification.clear(verifyId, callback);
  };

  async.waterfall([
    checkVerification,
    findUser,
    updateUser,
    clearRecord,
  ],
  function (err) {
    if (err) {
      if (err.message === NOT_FOUND_MSG) {
        return res.redirect('/');
      }
      return next(err);
    }
    req.flash('success', 'Email address verified. Thanks!');
    if (req.session.user) {
      req.session.user = newUser;
      return res.redirect('/profile');
    }
    return res.redirect('/');
  });
});

app.get('/profile-email/resend/:actionId', mid.forceLogin,
  function(req, res, next) {

  // check for valid id
  verification.resend(req.params.actionId, function(err, email) {
    if (err) {
      return next(err);
    }
    req.flash('success', 'Email verification has been re-sent to "' +
      email + '".');
    res.redirect('/profile');
  });
});

app.get('/profile-email/cancel/:actionId', function(req, res, next) {
  verification.getByActionId(req.params.actionId, function(err, inst) {
    if (err) {
      return next(err);
    }

    var verifyId = inst.verifyId; // get verification ID
    verification.clear(verifyId, function(err) {
      if (err) {
        return next(err);
      }
      req.flash('success', 'Email verification for "' + inst.email +
        '" cancelled.');
      res.redirect('/profile');
    });
  });
});

app.post('/profile-email/add', profileMid.emailValidator,
  function (req, res, next) {

  var user = req.session.user;
  var mail = req.body.newEmail;

  log.debug(user.username + ': email address ' +
      mail + ' will be verified');

  // create verification instance
  verification.begin({
    urlBase: 'profile-email/verify',
    email: mail,
    category: verification.categories.newEmail,
    associatedId: user.username,
    subject: '[OpenMRS] Email address verification',
    template: path.join(settings.viewPath,'/email/email-verify.ejs'),
    locals: {
      displayName: user.displayName,
      username: user.username,
      mail: mail,
    }
  },
  function(err) {
    if (err) {
      return next(err);
    }
    return res.redirect('/profile');
  });
});

app.post('/profile-email/delete', function (req, res, next) {
  var user = req.session.user;
  var email = req.body.email;
  var category = verification.categories.newEmail;

  // primaryEmail can't be deleted
  if (email === user.primaryEmail) {
    req.flash('error', 'You cannot delete the primaryEmail');
    return res.redirect('/profile');
  }

  // remove verifications
  var findVerification = function (callback) {
    verification.search(email, category, function (err, instances) {
      if (err) {
        return callback(err);
      }
      if (_.isEmpty(instances)) {
        return callback(new Error('Email to delete not found'));
      }
      if (instances.length > 1) {
        log.debug('There should be at most one instance matched');
      }
      return callback(null, instances[0]);
    });
  };

  var deleteVerification = function (instance, callback) {
    verification.clear(instance.verifyId, callback);
  };

  if (-1 === _.indexOf(user.emailList, email)) {
    // delete veritification
    async.waterfall([
      findVerification,
      deleteVerification,
    ],
    function (err) {
      if (err) {
        return next(err);
      }
      return res.redirect('/profile');
    });
  }

  var findUser = function (callback) {
    User.findByUsername(user.username, callback);
  };

  var updateUser = function (user, callback) {
    var index = _.indexOf(user.emailList, email);
    user.emailList.splice(index, 1);
    user.save(callback);
  };

  async.waterfall([
    findUser,
    updateUser,
  ],
  function (err, user) {
    if (err) {
      return next(err);
    }
    log.info(user.username + ' successfully updated');
    req.session.user = user;
    return res.redirect('/profile');
  });
});
