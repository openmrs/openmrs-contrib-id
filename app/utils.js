/**
 * Some utility tools
 */
var crypto = require('crypto');
var _ = require('lodash');
var conf = require('./conf');

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
