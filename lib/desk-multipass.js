var crypto = require('crypto');

/**
 * This module is modified from node-desk module, the usage is not changed.
 * Desk.com multipass documentation http://dev.desk.com/docs/portal/multipass
 */
var Desk = function(siteKey, apiKey) {
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
   * @param {String} value Customer email
   * @return {Object} self
   */
  this.customer_email = function(value) {
    hash.customer_email = value;
    return self;
  };

  /**
   * @param {String} value Customer name
   * @return {Object} self
   */
  this.customer_name = function(value) {
    hash.customer_name = value + '';
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
   * @param {String} key unique custom name
   * @param {String} value key value
   * @return {Object} self
   */
  this.customer_custom = function(key, value) {
    hash['customer_custom_' + key] = value;
    return self;
  };

  /**
   * @param {Function} callback function(error, multipass, signature)
   */
  this.end = function(callback) {
    if (!(hash.uid && hash.expires && hash.customer_email && hash.customer_name))
      return callback(new Error('Missing required field'));

    // multipass
    var key = crypto.createHash('sha1').update(apiKey + siteKey).digest('binary').substring(0, 16);
    var iv = new Buffer('OpenSSL for Node', 'binary');
    var data = new Buffer(JSON.stringify(hash));
    var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);

    // node crypto does autopadding by default
    var multipass = cipher.update(data, 'binary', 'binary') + cipher.final('binary');

    //prepend the iv
    multipass = new Buffer(iv+multipass, 'binary');
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
 * @param {String} siteKey Desk.com account/site key
 * @param {String} apiKey Desk.com API key
 * @return {Object} Desk object
 */
exports.createDesk = function(siteKey, apiKey) {
  return new Desk(siteKey, apiKey);
};