/**
 * The contents of this file are subject to the OpenMRS Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */

var express = require('express'),
	ejs = require('ejs'),
	fs = require('fs'),
	path = require('path'),
	connect = require('connect'),
	mail = require('nodemailer'),
	https = require('https'),
	url = require('url'),
	crypto = require('crypto'),
	app = express.createServer();

// establish module & global variables
module.exports = app;
global.__apppath = __dirname;

// fail if no configuration file found
try {
	fs.readFileSync(__dirname+'/conf.js');
}
catch (e) {
	console.log('ERROR: Configuration file not found at ('+__dirname+'/conf.js)! Exiting…');
	return;
}


var Common = require('./openmrsid-common'),
	conf = Common.conf,
	ldap = Common.ldap,
	db = Common.db,
	mid = Common.mid,
	renderHelpers = Common.renderHelpers,
	log = Common.logger.add('express'),
	validate = Common.validate,
	environment = Common.environment,
	verification = Common.verification;

mail.SMTP = conf.email.smtp;

/* Load Modules */
conf.systemModules.forEach(function(module){
	require('./system-modules/'+module);
});
conf.userModules.forEach(function(module){
	require('./user-modules/'+module);
});


/*
ROUTES
======
*/


// LOGIN-LOGOUT
app.get('/', function(req, res, next){

if (!req.session.user) return next();

https.get({host: 'answers.openmrs.org', path: '/users/'+req.session.user.uid }, function(response) {
	if (response.statusCode == 200) app.helpers({osqaUser: true});
	else app.helpers({osqaUser: false});

	app.dynamicHelpers({

	});

	res.render('root');
});
});

app.get(/^\/login\/?$/, mid.forceLogout, function(req, res, next){
	res.render('login');
});

app.post('/login', mid.stripNewlines, validate(), function(req, res, next){
	var completed = 0, needToComplete = 1, userobj = {},
		username = req.body.loginusername, password = req.body.loginpassword;



	var redirect = (req.body.destination) ? req.body.destination : '/';

	// do the actual authentication by forming a unique bind to the server as the authenticated user;
	// closes immediately (all operations work through system's LDAP bind)
	ldap.authenticate(username, password, function(e){
		ldap.close(username);

		if (e) { // authentication error
			if (e.message == 'Invalid credentials') { // login failed
				log.debug('known login failure');
				log.info('authentication failed for "'+username+'" ('+e.message+')');
				req.flash('error', 'Login failed.');
				app.helpers({fail: {loginusername: false, loginpassword: true},
					values: {loginusername: username,
					loginpassword: password}});
				if (req.body.destination) { // redirect to the destination login page
					return res.redirect(url.resolve(conf.site.url, '/login?destination='+encodeURIComponent(req.body.destination)));
				}
				else return res.redirect(url.resolve(conf.site.url, '/login')); // redirect to generic login page
			}
			else {log.debug('login error');return next(e);}
		}

		log.info(username+': authenticated'); // no error!

		// get a crowd SSO token and set the cookie for it
		// not implemented yet :-(
		/*crowd.getToken(username, password, function(error, token) {
			if (error && error.name != 403) next(e);
			else res.cookie('crowd.token_key', token);
			finish();
		})*/

		// get user's profile and put it in memory
		log.trace('getting user data');
		ldap.getUser(username, function(e, userobj) {
			log.trace(' returned');
			if (e) return next(e);
			req.session.user = userobj;
			log.debug('user '+username+' stored in session');
			app.helpers()._locals.clearErrors(); // keeps "undefined" from showing up in error values
			finish();
		});

		var finish = function() {
			completed++;
			if (completed == needToComplete) {
				res.redirect(url.resolve(conf.site.url, decodeURIComponent(redirect)));
			}
		}
	});
});

app.get('/disconnect', function(req, res, next) {
	if (req.session.user) {
		log.info(req.session.user.uid+': disconnecting');
		req.session.destroy();
	}
	res.redirect('/');
});


// USER PROFILE

