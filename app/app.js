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
	app = express.createServer();
	
exports.app = app;

// fail if no configuration file found
try {
	fs.readFileSync(__dirname+'/conf.js');
}
catch (e) {
	console.log('ERROR: Configuration file not found at ('+__dirname+'/conf.js)! Exiting…');
	return;
}


var conf = require('./conf'),
	ldap = require('./openmrsid-ldap'),
	mid = require('./express-middleware'),
	log = require('./logger').add('express'),
	validate = require('./validate'),
	environment = require('./environment'),
	verification = require('./email-verification');

mail.SMTP = conf.email.smtp;

/* Load Modules */
require('./modules/groups');

/* Routes */


// LOGIN-LOGOUT
app.get('/', function(req, res, next){

	if (req.session.user)
		https.get({host: 'answers.openmrs.org', path: '/users/'+req.session.user.uid }, function(response) {
			if (response.statusCode == 200) app.helpers({osqaUser: true});
			else app.helpers({osqaUser: false});
			
			app.dynamicHelpers({
				
			});
			
			res.render('root');
		});
		
	else
		res.render('signup', {
			bodyAppend: '<script type="text/javascript" src="https://www.google.com/recaptcha/api/challenge?	k='+conf.validation.recaptchaPublic+'"></script>',
			title: 'OpenMRS ID - Manage Your Community Account'
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
				return res.redirect(url.resolve(conf.site.url, '/login'));
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



// SIGNUP

app.get('/signup', mid.forceLogout, function(req, res, next){
	res.render('signup', {
		title: 'OpenMRS ID - Sign Up',
		bodyAppend: '<script type="text/javascript" src="https://www.google.com/recaptcha/api/challenge?	k='+conf.validation.recaptchaPublic+'"></script>'
	});
});

app.post('/signup', mid.forceLogout, mid.forceCaptcha, validate(), function(req, res, next){
	var id = req.body.username, first = req.body.firstname, last = req.body.lastname,
		email = req.body.email, pass = req.body.password, captcha = req.body.recaptcha_response_field;
		
	if (!id || !first || !last || !email || !pass || !captcha) {
		res.send('Unauthorized POST error', { 'Content-Type': 'text/plain' }, 403);
		res.end();
	}
		
	var id = id.toLowerCase();
	
	// validate email before completing signup
	verification.begin({
		urlBase: 'signup',
		emails: email,
		subject: '[OpenMRS] Welcome to the OpenMRS Community',
		template: '../views/email/welcome-verify.ejs',
		locals: {
			displayName: first+' '+last,
			username: id,
			userCredentials: {
				id: id, first: first, last: last, email: email, pass: pass
			}
		},
		timeout: 0		
	}, function(err){
		if (err) return next(err);
		app.helpers({sentTo: email});
		req.flash('success', "<p>Thanks and welcome to the OpenMRS Community!</p>"
		+"<p>Before you can use your OpenMRS ID across our services, we need to verify your email address.</p>"
		+"<p>We've sent an email to <strong>"+email+"</strong> with instructions to complete the signup process.</p>");
		res.redirect('/signup/verify', 303);
	});
});

app.get('/signup/verify', function(req, res, next) {
	res.render('signedup');
});

// verification
app.get('/signup/:id', function(req, res, next) {
	verification.check(req.params.id, function(err, valid, locals){
		if (err) return next(err);
		if (valid) {
			var user = locals.userCredentials;
			
			// check if user already exists, if so, fail verification
			ldap.getUserByEmail(user.email, function(e, obj){
				if (obj) {
					log.debug('Signup verification requested for account that already exists.');
					verification.clear(req.params.id);
					
					req.flash('error', 'The requested account already exists.');
					res.redirect('/');	
				}
				else { // this is a new user
				
					// add the user to ldap
					ldap.addUser(user.id, user.first, user.last, user.email, user.pass, function(e, userobj){
						if (e) return next(e);
						log.info('created account "'+user.id+'"');
						
						verification.clear(req.params.id); // delete verification
						
						req.flash('success', 'Your account was successfully created. Welcome!');
						req.session.user = userobj;
						res.redirect('/');
					});
				}
			});
		}
		else {
			req.flash('error', 'The requested signup verification does not exist.');
			res.redirect('/');
		}
	});
});

app.get('/checkuser/*', function(req, res, next){
	ldap.getUser(req.params[0], function(e, data){
		if (e) {
			if (e.message=='User data not found') res.end(JSON.stringify({exists: false}));
			else if (e.message=='Illegal username specified') res.end(JSON.stringify({illegal: true}));
		}
		else if (data) res.end(JSON.stringify({exists: true}));
		else next(e);
	});
});



// USER PROFILE

app.get('/profile', mid.forceLogin, function(req, res, next){
	var sidebar = app.helpers()._locals.sidebar;
	var sidebar = (typeof sidebar == 'object') ? sidebar : []; // if no sidebars yet, set as empty array
	
	res.render('edit-profile', {sidebar: sidebar.concat(['sidebar/editprofile-avatar'])});
});

app.get('/password', mid.forceLogin, function(req, res, next){
	res.render('edit-password');
});

app.post('/profile', mid.forceLogin, mid.secToArray, validate(), function(req, res, next){
	var updUser = req.session.user, body = req.body;
	if ((updUser.cn != body.firstname) || (updUser.sn != body.lastname)) updUser.displayName = body.firstname+' '+body.lastname;
	
	updUser.cn = body.firstname, updUser.sn = body.lastname, updUser.mail = body.email;
	
	if (body.secondaryemail) updUser.otherMailbox = (typeof body.secondaryemail=='object') ? body.secondaryemail : [body.secondaryemail];
	else updUser.otherMailbox = [];
	
	if (updUser.objectClass.indexOf('extensibleObject') < 0) { // for secondaryMail support; someday this should be admin-configurable
		if (typeof updUser.objectClass == 'string') updUser.objectClass = [updUser.objectClass];
		updUser.objectClass.push('extensibleObject');
	}
	
	ldap.updateUser(updUser, function(e, returnedUser){
		log.trace('user update returned');
		log.trace(e);
		if (e) return next(e);
		else log.trace('user update no errors');
		log.info(returnedUser.uid+': profile updated');
		req.session.user = returnedUser;
		
		req.flash('success', 'Profile updated.')
			res.redirect('/');
	});
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
	
	if (resetCredential.indexOf('@') < 0) {
		ldap.getUser(resetCredential, function(e, obj){gotUser(e, obj);});
	}
	else if (resetCredential.indexOf('@') > -1) {
		ldap.getUserByEmail(resetCredential, function(e, obj){gotUser(e, obj);});
	}
	
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
		
		verification.begin({
			urlBase: 'reset',
			emails: secondaryMail.concat(email),
			subject: '[OpenMRS] Password Reset for '+username,
			template: '../views/email/password-reset.ejs',
			locals: {
				username: username,
				displayName: obj[conf.ldap.user.displayname]
			},
			timeout: conf.ldap.user.passwordResetTimeout,
		}, function(err){
			if (err) return next(err);
			finish();
		});
	};
	
	var finish = function() {
		req.flash('info', 'If the specified account exists, an email has been sent to your address(es) with further instructions to reset your password.');
        return res.redirect('/');
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
	log.warn('post received!');
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
app.get('*', function(req, res){
	req.flash('error', 'The requested resource was not found.');
	res.redirect('/');
});


/* App startup: */
app.listen(3000);
log.info('Express started on port '+app.address().port);
