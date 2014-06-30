/**
 * Some utility tools
 */
var crypto = require('crypto');
var _ = require('lodash');

var Common = require(global.__commonModule);
var conf = Common.conf;

// password hashing
exports.getSHA = function (cleartext) {
  var sum = crypto.createHash('sha1');
  sum.update(cleartext);
  var digest = sum.digest('base64');
  var ret = '{SHA}' + digest;
  return ret;
};

exports.checkSHA = function (cleartext, hashed) {
  if (0 !== hashed.indexOf('{SHA}')) {
    return false;
  }
  var newHash = exports.getSHA(cleartext);
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
