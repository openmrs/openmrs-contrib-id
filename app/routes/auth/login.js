'use strict';
/**
 * This is the login logic for Dashboard
 */
const url = require('url');
const path = require('path');
const async = require('async');
const _ = require('lodash');


const common = require('../../common');
const conf = require('../../conf');
const verification = require('../../email-verification');
const validate = require('../../validate');
const mid = require('../../express-middleware');
const utils = require('../../utils');

const log = require('log4js').addLogger('express');

const User = require('../../models/user');

exports = module.exports = app => {


  app.get('/login', mid.forceLogout,
    (req, res, next) => {
      res.render('views/login');
    }
  );

  app.post('/login', mid.stripNewlines, (req, res, next) => {
    const username = req.body.loginusername || '';
    const password = req.body.loginpassword || '';
    const redirect = req.body.destination || '/';

    const checkInput = callback => {
      if (utils.isUsernameValid(username)) {
        return callback(null, {
          username: username
        });
      }
      if (utils.isEmailValid(username)) {
        return callback(null, {
          loginFail: 'Please use a valid username to sign in. Emails are not acceptable'
        });
      }
      const invalid = 'Please use a valid username to sign in';
      return callback({
        loginFail: invalid
      });
    };

    const findUser = (input, callback) => {
      const commonCallback = (err, user) => {
        if (err) {
          return callback(err);
        }
        if (_.isEmpty(user)) {
          return callback({
            loginFail: 'This user does not exist'
          });
        }
        return callback(null, user);
      };
      if (input.username) {
        return User.findByUsername(input.username, commonCallback);
      }
      // should never got here
      return callback(new Error('Weird control flow'));
    };

    const checkLocked = (user, callback) => {
      if (user.locked) {
        return callback({
          loginFail: 'You must verify your email address before logging in. ' +
            'Check your email for verification instructions.'
        });
      }
      return callback(null, user);
    };

    const checkPassword = (user, callback) => {
      if (_.isEmpty(user.password)) {
        return callback({
          loginFail: 'Your password should be reset first'
        });
      }
      if (!utils.checkSSHA(password, user.password)) {
        return callback({
          loginFail: 'Wrong password'
        });
      }
      return callback(null, user);
    };

    async.waterfall([
        checkInput,
        findUser,
        checkLocked,
        checkPassword,
      ],
      (err, user) => {
        if (err) {
          if (_.isEmpty(err.loginFail)) {
            log.debug('login error');
            return next(err);
          }
          log.info(`authentication failed for "${username}" (${err.loginFail})`);
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
            const dest = url.resolve(conf.site.url, `/login?destination=${encodeURIComponent(req.body.destination)}`);

            return res.redirect(dest);
          }
          // redirect to generic login page
          return res.redirect(url.resolve(conf.site.url, '/login'));
        }

        // no error
        log.info(`${username}: authenticated`);
        req.session.user = user;
        log.debug(`user ${username} stored in session`);

        res.redirect(url.resolve(conf.site.url, decodeURIComponent(redirect)));
      });
  });


};