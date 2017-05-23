'use strict';
/**
 * This file handles all user-email request
 */
const path = require('path');
const async = require('async');
const _ = require('lodash');

const common = require('../../common');
const conf = require('../../conf');
const verification = require('../../email-verification');
const log = require('log4js').addLogger('express');
const mid = require('../../express-middleware');
const User = require('../../models/user');
const utils = require('../../utils');
const validate = require('../../validate');


exports = module.exports = app => {


	app.get('/profile/email/verify/:id', (req, res, next) => {
		// check for valid email verification ID

		let newEmail = '';
		let newUser = {};
		const id = utils.urlDecode64(req.params.id);

		const checkVerification = callback => {
			verification.check(id, (err, valid, locals) => {
				if (!valid) {
					req.flash('error', 'Profile email address verification not found.');
					return res.redirect('/');
				}
				newEmail = locals.mail;
				return callback(null, locals.username);
			});
		};

		// could use findOneAndUpdate
		const findUser = (username, callback) => {
			User.findByUsername(username, callback);
		};

		const updateUser = (user, callback) => {
			user.emailList.push(newEmail);
			newUser = user;
			user.save((err, user) => {
				if (err) {
					return callback(err);
				}
				log.info(`successfully updated email for ${user.username}`);
				return callback();
			});
		};

		const clearRecord = callback => {
			verification.clear(id, callback);
		};

		async.waterfall([
				checkVerification,
				findUser,
				updateUser,
				clearRecord,
			],
			err => {
				if (err) {
					return next(err);
				}
				req.flash('success', 'Email address verified. Thanks!');
				// TODO
				if (req.session.user) {
					req.session.user = newUser;
					return res.redirect('/profile');
				}
				return res.redirect('/');
			});
	});

	app.get('/profile/email/resend/:id', mid.forceLogin,
		(req, res, next) => {

			const id = utils.urlDecode64(req.params.id);
			// check for valid id
			verification.resend(id, err => {
				if (err) {
					return next(err);
				}
				req.flash('success', 'Email verification has been resent.');
				res.redirect('/profile');
			});
		});


	// AJAX
	// add new email
	app.post('/profile/email', mid.forceLogin,
		(req, res, next) => {


			const user = req.session.user;
			const email = req.body.newEmail;

			const findDuplicateInVerification = (validateError, callback) => {
				if (validateError) {
					return callback(null, validateError);
				}
				verification.search(email, 'new email', (err, instances) => {
					if (err) {
						return callback(err);
					}
					if (instances.length > 0) {
						return callback(null, 'Already used');
					}
					return callback(null);
				});
			};


			const validation = callback => {
				async.waterfall([
					validate.chkEmailInvalidOrDup.bind(null, email),
					findDuplicateInVerification,
				], (err, validateError) => {
					if (err) {
						return next(err);
					}
					if (validateError) {
						return res.json({
							fail: {
								email: validateError
							}
						});
					}
					return callback();
				});
			};

			const sendVerification = callback => {
				log.debug(`${user.username}: email address ${email} will be verified`);
				// create verification instance
				verification.begin({
					callback: 'profile/email/verify',
					addr: email,
					category: 'new email',
					username: user.username,
					subject: '[OpenMRS] Email address verification',
					templatePath: path.join(common.templatePath, 'emails/email-verify.pug'),
					locals: {
						displayName: user.displayName,
						username: user.username,
						mail: email,
					}
				}, callback);
			};

			async.series([
				validation,
				sendVerification,
			], err => {
				if (err) {
					return next(err);
        }
        req.flash('success',`Successfully added ${email} pending verification. Please check your e-mail.`);
				return res.json({
					success: true
				});
			});


		});

	app.get('/profile/email/delete/:email', mid.forceLogin, (req, res, next) => {
		const user = req.session.user;
		const email = req.params.email;

		// primaryEmail can't be deleted
		if (email === user.primaryEmail) {
			req.flash('error', 'You cannot delete the primaryEmail');
			return res.redirect('/profile');
		}
		// verified
		if (-1 !== _.indexOf(user.emailList, email)) {
			const findUser = callback => {
				User.findByUsername(user.username, callback);
			};

			const updateUser = (user, callback) => {
				const index = _.indexOf(user.emailList, email);
				user.emailList.splice(index, 1);
				user.save(callback);
			};

			async.waterfall([
					findUser,
					updateUser,
				],
				(err, user) => {
					if (err) {
						return next(err);
					}
					log.info(`${user.username} successfully updated`);
					req.session.user = user;
					return res.redirect('/profile');
				});
			return;
		}

		// not verified
		log.debug('deleting verification for new email');
		const MSG = 'Email to delete not found'; // remove verifications
		const findVerification = callback => {
			verification.search(email, 'new email', (err, instances) => {
				if (err) {
					return callback(err);
				}
				if (_.isEmpty(instances)) {
					return callback(new Error(MSG));
				}
				if (instances.length > 1) {
					log.debug('There should be at most one instance matched');
				}
				return callback(null, instances[0]);
			});
		};

		const deleteVerification = (instance, callback) => {
			verification.clear(instance.uuid, callback);
		};

		if (-1 === _.indexOf(user.emailList, email)) {
			// delete veritification
			async.waterfall([
					findVerification,
					deleteVerification,
				],
				err => {
					if (err) {
						if (err.message === MSG) {
							return;
						}
						return next(err);
					}
					return res.redirect('/profile');
				});
		}
	});

	app.get('/profile/email/primary/:email', mid.forceLogin, (req, res, next) => {
		const email = req.params.email;
		const user = req.session.user;

		if (!_.includes(user.emailList, email)) {
			req.flash('error', 'You can only set your own email primary');
			return res.redirect('/profile');
		}

		const findUser = callback => {
			User.findByUsername(user.username, callback);
		};

		const setEmail = (user, callback) => {
			user.primaryEmail = email;
			user.save(callback);
		};

		async.waterfall([
				findUser,
				setEmail,
			],
			(err, user) => {
				if (err) {
					return next(err);
				}
				log.info(`${user.username} successfully updated`);
        req.flash('success',`Successfully set primary email to ${email}.`);
				req.session.user = user;
				return res.redirect('/profile');
			});
	});


};
