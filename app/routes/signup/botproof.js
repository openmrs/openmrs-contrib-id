'use strict';
const crypto = require('crypto');
const async = require('async');
const _ = require('lodash');
const dns = require('dns');
const mongoose = require('mongoose');
const log = require('log4js').addLogger('signup');
const Schema = mongoose.Schema;

const conf = require('../../conf');
const signupConf = conf.signup;

const wlistSchema = new Schema({
	address: String,
});
const wlist = mongoose.model('IPWhitelist', wlistSchema);

const SECRET = crypto.createHash('sha1').update(Math.random().toString())
	.digest('hex');

function ip(req) {
	const xf = req.header('X-Forwarded-For') || '';
	return xf ? xf.split(/ *, */)[0] : req.connection.remoteAddress;
}

function reverseIp(req) {
	const a = ip(req).split('.');
	a.reverse();
	return a.join('.');
}

function badRequest(next, optionalMessage) {
	const err = new Error(optionalMessage || 'Form submission failed.' +
		'anti-bot checking.');
	err.statusCode = 400;
	next(err);
}

function hashField(name, spin) {
	// Disguise a legitimate field name (like "firstName") with an
	// obfuscated hash name based on this request's spinner.

	const hash = crypto.createHash('md5');
	hash.update(name).update(spin).update(SECRET);
	log.trace(`diguised field with name "${name}", spinner "${spin}"`);
	return hash.digest('hex');
}

module.exports = {
	// Every method in here is Connect middleware, and is used by chaining it to
	// the Express router. `botproof.generators` and `botproof.parsers` can also
	// be used to invoke all methods, as defined below.

	generateTimestamp: function generateTimestamp(req, res, next) {
		const timestamp = Date.now(),
			cipher = crypto.createCipher('aes192', SECRET);

		cipher.update(timestamp.toString());

		res.locals.timestamp = cipher.final('hex');
		next();
	},

	checkTimestamp: function checkTimestamp(req, res, next) {
		if (!req.body.timestamp) {
			return badRequest(next);
		}

		// Decipher
		const decipher = crypto.createDecipher('aes192', SECRET);

		decipher.update(req.body.timestamp, 'hex');
		const timestamp = decipher.final('utf8');


		const then = new Date(parseInt(timestamp, 10)),
			now = new Date(Date.now());

		// Throw out malformed timestamps
		if (isNaN(then.valueOf())) {
			return badRequest(next);
		}

		const diff = now - then;
		const minimumTime = signupConf.requiredSubmitTimeSec * 1000;
		log.trace(`submission time difference: ${diff}`);

		// Throw out a time in the future or too far in the past.
		if (diff < 0) {
			return badRequest(next, 'Submitted form received from a time in the' +
				' future');
		} else if (diff > signupConf.signupFormMaxAgeHours * 60 * 60 * 1000) {
			return badRequest(next, '');
		}

		// Delay the submission if it was completed too soon
		if (diff < minimumTime) {
			log.info(`deferring submission received in ${diff} ms from ${ip(req)}`);
			return setTimeout(next, minimumTime - diff);
		}

		next();
	},

	generateSpinner: function generateSpinner(req, res, next) {
		// The spinner is a hash of the current time, the client's IP, and the
		// secret. It's a hidden field within the page.

		// Generate the spinner and attach it to the request.
		const timestamp = res.locals.timestamp,
			hash = crypto.createHash('md5');

		log.trace(`generating spinner with timestamp "${timestamp}" for ip address "${ip(req)}"`);

		hash.update(timestamp.toString())
			.update(ip(req).toString())
			.update(SECRET);
		const spin = hash.digest('hex');

		res.locals.spinner = spin;
		res.locals.disguise = hashField;
		next();
	},

	unscrambleFields: function unscrambleFields(req, res, next) {
		// Parse through the body and unscramble any fields.

		// Fail the request if no spinner was passed
		if (!req.body.spinner) {
			return badRequest(next);
		}

		const expected = signupConf.signupFieldNames;
		expected.push(signupConf.honeypotFieldName); // also look for honeypot

		const spin = req.body.spinner;
		const result = {};

		for (const i in expected) {
			// Determine the field's hash, and set its value on the unscrambled
			// side.
			const f = expected[i];
			const hashed = hashField(f, spin);

			if (req.body[hashed]) {
				result[f] = req.body[hashed] || '';
				log.trace(`unscrambled field "${f}"=${req.body[hashed]}`);
			}
		}

		// Patch the captcha challenge field over to our results. The field
		// "g-recaptcha-response" is inserted by JavaScript as Recaptcha
		// is loaded, so we are unable to hash it. Since this field is inserted
		// dynamically, it is still relatively bot-proof.
		const rcf = 'g-recaptcha-response';
		if (req.body[rcf]) {
			result[rcf] = req.body[rcf];
		}

		// Replace the body with the un-hashed results.
		req.body = result;

		next();
	},

	// Invalidate the request if the honeypot has been filled (presumably by a
	// bot). Honeypot field name is configured in conf.signup.js
	checkHoneypot: function checkHoneypot(req, res, next) {

		log.debug("checking honeypot");

		if (req.body[signupConf.honeypotFieldName]) {
			return badRequest(next);
		}

		next();
	},

	spamListLookup: function spamListLookup(req, res, next) {
		const rev = reverseIp(req);
		const spams = signupConf.dnsSpamLists;

		// check the address with each list
		async.waterfall([
			function checkWhitelist(cb) {
				wlist.findOne({
					address: ip(req)
				}, (err, inst) => {
					if (err) {
						return next(err);
					}
					return cb(null, inst ? true : false);
				});
			},
			function checkBlacklist(isWhite, cb) {
				if (isWhite) {
					return next();
				}
				async.map(Object.keys(spams), (list, cb) => {
					dns.lookup(`${rev}.${list}`, (err, address) => {
						if (err) {
							if (err.code === 'ENOTFOUND') {
								return cb(null, false); // address not on list
							}
							return cb(err);
						}
						if (_.includes(spams[list].returnCodes, address)) {
							// address IS on list and proper return code specified
							return cb(null, true);
						}
						return cb(null, false);
					});

				}, function callback(err, results) {
					if (err) {
						return next(err);
					}
					if (_.includes(results, true)) {
						// if this address was indicated as spam
						log.info(`IP address ${ip(req)} flagged as spam`);
						return badRequest(next, `Your IP address, ${ip(req)}, was flagged as a spam address by our spam-blocking lists. Please open an issue if you believe this is in error.`);
					}
					next(); // not spam!
				});
			},
		]);
	}
};

module.exports.SECRET = SECRET; // used by testing

module.exports.generators = [
	module.exports.generateTimestamp,
	module.exports.generateSpinner
];

const parsers = module.exports.parsers = [];
parsers.push(module.exports.unscrambleFields);
parsers.push(module.exports.checkTimestamp);
if (!signupConf.disableHoneypot) {
	parsers.push(module.exports.checkHoneypot);
}
if (!signupConf.disableBlacklist) {
	parsers.push(module.exports.spamListLookup);
}
