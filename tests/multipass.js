'use strict';
/*jshint expr: true*/
const crypto = require('crypto');
const multi = require('../lib/multipass');
const expect = require('chai').expect;


// Testing data
const apiKey = 'whitewizard';
const siteKey = 'gandalf';
const data = {
	'foo': 'bar',
	'woo': 'hoo'
};

const crack = (multipass, signature) => {
	const checkSignature = crypto.createHmac('sha1', apiKey)
		.update(multipass)
		.digest('base64');
	if (signature !== checkSignature) {
		return false;
	}

	const tmp = new Buffer(multipass, 'base64');
	const iv = tmp.slice(0, 16);
	multipass = tmp.slice(16);
	const key = crypto.createHash('sha1')
		.update(apiKey + siteKey)
		.digest('binary').substring(0, 16);

	const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
	let result = decipher.update(multipass, 'buffer', 'utf8');
	result += decipher.final('utf8');
	return result;
};

describe('multipass encrypting', () => {
	it('should correctly encode the info', done => {
		const tdata = JSON.stringify(data);
		let tmp = multi(tdata, apiKey, siteKey);
		tmp = crack(tmp.multipass, tmp.signature);
		expect(tmp).to.equal(tdata);
		done();
	});
});