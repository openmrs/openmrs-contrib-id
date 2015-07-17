'use strict';
/**
 * Some utility tools
 */
var crypto = require('crypto');
var _ = require('lodash');
var conf = require('./conf');
var request = require('request');
var qs = require('querystring');

// password hashing
exports.getSSHA = function (cleartext, salt) {
  if (_.isUndefined(salt)) {
    salt = new Buffer(crypto.randomBytes(20)).toString('base64');
  }
  var sum = crypto.createHash('sha1');
  sum.update(cleartext);
  sum.update(salt);
  var digest = sum.digest('binary');
  var ret = '{SSHA}' +  new Buffer(digest+salt,'binary').toString('base64');
  return ret;
};

exports.checkSSHA = function (cleartext, hashed) {
  if (0 !== hashed.indexOf('{SSHA}')) {
    return false;
  }
  var hash = new Buffer(hashed.substr(6),'base64');
  var salt = hash.toString('binary', 20);
  var newHash = exports.getSSHA(cleartext, salt);
  return newHash === hashed;
};

exports.isUsernameValid = function (username) {
  var usernameRegex = conf.user.usernameRegex;
  if (_.isEmpty(username) || !usernameRegex.test(username)) {
    // ensure it not empty first, avoid auto-cast for (null) or (undefined)
    return false;
  }
  return true;
};

exports.isEmailValid = function (email) {
  var emailRegex = conf.email.validation.emailRegex;
  if (_.isEmpty(email) || !emailRegex.test(email)) {
    return false;
  }
  return true;
};

// new Recaptcha validator
var Recaptcha = exports.Recaptcha = function(secret) {
  if (_.isUndefined(secret)) {
    console.error('missing recaptcha secret');
    throw new Error('missing recaptcha secret');
  }
  this.secret = secret;
};

// make a GET request to verify reCAPTCHA
Recaptcha.prototype.verify = function(data, callback) {
  var baseUrl = 'https://www.google.com/recaptcha/api/siteverify';
  var query = {
    secret: this.secret,
  };
  if (_.isUndefined(data.response)) {
    return callback('missing recaptcha response');
  }
  query.response = data.response;
  if (data.remoteip) {
    query.remoteip = data.remoteip;
  }
  query = qs.stringify(query);

  var verifyUrl = baseUrl + '?' + query;
  request.get(verifyUrl, function (err, response, body) {
    if (err) {
      return callback(err);
    }
    body = JSON.parse(body);
    var errCode = body['error-codes'];
    if (errCode) {
      return callback(errCode);
    }
    return callback(null, body.success);
  });
};
