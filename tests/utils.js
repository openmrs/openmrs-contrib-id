'use strict';
/*jshint expr: true*/
var crypto = require('crypto');
var expect = require('chai').expect;
var utils = require('../app/utils');

describe('SSHA generator and checker', function() {
  it('the generator and checker should be at least corresponding', function() {
    var str = crypto.pseudoRandomBytes(20).toString('base64');
    var hashed = utils.getSSHA(str);
    expect(utils.checkSSHA(str, hashed)).to.be.true;
  });
});

describe('URL safe base64 helpers', function () {
  it('should work cooperatively', function () {
    for (var i = 3*7; i < 3*8; ++i) { // test different length
      var str = crypto.randomBytes(i).toString('ascii');
      var hashed = utils.urlEncode64(str);
      expect(str === utils.urlDecode64(hashed));
      expect(hashed === encodeURIComponent(hashed));
    }
  });
});
