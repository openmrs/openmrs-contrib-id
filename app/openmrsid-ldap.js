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

//var LDAPServer = require('../node-LDAP/LDAP').Connection,
var LDAPServer = require('LDAP'),
	conf = require('./conf'),
//	system = new LDAPServer(), // system-bind operations (usual operations)
	system = new LDAPServer({uri: conf.ldap.server.uri, version: 3}), // system-bind operations (usual operations)
	userbinds = new Object, // object of user-bind connections (auths and password changes)
	log = require('./logger').add('ldap'),
	url = require('url'),
	systemTimeoutNode;

// // // // // // // // // // INTERNAL FUNCTIONS // // // // // // // // // //

function toLdapForm(user, op) { // Changes a user object to an LDAP array
	if (op == undefined) op = 'modify'
	var out = new Array;
	for (var attr in user) {
		if (attr == 'dn' || (attr == conf.ldap.user.password && op != 'add') || (attr == conf.ldap.user.username && op != 'add') || attr == 'memberof') continue; // protect from a few illegal changes
		var obj = new Object;
			obj.op = op;
			
		obj.attr = attr;
		if (typeof user[attr] == 'object') obj.vals = user[attr];
		else obj.vals = [user[attr].toString()];
		out.push(obj);
	}
	
	return out;
}

function systemTimeout() {
	systemTimeoutNode = setTimeout(function(){log.debug('system connection closing');system.close()}, 60000);
}

/*
function connect(cb){
	log.trace('LDAP system connect check');
	if (systemTimeoutNode && systemTimeoutNode._idlePrev) clearTimeout(systemTimeoutNode);
	if (typeof(cb)!='function') cb = new Function;
	
	try {
		system.search({
			base: conf.ldap.server.baseDn,
			scope: system.SUBTREE,
			filter: '('+conf.ldap.server.rdn+'='+conf.ldap.server.loginUser+')',
			attrs: conf.ldap.server.rdn
		}, function(e,d) {
			if (e && e.message == 'Request timed out') {
				return cb(e);		
			}	
			else if (e) { // not connected
				log.trace('response received: '+e.message);
				log.debug('no server connection, will reconnect')
				
				
				system.open(function(err){
					if (err) return cb(err);
					log.trace('system connection openened');
					
					system.simplebind({
						binddn: conf.ldap.server.rdn+'='+conf.ldap.server.loginUser+','+conf.ldap.server.baseDn, password: conf.ldap.server.password
					}, function(e){
						if (e) return cb(e);
						log.debug('system bind successful, retrying connection');
						cb();
						systemTimeout();
					});
				});
			}
			else { // connected
				if (d[0][conf.ldap.server.rdn]==conf.ldap.server.loginUser) {
					cb();
					systemTimeout();
				}
				else cb(new Error('Unable to verify LDAP connection'));	
			}
		});
	} catch (e) {
		log.error('Unable to connect to LDAP server');
		cb(e);
	}
}
*/

var connect = function(cb) { // a new connect function
	log.trace('LDAP connection check');
	
	// get stats to check & ensure that a connection is present
	var stats = system.getStats();
	if (stats.opens > 0 && stats.disconnects == stats.reconnects) // if connection has opened and is not dc'd
		cb()
		
	else { // we need to connect
		log.info('opening connection to LDAP server...');
		system.open(function(err){
			log.trace('connection open returned');
			if (err) return cb(err);
			
			system.simplebind({
				binddn: conf.ldap.server.rdn+'='+conf.ldap.server.loginUser+','+conf.ldap.server.baseDn,
				password: conf.ldap.server.password
			}, function(err, data){
				log.trace('binding to server returned');
				
				if (err) return cb(err);
				else { // connected!
					log.info('connected to LDAP server');
					cb();
				}
			});
		});
	}
}

// // // // // // // // // // USER-BOUND FUNCTIONS // // // // // // // // // //

/* authenticates user to a new LDAP Connection, immediately disconnects on success
 * callback passes error */
