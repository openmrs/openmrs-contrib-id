var crypto = require('crypto');

/**
 * This module is modified from OpenMRS ID desk-multipass implementation
 */
var Atlas = function(siteKey, apiKey) {
  var self = this;
  var hash = {};

  /**
   * @param {String} value User ID
   * @return {Object} self
   */
  this.uid = function(value) {
    hash.uid = value + '';
    return self;
  };

  /**
   * @param {Date/String} value Expiration date (Date object or ISO8601 string)
   * @return {Object} self
   */
  this.expires = function(value) {
    hash.expires = (value instanceof Date) ? value.toJSON() : value;
    return self;
  };

  /**
   * @param {String} value User email
   * @return {Object} self
   */
  this.user_email = function(value) {
    hash.user_email = value;
    return self;
  };

  /**
   * @param {String} value User name
   * @return {Object} self
   */
  this.user_name = function(value) {
    hash.user_name = value + '';
    return self;
  };

  /**
   * @param  {String} value Absolute URL
   * @return {Object} self
   */
  this.to = function(value) {
    hash.to = value + '';
    return self;
  };

  /**
   * @param {Function} callback function(error, multipass)
   */
  this.end = function(callback) {
    if (!(hash.uid && hash.expires && hash.user_email && hash.user_name))
      return callback(new Error('Missing required field'));

    // multipass
    var key = crypto.createHash('sha1').update(apiKey + siteKey).digest('binary').substring(0, 16);
    var iv = new Buffer('OpenSSL for Node', 'binary');
    var data = new Buffer(JSON.stringify(hash));
    var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);

    // node crypto does autopadding by default
    var multipass = cipher.update(data, 'binary', 'binary') + cipher.final('binary');

    //prepend the iv
    multipass = new Buffer(multipass, 'binary');
    multipass = multipass.toString('base64');

    multipass = multipass
      .replace(/\n/g, '') // remove new lines
      .replace(/\=+$/, '') // remove trailing "="
      .replace(/\+/g, '-') // "+" to "-"
      .replace(/\//g, '_'); // "/" to "_"

    // signature
    var signature = crypto.createHmac('sha1', apiKey)
      .update(multipass)
      .digest('base64');

    callback(null, multipass, encodeURIComponent(signature));
  };
};

/**
 * @param {String} siteKey Atlas.com account/site key
 * @param {String} apiKey Atlas.com API key
 * @return {Object} Atlas object
 */
exports.createAtlas = function(siteKey, apiKey) {
  return new Atlas(siteKey, apiKey);
};