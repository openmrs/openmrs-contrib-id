'use strict';
/*jshint expr: true*/
var crypto = require('crypto');
var multi = require('../lib/multipass');
var expect = require('chai').expect;


// Testing data
var apiKey = 'whitewizard';
var siteKey = 'gandalf';
var data = {'foo': 'bar', 'woo': 'hoo'};

var crack = function (multipass, signature) {
  var checkSignature = crypto.createHmac('sha1', apiKey)
                             .update(multipass)
                             .digest('base64');
  if (signature !== checkSignature) {
    return false;
  }

  var tmp = new Buffer(multipass, 'base64');
  var iv = tmp.slice(0, 16);
  multipass = tmp.slice(16);
  var key = crypto.createHash('sha1')
                  .update(apiKey + siteKey)
                  .digest('binary').substring(0, 16);

  var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  var result = decipher.update(multipass, 'buffer', 'utf8');
  result += decipher.final('utf8');
  return result;
};

describe('multipass encrypting', function () {
  it ('should correctly encode the info', function (done) {
    var tdata = JSON.stringify(data);
    var tmp = multi(tdata, apiKey, siteKey);
    tmp = crack(tmp.multipass, tmp.signature);
    expect(tmp).to.equal(tdata);
    done();
  });
});
