'use strict';
/*jshint expr: true*/
const crypto = require('crypto');
const expect = require('chai').expect;
const utils = require('../app/utils');

describe('SSHA generator and checker', () => {
  it('the generator and checker should be at least corresponding', () => {
    const str = crypto.pseudoRandomBytes(20).toString('base64');
    const hashed = utils.getSSHA(str);
    expect(utils.checkSSHA(str, hashed)).to.be.true;
  });
});

describe('URL safe base64 helpers', () => {
  it('should work cooperatively', () => {
    for (let i = 3 * 7; i < 3 * 8; ++i) { // test different length
      const str = crypto.randomBytes(i).toString('ascii');
      const hashed = utils.urlEncode64(str);
      expect(str === utils.urlDecode64(hashed));
      expect(hashed === encodeURIComponent(hashed));
    }
  });
});