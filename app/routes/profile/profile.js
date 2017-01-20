'use strict';
/**
 * This is the router for /profile. It displays a users profile,
 * and hanldes its editing.
 */
var path = require('path');
var async = require('async');
var _ = require('lodash');
var log = require('log4js').addLogger('express');


var common = require('../../common');
var conf = require('../../conf');
var verification = require('../../email-verification');
var validate = require('../../validate');
var mid = require('../../express-middleware');
var User = require('../../models/user');
var utils = require('../../utils');

exports = module.exports = app => {


	app.get('/profile', mid.forceLogin,
		(req, res, next) => {

			// check if any emails being verified

			var user = req.session.user;
			var username = user.username;

			var allEmails = [];

			// verified emails
			_.forEach(user.emailList, email => {
				var item = {
					email: email
				};
				if (email === user.primaryEmail) {
					item.primary = true;
				}
				allEmails.push(item);
			});

			// unverified emails
			var findNewEmail = callback => {
				var category = 'new email';
				verification.search(username, category, callback);
			};

			var addToList = (insts, callback) => {
				_.forEach(insts, inst => {
					var item = {
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

			var username = req.session.user.username;

			var validation = callback => {
				validate.perform({
					firstName: validate.chkEmpty.bind(null, req.body.firstName),
					lastName: validate.chkEmpty.bind(null, req.body.lastName),
				}, (err, validateError) => {
					if (_.isEmpty(validateError)) {
						return callback();
					}
					return res.json({
						fail: validateError
					});
				});
			};

			var findUser = callback => {
				User.findByUsername(username, callback);
			};

			var updateUser = (user, callback) => {
				user.firstName = req.body.firstName;
				user.lastName = req.body.lastName;
				user.displayName = req.body.firstName + ' ' + req.body.lastName;
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
					log.info(username + ' succesfully updated');
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
		var username = req.session.user.username;
		var findUser = callback => {
			User.findByUsername(username, callback);
		};
		var updateUser = (user, callback) => {
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