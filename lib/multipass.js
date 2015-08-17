'use strict';

var crypto = require('crypto');

/**
 * build a multipass string and its signature in deskcom's preferences
 * http://dev.desk.com/guides/sso/
 * @param  {String}     data
 * @param  {String}     apiKey
 * @param  {String}     siteKey
 * @return {Object}     {multipass, signature} base64 encoded
 */
function build (data, apiKey, siteKey) {
    var key = crypto.createHash('sha1')
                    .update(apiKey + siteKey)
                    .digest('binary').substring(0, 16);
    var iv = crypto.randomBytes(16);
    var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);

    var buffers = [];
    buffers.push(iv);
    buffers.push(cipher.update(data, 'utf8', 'buffer'));
    buffers.push(cipher.final('buffer'));
    var multipass = Buffer.concat(buffers).toString('base64');

    // signature
    var signature = crypto.createHmac('sha1', apiKey)
      .update(multipass)
      .digest('base64');

      return {multipass: multipass, signature: signature};
}

exports = module.exports = build;
