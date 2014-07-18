/*jshint expr: true*/
var crypto = require('crypto');
var expect = require('chai').expect;
var utils = require('../app/utils');

describe('SHA generator and checker', function() {
  it('the generator and checker should be at least corresponding', function() {
    var str = crypto.pseudoRandomBytes(20).toString('base64');
    var hashed = utils.getSHA(str);
    expect(utils.checkSHA(str, hashed)).to.be.true;
  });
});
