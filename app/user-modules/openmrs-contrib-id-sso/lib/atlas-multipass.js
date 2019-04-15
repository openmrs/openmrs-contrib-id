'use strict';
// TODO
// Merge this with desk-multipass
// It's basically a copy of that one
const crypto = require('crypto');

/**
 * This module is modified from OpenMRS ID desk-multipass implementation
 */
const Atlas = function(siteKey, apiKey) {
	const self = this;
	const hash = {};

	/**
	 * @param {String} value User ID
	 * @return {Object} self
	 */
	this.uid = value => {
		hash.uid = `${value}`;
		return self;
	};

	/**
	 * @param {Date/String} value Expiration date (Date object or ISO8601 string)
	 * @return {Object} self
	 */
	this.expires = value => {
		hash.expires = (value instanceof Date) ? value.toJSON() : value;
		return self;
	};

	/**
	 * @param {String} value User email
	 * @return {Object} self
	 */
	this.user_email = value => {
		hash.user_email = value;
		return self;
	};

	/**
	 * @param {String} value User name
	 * @return {Object} self
	 */
	this.user_name = value => {
		hash.user_name = `${value}`;
		return self;
	};

	/**
	 * @param  {String} value Absolute URL
	 * @return {Object} self
	 */
	this.to = value => {
		hash.to = `${value}`;
		return self;
	};

	/**
	 * @param {Function} callback function(error, multipass)
	 */
	this.end = callback => {
		if (!(hash.uid && hash.expires && hash.user_email && hash.user_name))
			return callback(new Error('Missing required field'));

		// multipass

		const key = crypto.createHash('sha1').update(apiKey + siteKey).digest().slice(0, 16);
		const iv = new Buffer('OpenSSL for Node', 'binary');
		const data = new Buffer(JSON.stringify(hash));
		const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);

		// node crypto does autopadding by default
		let multipass = cipher.update(data, 'binary', 'binary') + cipher.final('binary');

		//prepend the iv
		multipass = new Buffer(multipass, 'binary');
		multipass = multipass.toString('base64');

		multipass = multipass
			.replace(/\n/g, '') // remove new lines
			.replace(/\=+$/, '') // remove trailing "="
			.replace(/\+/g, '-') // "+" to "-"
			.replace(/\//g, '_'); // "/" to "_"

		// signature
		const signature = crypto.createHmac('sha1', apiKey)
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
exports.createAtlas = (siteKey, apiKey) => new Atlas(siteKey, apiKey);