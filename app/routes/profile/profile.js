/**
 * This is the router for /profile. It displays a users profile,
 * and hanldes its editing.
 */
var path = require('path');
var async = require('async');
var _ = require('lodash');
var log = require('log4js').getLogger('express');

var profileMid = require('./middleware');

var common = require('../../common');
var conf = require('../../conf');
var verification = require('../../email-verification');
var validate = require('../../validate');
var mid = require('../../express-middleware');
var User = require('../../model/user');

exports = module.exports = function (app) {


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
    res.render('views/profile/index', {emails: allEmails});
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
    user.displayName = req.body.firstName + ' ' + req.body.lastName;
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


};