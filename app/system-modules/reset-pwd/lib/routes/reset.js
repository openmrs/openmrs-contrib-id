/**
 * This file handles the password-reset functionalities
 */

var path = require('path');

var settings = require('../settings');

var Common = require(global.__commonModule);
var app = Common.app;
var conf = Common.conf;
var mid = Common.mid;
var validate = Common.validate;
var verification = Common.verification;
var ldap = Common.ldap;
var log = Common.logger.add('express');

app.get('/reset', mid.forceLogout, function(req, res, next) {
  res.render(path.join(settings.viewPath, 'reset-public'));
});

app.post('/reset', mid.forceLogout, function(req, res, next) {
  var resetCredential = req.body.resetCredential;

  var gotUser = function(e, obj) {

    if (e) {
      if (e.message === 'User data not found') {
        log.info('reset requested for nonexistent user "' +
          resetCredential + '"');
        return finish();
      } else {
        return next(e);
      }
    }

    var username = obj[conf.ldap.user.username],
      email = obj[conf.ldap.user.email],
      secondaryMail = obj[conf.ldap.user.secondaryemail] || [];
    // array of both pri. and sec. addresses to send to
    var emails = secondaryMail.concat(email);

    // send the verifications
    var errored = false;
    var calls = 0;
    var verificationCallback = function(err) {
      calls++;
      if (err && !errored) {
        errored = true;
        return next(err);
      }
      if (calls === emails.length && !errored) {
        finish();
      }
    };

    emails.forEach(function(address) {
      verification.begin({
        urlBase: 'reset',
        email: address,
        subject: '[OpenMRS] Password Reset for ' + username,
        template: path.join(settings.viewPath, 'email/password-reset.ejs'),
        locals: {
          username: username,
          displayName: obj[conf.ldap.user.displayname],
          allEmails: emails
        },
        timeout: conf.ldap.user.passwordResetTimeout
      }, verificationCallback);
    });
  };

  var finish = function() {
    req.flash('info', 'If the specified account exists,' +
      ' an email has been sent to your address(es) ' +
      'with further instructions to reset your password.');
    return res.redirect('/');
  };

  // Begin here.
  if (resetCredential.indexOf('@') < 0) {
    ldap.getUser(resetCredential, function(e, obj) {
      gotUser(e, obj);
    });
  } else if (resetCredential.indexOf('@') > -1) {
    ldap.getUserByEmail(resetCredential, function(e, obj) {
      gotUser(e, obj);
    });
  }

});

app.get('/reset/:id', validate.receive(), function(req, res, next) {
  var resetId = req.params.id;
  verification.check(resetId, function(err, valid, locals) {
    if (err) {
      return next(err);
    }
    if (valid) {
      res.render(path.join(settings.viewPath, 'reset-private'), {
        username: locals.username
      });
    } else {
      req.flash('error',
        'The requested password reset has expired or does not exist.');
      res.redirect('/');
    }
  });
});

app.post('/reset/:id', validate(), function(req, res, next) {
  verification.check(req.params.id, function(err, valid, locals) {
    if (err) {
      return next(err);
    }
    if (valid) {
      ldap.resetPassword(locals.username, req.body.newpassword, function(e) {
        if (e) {
          return next(e);
        }
        log.info('password reset for "' + locals.username + '"');
        verification.clear(req.params.id); // remove validation from DB
        req.flash('success', 'Password has been reset successfully. ' +
          'You may now log in across the OpenMRS Community.');
        res.redirect('/');
      });
    } else {
      req.flash('error',
        'The requested password reset has expired or does not exist.');
      res.redirect('/');
    }
  });
});
