var crypto = require('crypto');
var mail = require('nodemailer');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var url = require('url');
var async = require('async');
var _ = require('lodash');

var conf = require('./conf');
var log = require('./logger').add('email-verification');

var emailPath = path.join(global.__apppath,'model/email-verification');

var EmailVerification = require(emailPath);

mail.SMTP = conf.email.smtp;

var simpleCallback = function (err) {
  if (err) {
    log.error(err);
    throw(err);
  }
};

exports.categories = EmailVerification.categories;
// create a verification and send emails
/* begin({
 *   urlBase      (required) e.g. 'reset' or 'signup'
 *   email,       (required) string of email address to send to
 *   subject,     (required) subject of email sent
 *   template,    (required) absolute path to template file
 *   associatedId (if exists) user this request belongs to
 *   locals,      extra local vars to pass to template renderer and to active
 *   timeout,     time before exiration, defaults to never
 *   category,    verification category, one of EmailVerificaion.categories
 * },callback)    receives errors
 */
exports.begin = function(settings, callback) {
  // parse arguments
  var urlBase = settings.urlBase;
  var email = settings.email;
  var subject = settings.subject;
  var template = settings.template;
  var associatedId = settings.associatedId || null;
  var locals = settings.locals || {};
  var timeout = settings.timeout || 172800000; // timeout of 48hr default
  var category = settings.category;

  if (!callback) {// if callback is not provided
    callback = simpleCallback;
  }

  // begin standard verification

  // verifyId build the URL in emails, actionId builds urls to cancel or resend verification
  var verifyId = crypto.randomBytes(8).toString('hex');
  var actionId = crypto.randomBytes(8).toString('hex');
  var expireDate = new Date(Date.now() + timeout);

  // create verification instance and store in DB
  function storeInfo(cb) {
    var veriInfo = {
      verifyId: verifyId,
      actionId: actionId,
      email: email,
      category: category,
      associatedId: associatedId,
      settings: settings,
      locals: locals,
      timeoutDate: expireDate,
    };
    var verification = new EmailVerification(veriInfo);
    log.trace('verification prepared for DB entry');

    verification.save(function (err) {
      if (err) {
        return cb(err);
      }
      log.trace('verification stored in DB');
      return cb();
    });
  }

  function sendMail(cb) {
    fs.readFile(template, 'utf-8', function render(err, data) {
      if (err) {
        return cb(err);
      }

      _.merge(locals, {
        email: email,
        urlBase: urlBase,
        verifyId: verifyId,
        siteURL: conf.site.url,
        expireDate: expireDate.toLocaleString(),
        url: url,
      });
      var template = data.toString();
      var rendered = ejs.render(template, {locals: locals});

      try {
        mail.send_mail({
          sender: "OpenMRS ID Dashboard <id-noreply@openmrs.org>",
          to: email,
          subject: subject,
          html: rendered
        }, function(e, success) {
          if (e) {
            return cb(e);
          }
          log.info(urlBase + ' email verification sent to ' + email + '.');
          return cb();
        });
      } catch (ex) {
        return cb(ex);
      }
    });
  }

  async.series([
    storeInfo,
    sendMail,
  ],
  function (err) {
    if (err) {
      return callback(err);
    }
    return callback();
  });
};

// re-send verification email associated with an actionId
// callback return error and the address sent to
exports.resend = function(actionId, callback) {
  // get the verification instance
  EmailVerification.findOne({actionId: actionId}, function (err, verification) {
    if (err) {
      return callback(err);
    }
    if (_.isEmpty(verification)) {
      // error if ID doesn't exist (anymore)
      return callback(new Error('Email verification could not be resent.' +
        ' The verification ID was not found.'));
    }
    log.debug('got instance to resend');

    // clear current verification
    verification.remove(function(err) {
      if (err) {
        return callback(err);
      }
      log.debug('verification cleared, now resending');

      // begin new verification with settings of the first one
      exports.begin(verification.settings, function(err) {
        if (err) {
          return callback(err);
        }
        return callback(null, verification.settings.email);
      });
    });
  });
};

// gets a verification instance by actionId
exports.getByActionId = function(actionId, callback) {
  // get from DB
  if (!_.isFunction(callback)) {
    throw new Error('callback must be a function');
  }
  EmailVerification.findOne({actionId: actionId}, function (err, verification) {
    if (err) {
      return callback(err);
    }
    if (_.isEmpty(verification)) {
      return callback(new Error('None was found'));
    }
    callback(null, verification);
  });
};

// verifies a validation request, callback returns error,
// boolean on whether request is valid, and any locals
exports.check = function(verifyId, callback) {
  if (!_.isFunction(callback)) {
    throw new Error('callback must be a function');
  }
  EmailVerification.findOne({verifyId: verifyId}, function (err, verification) {
    if (err) {
      return callback(err);
    }
    var invalidate = function() { // clear and return request as invalid
      log.debug('invalid validation requested');
      // exports.clear(verifyId);
      callback(null, false);
    };
    if (_.isEmpty(verification)) {
      return invalidate();
    }
    var valid = verification.timeoutDate === null ||
      verification.timeoutDate > Date.now();

    if (!valid) { // still valid; has not expired
      return invalidate();
    }
    log.debug('successful validation request');
    var locals = verification.locals || {};
    callback(null, true, locals);
  });
};

// drops a validation (called on completion)
exports.clear = function(verifyId, callback) {
  if (!callback) {
    callback = simpleCallback;
  }
  EmailVerification.remove({verifyId: verifyId}, function (err) {
    if (err) {
      return callback(err);
    }
    log.debug('successfully removed');
    return callback();
  });
};

// returns any instances matching search paramaters
// credential can be email address or username
exports.search = function(credential, category, callback) {
  // determine whether credential is email, username, or verifyId
  var terms;
  if (conf.user.usernameRegex.test(credential)) {
    terms = {
      associatedId: credential
    }; // is a user id
  } else if (conf.email.validation.emailRegex.test(credential)) {
    terms = {
      email: credential // is an email address
    };
  } else {
    return callback(new Error('invalid credential')); // return no matches
  }
  terms.category = category;
  // search DB and callback any instances found
  EmailVerification.find(terms, function (err, instances) {
    if (err) {
      return callback(err);
    }
    return callback(null, instances);
  });
};
