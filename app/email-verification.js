'use strict';
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var fs = require('fs');
var path = require('path');
var jade = require('jade');
var url = require('url');
var async = require('async');
var _ = require('lodash');
var uuid = require('node-uuid');
var utils = require('./utils');

var conf = require('./conf');
var log = require('log4js').addLogger('email-verification');

var EmailVerification = require('./models/email-verification');

// update nodemailer
var transporter = nodemailer.createTransport(conf.email.smtp);

var simpleCallback = function (err) {
  if (err) {
    log.error(err);
  }
};

// create a verification and send emails
/* begin({
 *   addr,          (required) string of email address to send to
 *   subject,       (required) subject of email sent
 *   templatePath,  (required) absolute path to template file
 *   category,      category of this verification
 *   username,      username related to this request
 *   callback,      callback url
 *   locals,        extra locals for rendering or other additional infos
 * },callback)      receives errors
 */
exports.begin = function(settings, callback) {
  // parse arguments
  var addr = settings.addr;
  var subject = settings.subject;
  var templatePath = settings.templatePath;
  var category = settings.category || '';
  var username = settings.username || '';
  var description = settings.description || '';
  var callbackPath = settings.callback || null;
  var locals = settings.locals || {};

  if (!callback) {// if callback is not provided
    callback = simpleCallback;
  }

  // create verification instance and store in DB
  function storeInfo(cb) {
    var veriInfo = {
      uuid: uuid.v4(),
      addr: addr,
      category: category,
      username: username,
      description: description,
      settings: settings,
      locals: locals,
    };
    var verification = new EmailVerification(veriInfo);
    log.trace('verification prepared for DB entry');

    verification.save(function (err) {
      if (err) {
        return cb(err);
      }
      log.trace('verification stored in DB');
      return cb(null, veriInfo.uuid);
    });
  }

  function sendMail(uuid, cb) {
    uuid = utils.urlEncode64(uuid);
    _.merge(locals, {
      addr: addr,
      siteURL: conf.site.url,
      imgURL: url.resolve(conf.site.url, '/resource/images/logo.png'),
      verifyURL: url.resolve(conf.site.url, path.join(callbackPath, uuid)),
    });
    var rendered = jade.renderFile(templatePath, locals);

    try {
      transporter.sendMail({
        from: "'OpenMRS ID Dashboard' <id-noreply@openmrs.org>",
        to: addr,
        subject: subject,
        html: rendered
      }, function(e, success) {
        if (e) {
          return cb(e);
        }
        log.info('[' + category + ']: email verification sent to ' + addr);
        return cb();
      });
    } catch (ex) {
      return cb(ex);
    }
  }

  async.waterfall([
    storeInfo,
    sendMail,
  ], callback);
};

// re-send verification email
// callback return error and the address sent to
exports.resend = function(uuid, callback) {
  // get the verification instance
  EmailVerification.findOne({uuid: uuid}, function (err, verification) {
    if (err) {
      return callback(err);
    }
    if (_.isEmpty(verification)) {
      var msg = 'Email verification record is not found, maybe expired';
      log.error(msg);
      return callback(new Error(msg));
    }
    log.debug('got instance to resend');

    // begin new verification with settings of the first one
    exports.begin(verification.settings, callback);
  });
};

// verifies a validation request, callback returns error,
// boolean on whether request is valid, and any locals
exports.check = function(uuid, callback) {
  if (!_.isFunction(callback)) {
    throw new Error('callback must be a function');
  }

  EmailVerification.findOne({uuid: uuid}, function (err, verification) {
    if (err) {
      return callback(err);
    }
    if (_.isEmpty(verification)) {
      log.debug('verification record not found');
      return callback(null, false);
    }

    var locals = verification.locals || {};
    callback(null, true, locals);
  });
};

// drops a verification (called on completion)
exports.clear = function(uuid, callback) {
  if (!callback) {
    callback = simpleCallback;
  }
  EmailVerification.findOneAndRemove({uuid: uuid}, callback);
};

// helper functions to search for a verification,
// based on username or email address
exports.search = function(credential, category, callback) {
  // determine whether credential is email, username, or verifyId
  var terms;
  if (conf.user.usernameRegex.test(credential)) {
    terms = {
      username: credential
    }; // is a user id
  } else if (conf.email.validation.emailRegex.test(credential)) {
    terms = {
      addr: credential // is an email address
    };
  } else {
    return callback(new Error('invalid credential')); // return no matches
  }
  terms.category = category;
  EmailVerification.find(terms, callback);
};
