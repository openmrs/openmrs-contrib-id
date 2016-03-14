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
var emailPath = path.resolve(__dirname, '../../../templates/emails');

/*
ROUTES
======
*/

exports = module.exports = function (app) {


// get signup from /signup or from / and handle accordingly
app.get(/^\/signup\/?$|^\/$/i, botproof.generators,
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

app.post('/signup', function (req, res, next) {
  console.log(JSON.stringify(req.session));
  console.log(JSON.stringify(req.body));
  return next();
});

app.post('/signup', mid.forceLogout, botproof.parsers,
  function(req, res, next) {

  if (!req.xhr) {
    return res.redirect('/');
  }
  var id = req.body.username;
  var first = req.body.firstName;
  var last = req.body.lastName;
  var email = req.body.primaryEmail;
  var pass = req.body.password;
  var captchaData = {
    response: req.body['g-recaptcha-response'],
  };

  // only lowercase
  id = id.toLowerCase();

  // perform validation
  var validation = function (callback) {
    var validators = {
      username: validate.chkUsernameInvalidOrDup.bind(null, id),
      primaryEmail: validate.chkEmailInvalidOrDup.bind(null, email),
      firstName: validate.chkEmpty.bind(null, first),
      lastName: validate.chkEmpty.bind(null, last),
      password: validate.chkLength.bind(null, pass, 8),
      recaptcha_response_field: validate.chkRecaptcha.bind(null, captchaData),
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

  var saveUser = function (callback) {
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
    newUser.save(callback);
  };

  var sendVerificationEmail = function (callback) {
    var verificationOptions = {
      addr: email,
      subject: '[OpenMRS] Welcome to the OpenMRS Community',
      templatePath: path.join(emailPath, 'welcome-verify.jade'),
      username: id,
      category: 'signup',
      callback: '/signup',
      locals: {
        displayName: first + ' ' + last,
        username: id,
      },
      timeout: 0
    };
    log.debug('Sending signup email verification');
    verification.begin(verificationOptions, callback);
  };

  async.series([
    validation,
    saveUser,
    sendVerificationEmail,
  ],
  function (err) {
    if (err) {
      return next(err);
    }
    res.json({success: true});
  });
});

app.get('/signup/verify', function (req, res) {
  res.render('views/signedup');
});

// verification
app.get('/signup/:id', function(req, res, next) {
  var id = utils.urlDecode64(req.params.id);
  var INVALID_MSG = 'The requested signup verification does not exist, ' +
                    'it might be expired.';

  var findUsernameByVerifyID = function(callback) {
    verification.check(id, function (err, valid, locals) {
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
    verification.clear(id);
    log.debug(user.username + ': account enabled');
    req.flash('success', 'Your account was successfully created. Welcome!');

    req.session.user = user;
    res.redirect('/');
  });
});

// AJAX, check whether or not user exists
app.get('/checkuser/:id', function (req, res) {
  if (!req.xhr) {
    return res.redirect('/');
  }
  var username = req.params.id;
  var isValid = conf.ldap.user.usernameRegex.test(username);

  if (!isValid) {
    return res.json({illegal: true});
  }

  User.findByUsername(username, function chkUser(err, user) {
    if (err) {
      log.error('error in checkuser');
      log.error(err);
      return;
    }
    if (user) {
      return res.json({ exists: true});
    }
    return res.json({ exists: false});
  });
});

app.get('/checkemail/:email', function (req, res) {
  if (!req.xhr) {
    return res.redirect('/');
  }
  validate.chkEmailInvalidOrDup(req.params.email, function (err, errState) {
    if (err) {
      log.error('error in checkemail');
      log.error(err);
      return;
    }
    if (true === errState) {
      return res.json({illegal: true});
    }
    if (errState) {
      return res.json({exists: true});
    }
    return res.json({exists: false});
  });
});


};