app.get('/profile', mid.forceLogin, function(req, res, next){

	var sidebar = app.helpers()._locals.sidebar;
	var sidebar = (typeof sidebar == 'object') ? sidebar : []; // if no sidebars yet, set as empty array

	// check if any emails being verified

	var user = req.session.user, username = user[conf.user.username], secondary = user[conf.user.secondaryemail] || [],
		emails = secondary.concat(user[conf.user.email]);

	verification.search(username, 'profile-email', function(err, instances) {
		if (err) return next(err);

		// loop through instances to set up each address under verification
		var fieldsInProgress = {}, newSecondary = {};
		instances.forEach(function(inst){
			var thisProgress = {} // contains data for this address

			// get email address pending change and the current address
			var newEmail = inst.email,
				oldEmail = inst.locals.newToOld[newEmail];

			newSecondary = inst.locals.secondary;


			if (oldEmail == '') oldEmail = '';

			thisProgress.oldAddress = oldEmail;
			thisProgress.newAddress = newEmail;

			// set up links to cancel and resend verification
			thisProgress.id = inst.actionId;

			// push this verification data to the render variable
			fieldsInProgress[thisProgress.newAddress] = thisProgress;
		});

		var inProgress = (Object.keys(fieldsInProgress).length > 0);


		// render the page
		res.render('edit-profile', {progress: fieldsInProgress, inProgress: inProgress, newSecondary: newSecondary});
	});
});

app.post('/profile', mid.forceLogin, mid.secToArray, validate(), function(req, res, next){
	var updUser = req.session.user, body = req.body;

	// corresponds a new email address to the original value
	var newToOld = {};

	newToOld[body.email] = updUser[conf.user.email]
	for (var i = 0; i < body.secondaryemail.length; i++) { // add each new secondary address to the object
		newToOld[body.secondaryemail[i]] = (updUser[conf.user.secondaryemail][i])
			? updUser[conf.user.secondaryemail][i]
			: '';
	}

	// combine all email addresses & get the addresses that have changed
	var newSecondary = body.secondaryemail || [], oldSecondary = updUser[conf.user.secondaryemail] || [],
		newEmails = newSecondary.concat(body.email), oldEmails = oldSecondary.concat(updUser[conf.user.email]),
		emailsChanged = newEmails.filter(function(i){
			return !(oldEmails.indexOf(i) > -1);
		});

	if (emailsChanged.length > 0) {
		emailsChanged.forEach(function(mail){  // begin verificaiton for each changed address
			// verify these adresses
			log.debug(updUser[conf.user.username]+': email address '+mail+' will be verified');
			// create verification instance
			verification.begin({
				urlBase: 'profile-email',
				email: mail,
				associatedId: updUser[conf.user.username],
				subject: '[OpenMRS] Email address verification',
				template: '../views/email/email-verify.ejs',
				locals: {
					displayName: updUser[conf.user.displayname],
					username: updUser[conf.user.username],
					mail: mail,
					newToOld: newToOld,
					secondary: body.secondaryemail
				}
			}, function(err){
				if (err) log.error(err);
			});

		});
		// set flash messages
		if (emailsChanged.length == 1) req.flash('info', 'The email address "'+emailsChanged.join(', ')+'" needs to be verified. Verification instructons have been sent to the address.');
		else if (emailsChanged.length > 1) req.flash('info', 'The email addresses "'+emailsChanged.join(', ')+'" need to be verified. Verification instructons have been sent to these addresses.');
		// don't push new email addresses into session
		updUser[conf.user.email] = updUser[conf.user.email];
		updUser[conf.user.secondaryemail] = updUser[conf.user.secondaryemail];
	}
	else { // copy email addresses into session
		updUser[conf.user.email] = body.email;

		// force secondary email to be stored an array
		if (body.secondaryemail) updUser[conf.user.secondaryemail] = (typeof body.secondaryemail=='object') ? body.secondaryemail : [body.secondaryemail];
		else updUser[conf.user.secondaryemail] = [];
	}

	// copy other changes into user session
	if ((updUser[conf.user.firstname] != body.firstname) || (updUser[conf.user.lastname] != body.lastname))
		updUser[conf.user.displayname] = body.firstname+' '+body.lastname;
	updUser[conf.user.firstname] = body.firstname, updUser[conf.user.lastname] = body.lastname;

	// add any extra objectclasses
	if (updUser.objectClass.indexOf('extensibleObject') < 0) { // for secondaryMail support
		if (typeof updUser.objectClass == 'string') updUser.objectClass = [updUser.objectClass];
		updUser.objectClass.push('extensibleObject');
	}

	// push updates to LDAP
	ldap.updateUser(updUser, function(e, returnedUser){
		log.trace('user update returned');
		log.trace(e);
		if (e) return next(e);
		else log.trace('user update no errors');
		log.info(returnedUser.uid+': profile updated');
		req.session.user = returnedUser;

		if (emailsChanged.length == 0) req.flash('success', 'Profile updated.'); // only show message if verification is NOT happening
		res.redirect('/');
	});

});

