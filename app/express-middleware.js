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
var crypto = require('crypto'),
  Recaptcha = require('recaptcha').Recaptcha,
  connect = require('connect'),
  url = require('url'),
  Common = require(global.__commonModule),
  app = Common.app,
  log = Common.logger.add('middleware'),
  conf = Common.conf;


function setTypes(req, res) {
  // Change undefined variables to default values; keep us from getting "undefined" errors from EJS
  var current = res.locals() || {};
  var replace = {};

  replace.title = (current.title) ? current.title : conf.site.title;
  replace.failed = (current.failed) ? current.failed : false;
  replace.showHeadlineAvatar = (current.showHeadlineAvatar) ? current.showHeadlineAvatar : true;
  replace.showSidebar = (current.showSidebar) ? current.showSidebar : true;

  ['sidebar'].forEach(function(prop) {
    replace[prop] = (current[prop]) ? current[prop] : [];
  });
  ['bodyAppend', 'headAppend', 'headline', 'viewName', 'emailUpdated'].forEach(function(prop) {
    replace[prop] = (current[prop]) ? current[prop] : '';
  });
  ['flash', 'fail', 'values', 'failReason', 'navLinks', 'progress', 'sidebarParams', 'validation'].forEach(function(prop) {
    replace[prop] = (current[prop]) ? current[prop] : {};
  });
  res.locals(replace);
}

exports.openmrsHelper = function(req, res, next) {
  if (req.originalUrl === '/favicon.ico') {
    return next();
  }

  if (req.session && req.session.user) {
    var user = req.session.user;
    var mailHash = crypto.createHash('md5')
      .update(user.primaryEmail).digest('hex');

    res.locals({
      connected: true,
      user: req.session.user,
      mailHash: mailHash
    });
  } else {
    res.locals({
      connected: false
    });
  }
  setTypes(req, res);
  next();
};


exports.restrictTo = function(role) {
  return function(req, res, next) {
    var fail = function() {
      req.flash('error', 'You are not authorized to access this resource.');
      if (req.session.user) {
        if (req.originalUrl == '/') res.redirect(url.resolve(conf.site.url, '/disconnect'));
        else res.redirect('/');
      } else res.redirect(url.resolve(conf.site.url, '/login?destination=' + encodeURIComponent(req.originalUrl)));
    };

    if (req.session.user) {
      if (req.session.user.groups.indexOf(role) > -1) next();
      else fail();
    } else fail();
  };
};

exports.forceLogin = function(req, res, next) {
  if (req.session.user) next();
  else {
    log.info('anonymous user: denied access to login-only ' + req.originalUrl);
    req.flash('error', 'You must be logged in to access ' + req.originalUrl);
    res.redirect(url.resolve(conf.site.url, '/login?destination=' + encodeURIComponent(req.originalUrl)));
  }
};

exports.forceLogout = function(req, res, next) {
  if (req.session.user) {
    log.info(req.session.user[conf.user.username] + ': denied access to anonymous-only ' + req.originalUrl);
    req.flash('error', 'You must be logged out to access ' + req.originalUrl);
    res.redirect('/');
  } else next();
};

// set a secondaryemail field to an array, prevents a lot of validation bugs
exports.secToArray = function(req, res, next) {
  if (req.body && req.body.secondaryemail) {
    var secmail = req.body.secondaryemail;
    req.body.secondaryemail = (typeof secmail == 'string') ? [secmail] : secmail;
  }
  next();
};

exports.stripNewlines = function(req, res, next) {
  log.trace('before: ' + req.body.loginusername);
  if (req.body) {
    for (var field in req.body) {
      req.body[field] = req.body[field].replace(/(\r\n|\n|\r)/gm, "");
    }

    log.trace('after: ' + req.body.loginusername);
  }
  next();
};

// parse paramater tables submitted with "param-table" view. passes an object
exports.parseParamTable = function(req, res, next) {
  var generatedList = [];
  for (var a in req.body) {
    log.trace("parsing " + a + ": " + req.body[a]);
    var split = /([0-9]+)-(\D+)/.exec(a), // splits to name and number of input
      ind = parseInt(split[1]),
      type = split[2];

    if (!req.body[a]) continue; // skip if this link is blank

    if (!generatedList[ind]) {
      generatedList[ind] = {}; // create if it doesn't exist (first item of this link)
      generatedList[ind].id = ind;
    }

    generatedList[ind][type] = req.body[a];
  }
  res.local('params', generatedList);
  next();
};
