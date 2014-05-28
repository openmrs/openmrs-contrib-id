var connect = require('connect'),
  crypto = require('crypto'),
  mail = require('nodemailer'),
  fs = require('fs'),
  path = require('path'),
  ejs = require('ejs'),
  url = require('url'),
  Common = require(global.__commonModule),
  conf = Common.conf,
  db = Common.db,
  log = Common.logger.add('email-verification');

exports.active = {};
mail.SMTP = conf.email.smtp;


// create a verification and send emails
/* begin({
 *   urlBase      (required) e.g. 'reset' or 'signup'
 *   email,       (required) string of email address to send to
 *   subject,     (required) subject of email sent
 *   template,    (required) absolute path to template file
 *   associatedId (if exists) user this request belongs to
 *   locals,      extra local vars to pass to template renderer and to active
 *   timeout,     time before exiration, defaults to never
 * },callback)    receives errors
 */
exports.begin = function(settings, callback) {
  // parse arguments
  var urlBase = settings.urlBase,
    email = settings.email,
    subject = settings.subject,
    template = settings.template,
    associatedId = settings.associatedId || null,
    locals = settings.locals || {},
    timeout = settings.timeout || 172800000; // timeout of 48hr default

  if (!callback) var callback = function(err) {
    if (err) throw err;
  }

  //if (typeof email == 'string') email = [email];
  var expiring = (timeout > 0);

  // begin standard verification

  // verifyId build the URL in emails, actionId builds urls to cancel or resend verification
  var verifyId = crypto.randomBytes(8).toString('hex'),
    actionId = crypto.randomBytes(8).toString('hex'),
    expireDate = new Date(Date.now() + timeout);

  // create verification instance and store in DB
  var thisVerify = db.create('EmailVerification');
  thisVerify.verifyId = verifyId;
  thisVerify.actionId = actionId;
  thisVerify.urlBase = urlBase;
  thisVerify.email = email;
  thisVerify.associatedId = associatedId;
  thisVerify.settings = settings;
  if (locals) thisVerify.locals = locals;
  if (timeout) thisVerify.timeoutDate = expireDate;
  log.trace('verification prepared for DB entry');

  db.update(thisVerify, function(err) {
    if (err) return callback(err);
    log.trace('verification stored in DB');

    finishCreate();
  });

  fs.readFile(template, 'utf-8', function(err, data) {
    if (err) return callback(err);
    var template = data.toString();
    var rendered = ejs.render(template, {
      locals: connect.utils.merge(locals, {
        email: email,
        urlBase: urlBase,
        verifyId: verifyId,
        siteURL: conf.site.url,
        expiring: expiring,
        expireDate: expireDate.toLocaleString(),
        locals: locals,
        url: url,
      })
    });

    try {
      mail.send_mail({
        sender: "'OpenMRS ID Dashboard' <id-noreply@openmrs.org>",
        to: email,
        subject: subject,
        html: rendered
      }, function(e, success) {
        if (e) return callback(e);
        else {
          log.info(urlBase + ' email verification sent to ' + email + '.');

          finishCreate();
        }
      });
    } catch (ex) {
      return callback(ex);
    }
  });


  // callback once DB and email are done
  var finished = 0;
  var finishCreate = function() {
    finished++;
    if (finished == 2) callback();
  }
};

// re-send verification email associated with an actionId
// callback return error and the address sent to
exports.resend = function(actionId, callback) {
  // get the verification instance
  db.find('EmailVerification', {
    actionId: actionId
  }, function(err, instance) {
    if (err) return callback(err);

    // error if ID doesn't exist (anymore)
    if (instance.length == 0) return callback(new Error('Email verification could not be resent. The verification ID was not found.'));

    log.debug('got instance to resend');
    instance = instance[0]; // should only be one instance, anyway

    exports.clear(instance.verifyId, function(err) { // clear current verification
      if (err) return callback(err);
      log.debug('instance cleared, now resending');

      exports.begin(instance.settings, function(err) { // begin new verification with settings of the first one
        if (err) return callback(err);
        else callback(null, instance.settings.email);
      });
    });

  });
};

// gets a verification instance by actionId
exports.getByActionId = function(id, callback) {
  // get from DB
  db.find('EmailVerification', {
    actionId: id
  }, function(err, instance) {
    if (err) return callback(err);

    // error if ID doesn't exist (anymore)
    if (instance.length == 0) return callback(new Error('Email verification could not be cancelled. The verification ID was not found.'));

    callback(null, instance[0]);
  });
};

// verifies a validation request, callback returns error, boolean on whether request is valid, and any locals
exports.check = function(credential, callback) {
  // determine whether credential is email, username, or verifyId

  db.find('EmailVerification', {
    verifyId: credential
  }, function(err, instance) {
    if (err) callback(err);

    var invalidate = function() { // clear and return request as invalid
      log.debug('invalid validation requested');
      //exports.clear(verifyId);
      callback(null, false);
    }

    var verify = instance[0];
    if (verify) {
      var locals = verify.locals || {};

      if (verify.timeoutDate == null || verify.timeoutDate > Date.now()) { // still valid; has not expired
        log.debug('successful validation request');
        callback(null, true, locals);
      } else invalidate();
    } else invalidate();
  });
};

// drops a validation (called on completion)
exports.clear = function(verifyId, callback) {
  if (typeof callback != 'function') var callback = function(err) {
    if (err) log.error(err);
  }

  db.find('EmailVerification', {
    verifyId: verifyId
  }, function(err, instance) {
    if (err) return callback(err);

    if (instance[0]) {
      var toDrop = instance.length,
        dropped = 0,
        errored = false;
      var finish = function(err) {
        log.debug('clear() of instance returned');
        if (err & !errored) {
          return callback(err);
          errored = true;
        }

        dropped++;
        if (dropped == toDrop) callback();
      }

      instance.forEach(function(inst) {
        db.drop(inst, function(err) {
          if (err) return finish(err);
          finish();
        });
      });
    } else return callback(new Error('No instance found to destroy.'));
  });
}

// returns any instances matching search paramaters
// credential can be email address or username
exports.search = function(credential, type, callback) {
  // determine whether credential is email, username, or verifyId
  if (conf.user.usernameRegex.test(credential)) var terms = {
    associatedId: credential
  }; // is a user id
  else if (conf.email.validation.emailRegex.test(credential)) var terms = {
    email: credential
  }; // is an email address
  else return callback(null, []); // return no matches

  // search DB and callback any instances found
  db.find('EmailVerification', terms, function(err, instances) {
    if (instances.constructor != Array) instances = [instances];
    callback(null, instances);
  });
};
