'use strict';
/**
 * This file handles requests related with signup operations
 */
var url = require('url');
var path = require('path');
var async = require('async');
var _ = require('lodash');
var log = require('log4js').addLogger('signup');

var conf = require('../../conf');
var mid = require('../../express-middleware');
var verification = require('../../email-verification');
var validate = require('../../validate');
var nav = require('../../user-nav');
var utils = require('../../utils');
var User = require('../../models/user');

var botproof = require('./botproof');
var signupMiddleware = require('./middleware');
var emailPath = path.resolve(__dirname, '../../../templates/emails');

/*
USER-NAV
========
*/
nav.add({
  name: 'Sign Up',
  url: '/signup',
  viewName: 'signup',
  visibleLoggedOut: true,
  visibleLoggedIn: false,
  icon: 'icon-asterisk',
  order: 20
});

/*
ROUTES
======
*/

exports = module.exports = function (app) {


// get signup from /signup or from / and handle accordingly
app.get(/^\/signup\/?$|^\/$/i, validate.receive, botproof.generators,
  function(req, res, next) {

  if (req.session.user) {
    return next(); // pass onward if a user is signed in
  }

  // render the page
  res.locals.recaptchaPublic = conf.validation.recaptchaPublic;
  res.render('views/signup');
});

// prevent from getting 404'd if a logged-in user hits /signup
app.get('/signup', mid.forceLogout);

app.post('/signup', mid.forceLogout, botproof.parsers,
  signupMiddleware.includeEmpties,
  signupMiddleware.validator, function(req, res, next) {

  var id = req.body.username;
  var first = req.body.firstName;
  var last = req.body.lastName;
  var email = req.body.primaryEmail;
  var pass = req.body.password;

  id = id.toLowerCase();

  var newUser = new User({
    username: id,
    firstName: first,
    lastName: last,
    displayName: first + ' ' + last,
    primaryEmail: email,
    emailList: [email],
    password: pass,
    locked: true,
  });
  var verificationOptions = {
    urlBase: 'signup',
    email: email,
    category: verification.categories.signup,
    subject: '[OpenMRS] Welcome to the OpenMRS Community',
    template: path.join(emailPath, 'welcome-verify-email.jade'),
    locals: {
      displayName: first + ' ' + last,
      username: id,
      userCredentials: {
        id: id,
        email: email
      }
    },
    timeout: 0
  };

  function sendVerificationEmail(callback) {
    log.debug('Sending signup email verification');
    verification.begin(verificationOptions, callback);
  }
  async.series([
    newUser.save.bind(newUser),
    sendVerificationEmail,
  ],
  function (err) {
    if (err) {
      return next(err);
    }
    req.flash('success', '<p>Thanks and welcome to the OpenMRS Community!</p>' +
    '<p>Before you can use your OpenMRS ID across our services, ' +
    'we need to verify your email address.</p>' +
    '<p>We\'ve sent an email to <strong>' + email +
    '</strong> with instructions to complete the signup process.</p>');

    res.redirect('/signup/verify', 303);
  });
});

// verification
app.get('/signup/:id', function(req, res, next) {
  var INVALID_MSG = 'The requested signup verification does not exist.';
  var findUsernameByVerifyID = function(callback) {
    verification.check(req.params.id, function (err, valid, locals) {
      if (err) {
        return callback(err);
      }
      if (!valid) {
        return callback({failMessage: INVALID_MSG});
      }
      return callback(null, locals.username);
    });
  };

  // clear locked and expiration flag
  var updateUser = function (user, callback) {
    user.locked = false;
    user.createdAt = undefined;
    user.addGroupsAndSave(conf.user.defaultGroups, callback);
  };

  async.waterfall([
    findUsernameByVerifyID,
    User.findByUsername.bind(User),
    updateUser,
  ],
  function (err, user) {
    if (err) {
      if (err.failMessage) {
        req.flash('error', err.failMessage);
        return res.redirect('/');
      }
      return next(err);
    }
    // we don't have to wait clear
    verification.clear(req.params.id);
    log.debug(user.username + ': account enabled');
    req.flash('success', 'Your account was successfully created. Welcome!');

    req.session.user = user;
    res.redirect('/');
  });
});

// AJAX, check whether or not user exists
app.get('/checkuser/*', function(req, res, next) {
  if (!req.xhr) {
    return res.redirect('/signup');
  }
  var username = req.params[0];
  var isValid = conf.ldap.user.usernameRegex.test(username);

  if (!isValid) {
    return res.end(JSON.stringify({illegal: true}));
  }

  User.findByUsername(username, function chkUser(err, user) {
    if (err) {
      return next(err);
    }
    if (user) {
      return res.end(JSON.stringify({ exists: true}));
    }
    return res.end(JSON.stringify({ exists: false}));
  });
});

};

