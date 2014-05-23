/**
 * The contents of this file are subject to the OpenMRS Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */
var express = require('express');
// var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
// var connect = require('connect');
var mail = require('nodemailer');
// var https = require('https');
// var crypto = require('crypto');
var app = express.createServer();

// establish module & global variables
module.exports = app;
global.__apppath = __dirname;

// fail if no configuration file found
try {
  fs.readFileSync(__dirname + '/conf.js');
} catch (e) {
  console.log('ERROR: Configuration file not found at (' +
    __dirname + '/conf.js)! Exiting…');
  return;
}


var Common = require('./openmrsid-common');
var conf = Common.conf;
var ldap = Common.ldap;
// var db = Common.db;
var mid = Common.mid;
// var renderHelpers = Common.renderHelpers;
var log = Common.logger.add('express');
var validate = Common.validate;
// var environment = Common.environment;
var verification = Common.verification;

mail.SMTP = conf.email.smtp;

/* Load Modules */
conf.systemModules.forEach(function(module) {
  require('./system-modules/' + module);
});
conf.userModules.forEach(function(module) {
  require('./user-modules/' + module);
});


/*
ROUTES
======
*/
require('./routes');


// PASSWORD RESETS

app.get('/reset', mid.forceLogout, function(req, res, next) {
  res.render('reset-public');
});

app.post('/reset', mid.forceLogout, function(req, res, next) {
  var resetCredential = req.body.resetCredential,
    username = '',
    email = '';

  var gotUser = function(e, obj) {

    if (e) {
      if (e.message == 'User data not found') {
        log.info('reset requested for nonexistent user "' + resetCredential + '"');
        return finish();
      } else {
        return next(e);
      }
    }

    var username = obj[conf.ldap.user.username],
      email = obj[conf.ldap.user.email],
      secondaryMail = obj[conf.ldap.user.secondaryemail] || [];

    var emails = secondaryMail.concat(email); // array of both pri. and sec. addresses to send to

    // send the verifications
    var errored = false,
      calls = 0;
    var verificationCallback = function(err) {
      calls++;
      if (err && !errored) {
        errored = true;
        return next(err);
      }
      if (calls === emails.length && !errored) finish();
    };

    emails.forEach(function(address) {
      verification.begin({
        urlBase: 'reset',
        email: address,
        subject: '[OpenMRS] Password Reset for ' + username,
        template: '../views/email/password-reset.ejs',
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
    req.flash('info', 'If the specified account exists, an email has been sent to your address(es) with further instructions to reset your password.');
    return res.redirect('/');
  }

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
    if (err) return next(err);
    if (valid) {
      res.render('reset-private', {
        username: locals.username
      });
    } else {
      req.flash('error', 'The requested password reset has expired or does not exist.');
      res.redirect('/');
    }
  });
});

app.post('/reset/:id', validate(), function(req, res, next) {
  verification.check(req.params.id, function(err, valid, locals) {
    if (err) return next(err);
    if (valid) {
      ldap.resetPassword(locals.username, req.body.newpassword, function(e) {
        if (e) return next(e);
        log.info('password reset for "' + locals.username + '"');
        verification.clear(req.params.id); // remove validation from DB
        req.flash('success', 'Password has been reset successfully. You may now log in across the OpenMRS Community.');
        res.redirect('/');
      });
    } else {
      req.flash('error', 'The requested password reset has expired or does not exist.');
      res.redirect('/');
    }
  });
});



// RESOURCES

app.get('/resource/*', function(req, res, next) {
  var resourcePath = path.join(__dirname, '/../resource/', req.params[0]);
  res.sendfile(resourcePath);
});

// Legacy Redirects
app.get('/edit/profile?', function(req, res) {
  res.redirect('/profile')
});
app.get('/edit/password', function(req, res) {
  res.redirect('/password')
});

// 404's
app.use(function(req, res, next) {
  if (req.header('Accept') && req.header('Accept').indexOf('text/html') > -1) {
    // send an HTML error page
    res.statusCode = 404;
    res.render('404');
  } else {
    res.statusCode = 404;
    res.end('The requested resource was not found.');
  }
});


// Errors
app.error(function(err, req, res, next) {
  log.error('Caught error: ' + err.name);
  if (!res.headerSent) {
    // ONLY try to send an error response if the response is still being
    // formed. Otherwise, we'd be stuck in an infinite loop.
    res.statusCode = err.statusCode || 500;
    if (req.accepts('text/html')) {
      res.render('error', {
        e: err
      });
    } else if (req.accepts('application/json')) {
      res.json({
        statusCode: res.statusCode,
        error: err
      }, {
        'Content-Type': 'application/json'
      });
    } else {
      res.send("Error: " + err.message + "\n\n" + err.stack, {
        'Content-Type': 'text/plain'
      });
    }
  } else {
    // Silently fail and write to log
    log.warn('^^ Headers sent before error encountered');
  }


});

process.on('uncaughtException', function(err) {
  console.log(err);
});


/* App startup: */
app.listen(3000);
log.info('Express started on port ' + app.address().port);
