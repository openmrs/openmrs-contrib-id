'use strict';
/**
 * This file handles the password-reset functionalities
 */

const path = require('path');
const async = require('async');
const _ = require('lodash');

const conf = require('../../conf');
const mid = require('../../express-middleware');
const validate = require('../../validate');
const verification = require('../../email-verification');
const utils = require('../../utils');
const log = require('log4js').addLogger('express');

const User = require('../../models/user');

exports = module.exports = app => {


  app.get('/reset', mid.forceLogout, (req, res, next) => {
    res.render('views/reset-public');
  });

  app.post('/reset', mid.forceLogout, (req, res, next) => {
    // case-insensitive
    const resetCredential = req.body.resetCredential.toLowerCase();
    const USER_NOT_FOUND_MSG = 'User data not found';
    const REQUIRED = 'Username or e-mail address is required to continue.';

    const filter = {};
    if (resetCredential.indexOf('@') < 0) {
      filter.username = resetCredential;
    } else {
      filter.emailList = resetCredential;
    }

    const checkInput = callback => {
      if (resetCredential === '') {
        req.flash('error', REQUIRED);
        return res.redirect('/reset');
      } else {
        callback();
      }
    };

    const findUser = callback => {
      User.findByFilter(filter, (err, user) => {
        if (err) {
          return callback(err);
        }
        if (_.isEmpty(user)) {
          log.info(`reset requested for nonexistent user "${resetCredential}"`);
          return callback(new Error(USER_NOT_FOUND_MSG));
        }
        callback(null, user);
      });
    };

    const sendEmails = (user, callback) => {
      const username = user.username;
      const emails = user.emailList;

      const emailPath = path.join(__dirname, '../../../templates/emails');
      const sendEmail = (address, cb) => {
        verification.begin({
          addr: address,
          username: username,
          category: 'new password',
          callback: '/reset',
          subject: `[OpenMRS] Password Reset for ${username}`,
          templatePath: path.join(emailPath, 'password-reset.pug'),
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
      err => {
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
    (req, res, next) => {

      const id = utils.urlDecode64(req.params.id);
      verification.check(id, (err, valid, locals) => {
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
    (req, res, next) => {


      const id = utils.urlDecode64(req.params.id);
      const npass = req.body.newPassword;
      const cpass = req.body.confirmPassword;


      const validation = callback => {
        const validators = {
          newPassword: validate.chkLength.bind(null, npass, 8),
          confirmPassword: validate.chkDiff.bind(null, npass, cpass),
        };

        validate.perform(validators, (err, failures) => {
          if (err) {
            return callback(err);
          }
          if (_.isEmpty(failures)) {
            return callback();
          }
          res.json({
            fail: failures
          });
        });
      };

      const chkVerification = callback => {
        verification.check(id, (err, valid, locals) => {
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

      const update = (username, callback) => {
        User.findByUsername(username, (err, user) => {
          if (err) {
            return next(err);
          }
          user.password = npass;

          user.save(err => {
            if (err) {
              log.error('password reset failed');
              return next(err);
            }
            log.info(`password reset for "${username}"`);
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