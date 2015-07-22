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
