/**
 * Some utility tools
 */
var crypto = require('crypto');

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