app.get('/profile-email/:id', function(req, res, next) {
	// check for valid profile-email verification ID
	verification.check(req.params.id, function(err, valid, locals) {
		if (valid) req.flash('success', 'Email address verified. Thanks!');
		else req.flash('error', 'Profile email address verification not found.');

		// push updates to LDAP
		ldap.getUser(locals.username, function(err, userobj){
			if (err) return next(err);

			// get new address and the address it's replacing
			var newMail = locals.mail,
				corrMail = locals.newToOld[newMail];

			// determine what kind of address (primary or sec.) it is & set it
			if (userobj[conf.user.email] == corrMail) {
				userobj[conf.user.email] = newMail; // prim. address
			}
			else { // address is secondary
				if (userobj[conf.user.secondaryemail].length > 0) { // user has some sec. addresses
					userobj[conf.user.secondaryemail].forEach(function(addr, i){
						if (addr == corrMail) userobj[conf.user.secondaryemail][i] = newMail; // replace an existing sec. email
					});
					if (corrMail == '') userobj[conf.user.secondaryemail].push(newMail); // add a new sec. email
				}
				else userobj[conf.user.secondaryemail] = [newMail]; // no current sec. mails, create the first one
			}

			ldap.updateUser(userobj, function(e, returnedUser){
				if (e) return next(e);

				verification.clear(req.params.id);

				log.info(returnedUser.uid+': profile-email validated & updated');
				req.session.user = returnedUser;

				// pass the updated email to renderer
				res.local('emailUpdated', locals.email);

				// redirect to profile page or homepage
				if (req.session.user) res.redirect('/profile');
				else res.redirect('/');
			});
		});
	});
});

app.get('/profile-email/resend/:actionId', mid.forceLogin, function(req, res, next){
	// check for valid id
	verification.resend(req.params.actionId, function(err, email){
		if (err) return next(err);
		req.flash('success', 'Email verification has been re-sent to "'+email+'".');
		res.redirect('/profile');
	});
});

app.get('/profile-email/cancel/:actionId', function(req, res, next){
	verification.getByActionId(req.params.actionId, function(err, inst){
		if (err) return next(err);

		var verifyId = inst.verifyId; // get verification ID
		verification.clear(verifyId, function(err) {
			if (err) return next(err);
			req.flash('success', 'Email verification for "'+inst.email+'" cancelled.');
			res.redirect('/profile');
		});
	})
});

app.get('/password', mid.forceLogin, function(req, res, next){
	res.render('edit-password');
});

app.post('/password', mid.forceLogin, validate(), function(req, res, next){
	var updUser = req.session.user;
	ldap.changePassword(updUser, req.body.currentpassword, req.body.newpassword, function(e){
		log.trace('password change return');
		if (e) console.log(e.msgid);
		if (e) return next(e);
		log.trace('password change no errors');
		log.info(updUser.uid+': password updated');

		req.flash('success', 'Password changed.')
		res.redirect('/');
	});
});


// PASSWORD RESETS

app.get('/reset', mid.forceLogout, function(req, res, next) {
	res.render('reset-public');
});

