'use strict';
/**
 * This file handles all user-email request
 */
var path = require('path');
var async = require('async');
var _ = require('lodash');

var common = require('../../common');
var conf = require('../../conf');
var verification = require('../../email-verification');
var log = require('log4js').addLogger('express');
var mid = require('../../express-middleware');
var User = require('../../models/user');
var utils = require('../../utils');


var profileMid = require('./middleware');

exports = module.exports = function (app) {


app.get('/profile/email/verify/:id', function(req, res, next) {
  // check for valid email verification ID

  var newEmail = '';
  var newUser = {};
  var id = utils.urlDecode64(req.params.id);

  var checkVerification = function (callback) {
    verification.check(id, function (err, valid, locals) {
      if (!valid) {
        req.flash('error', 'Profile email address verification not found.');
        return res.redirect('/');
      }
      newEmail = locals.mail;
      return callback(null, locals.username);
    });
  };

  // could use findOneAndUpdate
  var findUser = function (username, callback) {
    User.findByUsername(username, callback);
  };

  var updateUser = function (user, callback) {
    user.emailList.push(newEmail);
    newUser = user;
    user.save(function (err, user) {
      if (err) {
        return callback(err);
      }
      log.info('successfully updated email for ' + user.username);
      return callback();
    });
  };

  var clearRecord = function (callback) {
    verification.clear(id, callback);
  };

  async.waterfall([
    checkVerification,
    findUser,
    updateUser,
    clearRecord,
  ],
  function (err) {
    if (err) {
      return next(err);
    }
    req.flash('success', 'Email address verified. Thanks!');
    // TODO
    if (req.session.user) {
      req.session.user = newUser;
      return res.redirect('/profile');
    }
    return res.redirect('/');
  });
});

app.get('/profile/email/resend/:id', mid.forceLogin,
  function(req, res, next) {

  var id = utils.urlDecode64(req.params.id);
  // check for valid id
  verification.resend(id, function(err) {
    if (err) {
      return next(err);
    }
    req.flash('success', 'Email verification has been resent.');
    res.redirect('/profile');
  });
});

app.post('/profile/email', mid.forceLogin, profileMid.emailValidator,
  function (req, res, next) {

  var user = req.session.user;
  var mail = req.body.newEmail;

  log.debug(user.username + ': email address ' +
      mail + ' will be verified');

  // create verification instance
  verification.begin({
    callback: 'profile/email/verify',
    addr: mail,
    category: 'new email',
    username: user.username,
    subject: '[OpenMRS] Email address verification',
    templatePath: path.join(common.templatePath, 'emails/email-verify.jade'),
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

app.get('/profile/email/delete/:email', mid.forceLogin, function (req, res, next) {
  var user = req.session.user;
  var email = req.params.email;

  // primaryEmail can't be deleted
  if (email === user.primaryEmail) {
    req.flash('error', 'You cannot delete the primaryEmail');
    return res.redirect('/profile');
  }
  // verified
  if (-1 !== _.indexOf(user.emailList, email)) {
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
    return ;
  }

  // not verified
  log.debug('deleting verification for new email');
  var MSG = 'Email to delete not found'; // remove verifications
  var findVerification = function (callback) {
    verification.search(email, 'new email', function (err, instances) {
      if (err) {
        return callback(err);
      }
      if (_.isEmpty(instances)) {
        return callback(new Error(MSG));
      }
      if (instances.length > 1) {
        log.debug('There should be at most one instance matched');
      }
      return callback(null, instances[0]);
    });
  };

  var deleteVerification = function (instance, callback) {
    verification.clear(instance.uuid, callback);
  };

  if (-1 === _.indexOf(user.emailList, email)) {
    // delete veritification
    async.waterfall([
      findVerification,
      deleteVerification,
    ],
    function (err) {
      if (err) {
        if (err.message === MSG) {
          return ;
        }
        return next(err);
      }
      return res.redirect('/profile');
    });
  }
});

app.get('/profile/email/primary/:email', mid.forceLogin, function (req, res, next) {
  var email = req.params.email;
  var user = req.session.user;

  if (!_.contains(user.emailList, email)) {
    req.flash('error', 'You can only set your own email primary');
    return res.redirect('/profile');
  }

  var findUser = function (callback) {
    User.findByUsername(user.username, callback);
  };

  var setEmail = function (user, callback) {
    user.primaryEmail = email;
    user.save(callback);
  };

  async.waterfall([
    findUser,
    setEmail,
  ],
  function (err, user) {
    if (err) {
      return next(err);
    }
    log.info(user.username + 'successfully updated');
    req.session.user = user;
    return res.redirect('/profile');
  });
});


};
