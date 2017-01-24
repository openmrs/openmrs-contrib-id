'use strict';
/**
 * Some utility tools
 */
const crypto = require('crypto');
const _ = require('lodash');
const conf = require('./conf');
const request = require('request');
const qs = require('querystring');

// password hashing
exports.getSSHA = (cleartext, salt) => {
	if (_.isUndefined(salt)) {
		salt = new Buffer(crypto.randomBytes(20)).toString('base64');
	}
	const sum = crypto.createHash('sha1');
	sum.update(cleartext);
	sum.update(salt);
	const digest = sum.digest('binary');
	const ret = '{SSHA}' + new Buffer(digest + salt, 'binary').toString('base64');
	return ret;
};

exports.checkSSHA = (cleartext, hashed) => {
	if (0 !== hashed.indexOf('{SSHA}')) {
		return false;
	}
	const hash = new Buffer(hashed.substr(6), 'base64');
	const salt = hash.toString('binary', 20);
	const newHash = exports.getSSHA(cleartext, salt);
	return newHash === hashed;
};

exports.isUsernameValid = username => {
	const usernameRegex = conf.user.usernameRegex;
	if (_.isEmpty(username) || !usernameRegex.test(username)) {
		// ensure it not empty first, avoid auto-cast for (null) or (undefined)
		return false;
	}
	return true;
};

exports.isEmailValid = email => {
	const emailRegex = conf.email.validation.emailRegex;
	if (_.isEmpty(email) || !emailRegex.test(email)) {
		return false;
	}
	return true;
};

// encode a string into base64
exports.encode64 = str => {
	const tmp = new Buffer(str);
	return tmp.toString('base64');
};

// decode a base64 string
exports.decode64 = str => {
	const tmp = new Buffer(str, 'base64');
	return tmp.toString('utf8');
};

// URL safe Base64 functions
exports.urlEncode64 = str => {
	str = exports.encode64(str);
	return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

exports.urlDecode64 = str => {
	str = str.replace(/-/g, '+').replace(/_/g, '/');
	let r = str.length % 4;
	while (r % 4) {
		++r;
		str += '=';
	}
	return exports.decode64(str);
};

// new Recaptcha validator
const Recaptcha = exports.Recaptcha = function(secret) {
	if (_.isUndefined(secret)) {
		console.error('missing recaptcha secret');
		throw new Error('missing recaptcha secret');
	}
	this.secret = secret;
};

// make a GET request to verify reCAPTCHA
Recaptcha.prototype.verify = function(data, callback) {
	const baseUrl = 'https://www.google.com/recaptcha/api/siteverify';
	let query = {
		secret: this.secret,
	};
	if (_.isUndefined(data.response)) {
		return callback('missing recaptcha response');
	}
	query.response = data.response;
	if (data.remoteip) {
		query.remoteip = data.remoteip;
	}
	query = qs.stringify(query);

	const verifyUrl = baseUrl + '?' + query;
	request.get(verifyUrl, (err, response, body) => {
		if (err) {
			return callback(err);
		}
		body = JSON.parse(body);
		const errCode = body['error-codes'];
		if (errCode) {
			return callback(errCode);
		}
		return callback(null, body.success);
	});
};