exports.authenticate = function(user, pass, cb) {
	if (!cb) cb = new Function;
	log.trace(user+': will authenticate')
	
	var userdn = conf.ldap.user.rdn+'='+user+','+conf.ldap.user.baseDn;
	userbinds[user] = new LDAPServer({uri: conf.ldap.server.uri, version: 3});
	userbinds[user].open(function(e){
		if (e) return cb(e);
		userbinds[user].simpleBind({binddn: userdn, password: pass}, function(e){
			if (e) return cb(e);			
			cb(e);
		});
	});
}

exports.close = function(user) {
	if (typeof(user)=='object') user = user[conf.ldap.user.rdn]; // convert to username if a userobj is given
	log.trace(user+': closing bind')
	userbinds[user].close();
	delete userbinds[user];
	log.debug(user+': user bind closed');
};


/* changes password for an existing user
 * callback returns error */
exports.changePassword = function(userobj, oldPass, newPass, cb){
	if (!cb) cb = new Function;
	var username = userobj[conf.ldap.user.rdn];
		
	if (typeof(userobj)=='object' && typeof(oldPass)=='string' && typeof(newPass)=='string') {
		
		function onceConnected() {
			userbinds[username].modify(userobj.dn, [
				{op: 'delete', attr: conf.ldap.user.password, vals: [oldPass]},
				{op: 'add', attr: conf.ldap.user.password, vals: [newPass]}
			], function(e){
				if (e) return cb(e);
				log.debug('password changed for '+username);
				exports.close(username);
				cb(e);
			});	
		}
		
		if (userbinds[username]) onceConnected();
		else exports.authenticate(username, oldPass, function(e){
			if (e) return cb(e);
			onceConnected();
		});
		
	}
		
	else {
		return cb(new Error('Incorrect arguments for password change'));
	}
}


// // // // // // // // // // SYSTEM-BOUND FUNCTIONS // // // // // // // // // //

/* gets a user object for specified username, with first/last name, email, uid, and groups
 * callback returns error and retreived user object */
exports.getUser = function(user, cb) {
	if (!cb) cb = new Function;
	connect(function(e){
		if (e) {
			log.error('ldap system connection error while getting user');
			return cb(e);
		}
	
		// allows only valid names to be searched for
		log.trace('check validity of username '+user);
		if ( !conf.ldap.user.usernameRegex.exec(user) ) return cb(new Error('Illegal username specified'));
		
		else {
			log.trace('getting user data from LDAP');
			var completed = 0, userobj = new Object, groups = new Array;
			
			// get user profile
			system.search({
				base: conf.ldap.user.baseDn,
				scope: system.SUBTREE,
				filter: '('+conf.ldap.user.rdn+'='+user+')',
				attrs: conf.ldap.user.username+' '+conf.ldap.user.firstname+' '+conf.ldap.user.lastname+' '+conf.ldap.user.displayname+' '+
					conf.ldap.user.email+' '+conf.ldap.user.secondaryemail+' objectClass'
			}, function(e,d){
				if (e) return cb(e);
				
				// empty user record; ldap has no record for requested user
				if (d.length == 0) return cb(new Error('User data not found'));
				
				// multiple records returned, there is clearly a problem with the user search
				else if (d.length != 1) {
					log.warn('getUser search returned multiple users for the same ID - something is wrong');
					return cb(new Error('Failed to retrieve user data for ' + user));
				}
				
				else {
					for (attr in d[0]) {
						if (attr == conf.ldap.user.secondaryemail)
							userobj[attr] = d[0][attr];
						else if (typeof d[0][attr] == 'object' && d[0][attr].length < 2)
							userobj[attr] = d[0][attr].toString();
						else
							userobj[attr] = d[0][attr];
					}
					
					finish()
				}
			});
			
			// get user's groups
			system.search({
				base: conf.ldap.group.baseDn,
				scope: system.SUBTREE,
				filter: '('+conf.ldap.group.member+'='+conf.ldap.user.rdn+'='+user+','+conf.ldap.user.baseDn+')',
				attrs: conf.ldap.group.rdn
			}, function(e,d){
				if (e) return cb(e);
			
				d.forEach(function(item) {
					groups.push(item[conf.ldap.group.rdn][0].toString());
				});
				userobj.memberof = groups;
				finish();
			});
			
			
			function finish(){
				completed++;
				if (completed == 2)	cb(undefined, userobj); // FINALLY, all done
			}
		}
	});
}

