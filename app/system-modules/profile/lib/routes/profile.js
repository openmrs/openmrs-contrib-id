/**
 * This is the router for /profile. It displays a users profile,
 * and hanldes its editing.
 */
var path = require('path');
var async = require('async');
var _ = require('lodash');

var settings = require('../settings');
var profileMid = require('../middleware');

var Common = require(global.__commonModule);
var conf = Common.conf;
var mid = Common.mid;
var log = Common.logger.add('express');
var validate = Common.validate;
var verification = Common.verification;


var app = Common.app;

var User = require(path.join(global.__apppath, 'model/user'));

app.get('/profile', mid.forceLogin, validate.receive,
  function(req, res, next) {

  // check if any emails being verified

  var user = req.session.user;
  var username = user.username;

  var allEmails = [];

  // verified emails
  _.forEach(user.emailList, function (email) {
    var item = {email: email};
    if (email === user.primaryEmail) {
      item.primary = true;
    }
    allEmails.push(item);
  });

  // unverified emails
  var findNewEmail = function (callback) {
    var category = verification.categories.newEmail;
    verification.search(username, category, callback);
  };

  var addToList = function (verifications, callback) {
    _.forEach(verifications, function (verification) {
      var item = {
        email: verification.email,
        actionId: verification.actionId,
        notVerified: true,
      };
      allEmails.push(item);
    });
    return callback();
  };

  async.waterfall([
    findNewEmail,
    addToList,
  ],
  function (err) {
    if (err) {
      return next(err);
    }
    res.render(path.join(settings.viewPath, 'edit-profile'), {
      emails: allEmails
    });
  });
});

// handle basical profile change, firstName and lastName only currently
app.post('/profile', mid.forceLogin, profileMid.profileValidator,
  function(req, res, next) {

  var username = req.session.user.username;

  var findUser = function (callback) {
    User.findByUsername(username, callback);
  };

  var updateUser = function (user, callback) {
    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;
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
    log.info(username + ' succesfully updated');
    req.session.user = user;
    return res.redirect(req.url);
  });
});
