'use strict';
/**
 * This file handles requests related with signup operations
 */
const url = require('url');
const path = require('path');
const async = require('async');
const _ = require('lodash');
const log = require('log4js').addLogger('signup');

const conf = require('../../conf');
const mid = require('../../express-middleware');
const verification = require('../../email-verification');
const validate = require('../../validate');
const nav = require('../../user-nav');
const utils = require('../../utils');
const User = require('../../models/user');

const botproof = require('./botproof');
const emailPath = path.resolve(__dirname, '../../../templates/emails');

/*
ROUTES
======
*/

exports = module.exports = app => {


	// get signup from /signup or from / and handle accordingly
	app.get(/^\/signup\/?$|^\/$/i, botproof.generators,
		(req, res, next) => {

			if (req.session.user) {
				return next(); // pass onward if a user is signed in
			}

			// render the page
			res.locals.recaptchaPublic = conf.validation.recaptchaPublic;
			res.render('views/signup');
		});

	// prevent from getting 404'd if a logged-in user hits /signup
	app.get('/signup', mid.forceLogout);

	app.post('/signup', (req, res, next) => {
		console.log(JSON.stringify(req.session));
		console.log(JSON.stringify(req.body));
		return next();
	});

	app.post('/signup', mid.forceLogout, botproof.parsers,
		(req, res, next) => {

			if (!req.xhr) {
				return res.redirect('/');
			}
			let id = req.body.username;
			const first = req.body.firstName;
			const last = req.body.lastName;
			const email = req.body.primaryEmail;
			const pass = req.body.password;
			const captchaData = {
				response: req.body['g-recaptcha-response'],
			};

			// only lowercase
			id = id.toLowerCase();

			// perform validation
			const validation = callback => {
				const validators = {
					username: validate.chkUsernameInvalidOrDup.bind(null, id),
					primaryEmail: validate.chkEmailInvalidOrDup.bind(null, email),
					firstName: validate.chkEmpty.bind(null, first),
					lastName: validate.chkEmpty.bind(null, last),
					password: validate.chkLength.bind(null, pass, 8),
					recaptcha_response_field: validate.chkRecaptcha.bind(null, captchaData),
				};
				validate.perform(validators, (err, failures) => {
					if (err) {
						return callback(err);
					}
					if (_.isEmpty(failures)) {
						return callback();
					}
					res.json({
						fail: failures
					});
				});
			};

			const saveUser = callback => {
				const newUser = new User({
					username: id,
					firstName: first,
					lastName: last,
					displayName: first + ' ' + last,
					primaryEmail: email,
					emailList: [email],
					password: pass,
					locked: true,
				});
				newUser.save(callback);
			};

			const sendVerificationEmail = callback => {
				const verificationOptions = {
					addr: email,
					subject: '[OpenMRS] Welcome to the OpenMRS Community',
					templatePath: path.join(emailPath, 'welcome-verify.pug'),
					username: id,
					category: 'signup',
					callback: '/signup',
					locals: {
						displayName: first + ' ' + last,
						username: id,
					},
					timeout: 0
				};
				log.debug('Sending signup email verification');
				verification.begin(verificationOptions, callback);
			};

			async.series([
					validation,
					saveUser,
					sendVerificationEmail,
				],
				err => {
					if (err) {
						return next(err);
					}
					res.json({
						success: true
					});
				});
		});

	app.get('/signup/verify', (req, res) => {
		res.render('views/signedup');
	});

	// verification
	app.get('/signup/:id', (req, res, next) => {
		const id = utils.urlDecode64(req.params.id);
		const INVALID_MSG = 'The requested signup verification does not exist, ' +
			'it might be expired.';

		const findUsernameByVerifyID = callback => {
			verification.check(id, (err, valid, locals) => {
				if (err) {
					return callback(err);
				}
				if (!valid) {
					return callback({
						failMessage: INVALID_MSG
					});
				}
				return callback(null, locals.username);
			});
		};

		// clear locked and expiration flag
		const updateUser = (user, callback) => {
			user.locked = false;
			user.createdAt = undefined;
			user.addGroupsAndSave(conf.user.defaultGroups, callback);
		};

		async.waterfall([
				findUsernameByVerifyID,
				User.findByUsername.bind(User),
				updateUser,
			],
			(err, user) => {
				if (err) {
					if (err.failMessage) {
						req.flash('error', err.failMessage);
						return res.redirect('/');
					}
					return next(err);
				}
				// we don't have to wait clear
				verification.clear(id);
				log.debug(user.username + ': account enabled');
				req.flash('success', 'Your account was successfully created. Welcome!');

				req.session.user = user;
				res.redirect('/');
			});
	});

	// AJAX, check whether or not user exists
	app.get('/checkuser/:id', (req, res) => {
		if (!req.xhr) {
			return res.redirect('/');
		}
		const username = req.params.id;
		const isValid = conf.ldap.user.usernameRegex.test(username);

		if (!isValid) {
			return res.json({
				illegal: true
			});
		}

		User.findByUsername(username, function chkUser(err, user) {
			if (err) {
				log.error('error in checkuser');
				log.error(err);
				return;
			}
			if (user) {
				return res.json({
					exists: true
				});
			}
			return res.json({
				exists: false
			});
		});
	});

	app.get('/checkemail/:email', (req, res) => {
		if (!req.xhr) {
			return res.redirect('/');
		}
		validate.chkEmailInvalidOrDup(req.params.email, (err, errState) => {
			if (err) {
				log.error('error in checkemail');
				log.error(err);
				return;
			}
			if (true === errState) {
				return res.json({
					illegal: true
				});
			}
			if (errState) {
				return res.json({
					exists: true
				});
			}
			return res.json({
				exists: false
			});
		});
	});


};