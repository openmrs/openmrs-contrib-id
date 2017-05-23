'use strict';
/**
 * This is the router for /profile. It displays a users profile,
 * and hanldes its editing.
 */
const path = require('path');
const async = require('async');
const _ = require('lodash');
const log = require('log4js').addLogger('express');


const common = require('../../common');
const conf = require('../../conf');
const verification = require('../../email-verification');
const validate = require('../../validate');
const mid = require('../../express-middleware');
const User = require('../../models/user');
const utils = require('../../utils');

exports = module.exports = app => {


	app.get('/profile', mid.forceLogin,
		(req, res, next) => {

			// check if any emails being verified

			const user = req.session.user;
			const username = user.username;

			const allEmails = [];

			// verified emails
			_.forEach(user.emailList, email => {
				const item = {
					email: email
				};
				if (email === user.primaryEmail) {
					item.primary = true;
				}
				allEmails.push(item);
			});

			// unverified emails
			const findNewEmail = callback => {
				const category = 'new email';
				verification.search(username, category, callback);
			};

			const addToList = (insts, callback) => {
				_.forEach(insts, inst => {
					const item = {
						email: inst.addr,
						id: utils.urlEncode64(inst.uuid),
						notVerified: true,
					};
					allEmails.push(item);
				});
				return callback();
			};

			async.waterfall([
					findNewEmail,
					addToList,
				],
				err => {
					if (err) {
						return next(err);
					}
					res.render('views/profile/index', {
						emails: allEmails
					});
				});
		});

	// handle basical profile change, firstName and lastName only currently
	app.post('/profile', mid.forceLogin,
		(req, res, next) => {

			const username = req.session.user.username;

			const validation = callback => {
				validate.perform({
					firstName: validate.chkEmpty.bind(null, req.body.firstName),
					lastName: validate.chkEmpty.bind(null, req.body.lastName),
				}, (err, validateError) => {
					if (_.isEmpty(validateError)) {
            req.flash('success','Successfully updated profile.');
						return callback();
					}
					return res.json({
						fail: validateError
					});
				});
			};

			const findUser = callback => {
				User.findByUsername(username, callback);
			};

			const updateUser = (user, callback) => {
				user.firstName = req.body.firstName;
				user.lastName = req.body.lastName;
				user.displayName = `${req.body.firstName} ${req.body.lastName}`;
				user.save(callback);
			};

			async.waterfall([
					validation,
					findUser,
					updateUser,
				],
				(err, user) => {
					if (err) {
						return next(err);
					}
					log.info(`${username} succesfully updated`);
					req.session.user = user;
					return res.redirect(req.url);
				});
		});

	// AJAX
	// handle the welcome message
	app.get('/profile/welcome', mid.forceLogin, (req, res, next) => {
		if (!req.xhr) {
			return;
		}
		const username = req.session.user.username;
		const findUser = callback => {
			User.findByUsername(username, callback);
		};
		const updateUser = (user, callback) => {
			if (_.isEmpty(user.extra)) {
				user.extra = {};
			}
			user.extra.__welcomed = true;
			user.save(callback);
		};
		async.waterfall([
			findUser,
			updateUser,
		], (err, user) => {
			if (err) {
				log.error('caught error in /profile/welcome');
				log.error(err);
				return;
			}
			req.session.user = user;
			return res.json({
				success: true
			});
		});
	});



};
