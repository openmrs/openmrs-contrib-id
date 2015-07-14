/**
 * This is the login logic for Dashboard
 */
var url = require('url');
var path = require('path');
var async = require('async');
var _ = require('lodash');


var common = require('../../common');
var conf = require('../../conf');
var verification = require('../../email-verification');
var validate = require('../../validate');
var mid = require('../../express-middleware');
var utils = require('../../utils');

var log = require('log4js').getLogger('express');

var User = require('../../model/user');

exports = module.exports = function (app) {


app.get('/login', mid.forceLogout, validate.receive,
  function(req, res, next) {
    res.render('views/login');
  }
);

app.post('/login', mid.stripNewlines, function(req, res, next) {
  var username = req.body.loginusername;
  var password = req.body.loginpassword;
  var REQUIRED = 'Username and password are required to continue';
  var redirect = req.body.destination || '/';
  var checkInput = function (callback) {
    if(username === '' || password === '') {
        req.flash('error',REQUIRED);
        return res.redirect('/login');
    } else {
      callback();
    }
  };
  var findUser = function (callback) {
    User.findByUsername(username, function (err, user) {
      if (err) {
        return callback(err);
      }
      if (_.isEmpty(user)) {
        return callback({loginFail: 'This user does not exist'});
      }
      return callback(null, user);
    });
  };
  var checkLocked = function (user, callback) {
    if (user.locked) {
      return callback({loginFail: 'You must verify your email address before logging in. ' +
        'Check your email for verification instructions.'});
    }
    return callback(null, user);
  };
  var checkPassword = function (user, callback) {
    if (_.isEmpty(user.password)) {
      return callback({loginFail: 'Your password should be reset first'});
    }
    if (!utils.checkSSHA(password, user.password)) {
      return callback({loginFail: 'Wrong password'});
    }
    return callback(null, user);
  };
  async.waterfall([
    checkInput,
    findUser,
    checkLocked,
    checkPassword,
  ],
  function (err, user) {
    if (err) {
      if (_.isEmpty(err.loginFail)) {
        log.debug('login error');
        return next(err);
      }
      log.info('authentication failed for "' + username +
        '" (' + err.loginFail + ')');
      req.flash('error', err.loginFail);

      _.merge(res.locals, {
        fail: {
          loginusername: false,
          loginpassword: true
        },
        values: {
          loginusername: username,
          loginpassword: password
        }
      });
      if (req.body.destination) { // redirect to the destination login page
        var dest = url.resolve(conf.site.url, '/login?destination=' +
          encodeURIComponent(req.body.destination));

        return res.redirect(dest);
      }
      // redirect to generic login page
      return res.redirect(url.resolve(conf.site.url, '/login'));
    }

    // no error
    log.info(username + ': authenticated');
    req.session.user = user;
    log.debug('user ' + username + ' stored in session');

    res.redirect(url.resolve(conf.site.url, decodeURIComponent(redirect)));
  });
});


};