'use strict';
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
const crypto = require('crypto');
const url = require('url');
const log = require('log4js').addLogger('express-middleware');
const conf = require('./conf');
const _ = require('lodash');


exports.openmrsHelper = (req, res, next) => {
  if (req.originalUrl === '/favicon.ico') {
    return next();
  }

  if (req.session && req.session.user) {
    const user = req.session.user;
    const mailHash = crypto.createHash('md5')
      .update(user.primaryEmail).digest('hex');

    _.merge(res.locals, {
      connected: true,
      user: req.session.user,
      mailHash: mailHash
    });
  } else {
    res.locals.connected = false;
  }
  next();
};


exports.restrictTo = role => (req, res, next) => {
  const fail = () => {
    req.flash('error', 'You are not authorized to access this resource.');
    if (req.session.user) {
      if (req.originalUrl === '/') {
        return res.redirect(url.resolve(conf.site.url, '/disconnect'));
      }
      return res.redirect('/');
    }
    return res.redirect(url.resolve(conf.site.url, `/login?destination=${encodeURIComponent(req.originalUrl)}`));

  };

  if (req.session.user && _.includes(req.session.user.groups, role)) {
    return next();
  }
  return fail();
};

exports.forceLogin = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  log.info(`anonymous user: denied access to login-only ${req.originalUrl}`);
  req.flash('error', `You must be logged in to access ${req.originalUrl}`);
  res.redirect(url.resolve(conf.site.url, `/login?destination=${encodeURIComponent(req.originalUrl)}`));
};

exports.forceLogout = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  log.info(`${req.session.user.username}: denied access to anonymous-only ${req.originalUrl}`);
  req.flash('error', `You must be logged out to access ${req.originalUrl}`);
  return res.redirect('/');
};

exports.stripNewlines = (req, res, next) => {
  log.trace(`before: ${req.body.loginusername}`);
  if (req.body) {
    for (const field in req.body) {
      req.body[field] = req.body[field].replace(/(\r\n|\n|\r)/gm, "");
    }

    log.trace(`after: ${req.body.loginusername}`);
  }
  next();
};

// parse paramater tables submitted with "param-table" view. passes an object
exports.parseParamTable = (req, res, next) => {
  const generatedList = [];
  for (const a in req.body) {
    log.trace(`parsing ${a}: ${req.body[a]}`);
    const // splits to name and number of input
      split = /([0-9]+)-(\D+)/.exec(a),
      ind = parseInt(split[1]),
      type = split[2];

    if (!req.body[a]) {
      continue; // skip if this link is blank
    }

    if (!generatedList[ind]) {
      // create if it doesn't exist (first item of this link)
      generatedList[ind] = {};
      generatedList[ind].id = ind;
    }

    generatedList[ind][type] = req.body[a];
  }
  res.locals.params = generatedList;
  next();
};