/* gets user object by (primary) email address (calls getUser)
 * callback return error, user object */
exports.getUserByEmail = function(email, cb) {
	connect(function(e) {
		system.search({
			base: conf.ldap.user.baseDn,
			scope: system.SUBTREE,
			filter: '('+conf.ldap.user.email+'='+email+')',
			attrs: conf.ldap.user.username
		}, function(e,d) {
			if (e) return cb(e);
			if (d[0] && d[0][conf.ldap.user.username]) {
				username = d[0][conf.ldap.user.username];
				exports.getUser(username, function(e, obj) {
					if (e) return cb(e);
					cb(e, obj, email); // return email so caller has context for the response (aka validation.js)
				});
			}
			else return cb(new Error('User data not found'));	
		});
	});
}


/* pushes the entire user object to LDAP, updates group memberships
 * callback returns error and updated user object */
exports.updateUser = function(user, cb) { // updates user using modified "user" object
	var finished = 0, removedGroups = new Array, everyGroup = new Array, everyLength, groupsIterated = 0;
	if (!cb) cb = new Function;
	connect(function(e){if (e) return cb(e);
	
		// send and get new user data; callback
		log.trace('sending modify call to server');
		system.modify(user.dn, toLdapForm(user, 'replace'), function(e){
			if (e) return cb(e);
			finish();
		});
		
		// parse groups in object; update groups for user by comparing userobj's groups with their groups in the server		
		system.search({
			base: conf.ldap.group.baseDn,
			scope: system.SUBTREE,
			filter: '('+conf.ldap.group.rdn+'=*)',
			attrs: conf.ldap.group.rdn
		}, function(e,d) {
			d.forEach(function(obj){
				everyGroup.push(obj[conf.ldap.group.rdn].toString());
			});
			everyLength = everyGroup.length;
			
			function groupDone() {
				groupsIterated++;
				if (groupsIterated == everyLength) finish();
			}
		
			everyGroup.forEach(function(group){
				var groupDN = conf.ldap.group.rdn+'='+group+','+conf.ldap.group.baseDn;
				system.search({
					base: conf.ldap.group.baseDn,
					scope: system.SUBTREE,
					filter: '('+conf.ldap.group.rdn+'='+group+')',
					attrs: conf.ldap.group.member
				}, function(e,d){
					if (e) return cb(e);
					
					var allMembers = d[0].member,
						allIndex = allMembers.indexOf(user.dn),
						userIndex = user.memberof.indexOf(group);
						
					function updateMembers() {
						var memberObj = new Object;
						memberObj[conf.ldap.group.member] = allMembers;
						system.modify(groupDN, toLdapForm(memberObj, 'replace'), function(e){
							if (e) cb(e);
						});
					}
						
					/*if ((allIndex > -1 && userIndex > -1) || (allIndex < 0 && userIndex < 0)) // stays a member/nonmember
						log.debug('no action for '+group);*/
					if (allIndex > -1 && userIndex < 0) { // is a member, no longer a member
						log.trace('group processor: remove '+user[conf.ldap.user.username]+' from '+group);
						allMembers.splice(allIndex, 1);
						updateMembers();
					}
					else if (allIndex < 0 && userIndex > -1) { // is not a member, will become a member
						log.trace('group processor: add '+user[conf.ldap.user.username]+' to '+group);
						allMembers.push(user.dn);
						updateMembers();
					}
					groupDone();
				});
			});
		});
	
		
		function finish() {
			finished++;
			if (finished == 2) {
				exports.getUser(user[conf.ldap.user.rdn], function(e, changedUser){
					if (e) return cb(e);
					cb(e, changedUser);
				});
			}	
		}
	});
};