app.post('/reset', mid.forceLogout, function(req, res, next) {
	var resetCredential = req.body.resetCredential, username = '', email = '';

	var gotUser = function(e, obj) {

		if (e) {
			if (e.message=='User data not found') {
				log.info('reset requested for nonexistent user "'+resetCredential+'"');
				return finish();
			}
			else {
				return next(e);
			}
		}

		var username = obj[conf.ldap.user.username], email = obj[conf.ldap.user.email],
			secondaryMail = obj[conf.ldap.user.secondaryemail] || [];

		var emails = secondaryMail.concat(email); // array of both pri. and sec. addresses to send to

		// send the verifications
		var errored = false, calls = 0;
		var verificationCallback = function(err){
			calls++;
			if (err && !errored) {
				errored = true;
				return next(err);
			}
			if (calls === emails.length && !errored) finish();
		};

		emails.forEach(function(address){
			verification.begin({
				urlBase: 'reset',
				email: address,
				subject: '[OpenMRS] Password Reset for '+username,
				template: '../views/email/password-reset.ejs',
				locals: {
					username: username,
					displayName: obj[conf.ldap.user.displayname],
					allEmails: emails
				},
				timeout: conf.ldap.user.passwordResetTimeout
			}, verificationCallback);
		});
	};

	var finish = function() {
		req.flash('info', 'If the specified account exists, an email has been sent to your address(es) with further instructions to reset your password.');
        return res.redirect('/');
	}

	// Begin here.
	if (resetCredential.indexOf('@') < 0) {
		ldap.getUser(resetCredential, function(e, obj){gotUser(e, obj);});
	}
	else if (resetCredential.indexOf('@') > -1) {
		ldap.getUserByEmail(resetCredential, function(e, obj){gotUser(e, obj);});
	}

});

app.get('/reset/:id', function(req, res, next){
	var resetId = req.params.id;
	verification.check(resetId, function(err, valid, locals){
		if (err) return next(err);
		if (valid) {
			res.render('reset-private', {username: locals.username});
		}
		else {
			req.flash('error', 'The requested password reset has expired or does not exist.');
			res.redirect('/');
		}
	});
});

app.post('/reset/:id', validate(), function(req, res, next){
	verification.check(req.params.id, function(err, valid, locals){
		if (err) return next(err);
		if (valid) {
			ldap.resetPassword(locals.username, req.body.newpassword, function(e){
				if (e) return next(e);
				log.info('password reset for "'+locals.username+'"');
				verification.clear(req.params.id); // remove validation from DB
				req.flash('success', 'Password has been reset successfully. You may now log in across the OpenMRS Community.');
				app.helpers()._locals.clearErrors(); // keeps "undefined" from showing up in error values
				res.redirect('/');
			});
		}
		else {
			req.flash('error', 'The requested password reset has expired or does not exist.');
			res.redirect('/');
		}
	});
});



// RESOURCES

app.get('/resource/*', function(req, res, next){
	var resourcePath = path.join(__dirname, '/../resource/', req.params[0]);
	res.sendfile(resourcePath);
});

// Legacy Redirects
app.get('/edit/profile?', function(req, res){res.redirect('/profile')});
app.get('/edit/password', function(req, res){res.redirect('/password')});

// 404's
app.get('*', function(req, res, next){
	if (req.header('Accept') && req.header('Accept').indexOf('text/html') > -1) {
		// send an HTML error page
		res.statusCode = 404;
		var err = new Error('The requested resource "'+req.url+'" was not found. (404)');
		res.render('error', {e: err});
	}
	else {
		res.statusCode = 404;
		res.end('The requested resource was not found.');
	}
});


// Errors
app.error(function(err, req, res, next){
	log.error('Caught error: ' + err.name);
	if (!res.headerSent) {
		// ONLY try to send an error response if the response is still being
		// formed. Otherwise, we'd be stuck in an infinite loop.
			res.statusCode = err.statusCode || 500;
		if (req.accepts('text/html')) {
			res.render('error', {e: err});
		}
		else if (req.accepts('application/json')){
			res.json({
				statusCode: res.statusCode,
				error: err
			}, {'Content-Type': 'application/json'});
		}
		else {
			res.send("Error: "+err.message+"\n\n"+err.stack,
			{'Content-Type': 'text/plain'});
		}
	} else {
		// Silently fail and write to log
		log.warn('^^ Headers sent before error encountered');
	}


});

process.on('uncaughtException', function(err) {
  console.log(err);
});


/* App startup: */
app.listen(3000);
log.info('Express started on port '+app.address().port);
