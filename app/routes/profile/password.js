'use strict';
/**
 * This file handles users' password related request.
 */
const path = require('path');
const async = require('async');
const _ = require('lodash');

const common = require('../../common');
const conf = require('../../conf');
const verification = require('../../email-verification');
const validate = require('../../validate');
const log = require('log4js').addLogger('express');
const mid = require('../../express-middleware');
const User = require('../../models/user');



exports = module.exports = app => {


  // AJAX
  app.post('/password', mid.forceLogin,
    (req, res, next) => {

      if (!req.xhr) {
        return next();
      }


      const updUser = req.session.user;

      // Look up the user's canonical record to read the password. (it's not stored
      // on req.session.user for security purposes.)
      const findUser = callback => {
        User.findByUsername(updUser.username, (err, user) => {
          if (err) {
            return callback(err);
          }
          if (_.isEmpty(user)) {
            return callback(new Error(`User not found for ${updUser.username}`));
          }
          return callback(null, user);
        });
      };

      const validation = (user, callback) => {
        const passhash = user.password;
        const currentpassword = req.body.currentpassword;
        const newpassword = req.body.newpassword;
        const confirmpassword = req.body.confirmpassword;
        const validators = {
          currentpassword: validate.chkPassword.bind(null, currentpassword, passhash),
          newpassword: validate.chkLength.bind(null, newpassword, 8),
          confirmpassword: validate.chkDiff.bind(null, newpassword, confirmpassword),
        };

        validate.perform(validators, (err, validateError) => {
          if (!_.isEmpty(validateError)) {
            return res.json({
              fail: validateError
            });
          }
          return callback(null, user);
        });

      };


      const changePassword = (user, callback) => {
        user.password = req.body.newpassword;
        user.save(callback);
      };

      async.waterfall([
          findUser,
          validation,
          changePassword,
        ],
        (err, user) => {
          log.trace('password change no errors');
          log.info(`${updUser.username}: password updated`);
          req.flash('success', 'Password updated successfully');
          req.session.user = user;
          return res.json({
            success: true
          });
        });
    });


};