/* creates a user object, pushes it to LDAP, applies default groups
 * callback returns error and created user object */
exports.addUser = function(id, given, family, email, password, cb){
	if (!cb) cb = new Function;
	var calledArgs = arguments;
	connect(function(e){if (e) return cb(e);
	
		if (calledArgs.length == 5 || (calledArgs.length == 6 && typeof(cb) == 'function')) {
			
			// create a user object, which will be passed to updateUser	
			var user = new Object;
			user[conf.ldap.user.username] = id;
			user[conf.ldap.user.firstname] = given;
			user[conf.ldap.user.lastname] = family;
			user[conf.ldap.user.displayname] = given+' '+family;
			user[conf.ldap.user.email] = email;
			user[conf.ldap.user.password] = password;
			user.objectClass = conf.ldap.user.defaultObjectClass;
			user.dn = conf.ldap.user.rdn+'='+id+','+conf.ldap.user.baseDn;
					
			system.add(user.dn, toLdapForm(user, 'add'), function(e){
				if (e) return cb(e);
				
				// get the new user profile and add it to the default groups
				exports.getUser(user[conf.ldap.user.username], function(e, createdUser){
					if (e) return cb(e);
					createdUser.memberof = conf.ldap.user.defaultGroups;
					
					// update user to add the group permissions; give the new user to the caller because we're done
					exports.updateUser(createdUser, function(e, newUser){
						if (e) return cb(e);
						cb(e, newUser);
					});
				});
			});
		}
		else {
			return cb(new Error('wrong formatting of arguments'));
		}
	});
};

/* resets a user by changing their password policy to allow setting
 * w/o the old password, setting the new password, and changing the
 * user's ppolicy back
 * callback returns error */
exports.resetPassword = function(input, newPassword, cb){
	if (!cb) cb = new Function;
	
	var reset = function(userdn) {
		log.debug(userdn+': changing pwdPolicy to allow reset');
		system.search({
			base: userdn, 
			scope: system.SUBTREE,
			filter: '('+conf.ldap.user.rdn+'=*)',
			attrs: 'pwdPolicySubentry'
		}, function(e,d) {
			if (e) return cb(e);
			var neededOp = '';
			if (d[0].pwdPolicySubentry) {
				neededOp = 'replace';
				log.warn('"'+userdn+'" already has a pwdPolicySubentry attribute, which is not supposed to appear on users (!)')
			}
			else neededOp = 'add';
			
			log.info('resetting password for '+userdn);
			system.modify(userdn, [
				{op: neededOp, attr: 'pwdPolicySubentry', vals: [conf.ldap.user.passwordResetPolicy]}
			], function(e){
				if (e) return cb(e);
	
				system.modify(userdn, [
					{op: 'replace', attr: 'userPassword', vals: [newPassword]},
					{op: 'delete', attr: 'pwdPolicySubentry', vals: [conf.ldap.user.passwordResetPolicy]}
				], function(e){
					if (e) return cb(e);
					else cb();
				});
				
			});
		});
	}
	
	connect(function(e){if (e) return cb(e);
		if (input.indexOf('@') > -1) { // if email string given to reset with
			system.search({
				base: conf.ldap.user.baseDn,
				scope: system.SUBTREE,
				filter: '('+conf.ldap.user.email+'='+input+')',
				attrs: conf.ldap.user.username
			}, function(e,d) {
				if (e) return cb(e);
				userdn = d[0]['dn'].toString();
				reset(userdn);
			});
		}
		else { // if username given to reset with
			system.search({
				base: conf.ldap.user.baseDn,
				scope: system.SUBTREE,
				filter: '('+conf.ldap.user.rdn+'='+input+')',
				attrs: conf.ldap.user.username
			}, function(e,d) {
				if (e) return cb(e);
				userdn = d[0]['dn'].toString();
				reset(userdn);
			});
		}
	});
};

// tests

/*
exports.getUser('elliott', function(e, obj){
	console.log(e);
	console.log(obj);
})
*/