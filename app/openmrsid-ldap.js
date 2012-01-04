/* OPENMRSID-LDAP.JS
 * TODO FOR RELEASE:
 * - nothing
 */
var LDAPServer = require('../node-LDAP/LDAP').Connection,
	system = new LDAPServer(), // system-bind operations (usual operations)
	userbinds = new Object, // object of user-bind connections (auths and password changes)
	log = require('./logger').add('ldap'),
	conf = require('./conf'),
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
			
		obj.type = attr;
		if (typeof user[attr] == 'object') obj.vals = user[attr];
		else obj.vals = [user[attr].toString()];
		out.push(obj);
	}
	
	return out;
}

function systemTimeout() {
	systemTimeoutNode = setTimeout(function(){log.debug('system connection closing');system.close()}, 60000);
}

function connect(cb){
	if (systemTimeoutNode && systemTimeoutNode._idlePrev) clearTimeout(systemTimeoutNode);
	if (typeof(cb)!='function') cb = new Function;
	
	try {
		system.search(conf.ldap.server.baseDn, system.SUBTREE, '('+conf.ldap.server.rdn+'='+conf.ldap.server.loginUser+')', conf.ldap.server.rdn, function(m,e,d) {
			if (e && e.message == 'Request timed out') {
				return(e);		
			}	
			else if (e) { // not connected
				log.debug('no server connection, will reconnect')
				
				
				var server = system.open(conf.ldap.server.uri);
				if (server == 0) {
					system.simpleBind(conf.ldap.server.rdn+'='+conf.ldap.server.loginUser+','+conf.ldap.server.baseDn, conf.ldap.server.password, function(m, e){
						if (e) return cb(e);
						log.debug('system bind successful, retrying connection');
						cb();
						systemTimeout();
					});
				}
				else {
					return cb(new Error('Unable to connect to LDAP'));
				}
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



// // // // // // // // // // USER-BOUND FUNCTIONS // // // // // // // // // //

/* authenticates user to a new LDAP Connection, immediately disconnects on success
 * callback passes error */
exports.authenticate = function(user, pass, cb) {
	if (!cb) cb = new Function;
	
	var userdn = conf.ldap.user.rdn+'='+user+','+conf.ldap.user.baseDn;
	userbinds[user] = new LDAPServer();
	var server = userbinds[user].open(conf.ldap.server.uri);
	
	if (server == 0) {
		userbinds[user].simpleBind(userdn, pass, function(m,e){
			if (e) return cb(e);			
			cb(e);
		});
	}
}

exports.close = function(user) {
	if (typeof(user)=='object') user = user[conf.ldap.user.rdn];
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
				{op: 'delete', type: conf.ldap.user.password, vals: [oldPass]},
				{op: 'add', type: conf.ldap.user.password, vals: [newPass]}
			], function(m,e){
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
		if (e) return cb(e);
	
		// allows only valid names to be searched for
		if ( !conf.ldap.user.usernameRegex.exec(user) ) return cb(new Error('Illegal username specified'));
		
		else {
			var completed = 0, userobj = new Object, groups = new Array;
			
			// get user profile
			system.search(conf.ldap.user.baseDn, system.SUBTREE, '('+conf.ldap.user.rdn+'='+user+')',
			conf.ldap.user.username+' '+conf.ldap.user.firstname+' '+conf.ldap.user.lastname+' '+conf.ldap.user.displayname+' '+
			conf.ldap.user.email+' '+conf.ldap.user.secondaryemail+' objectClass', function(m,e,d){
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
			system.search(conf.ldap.group.baseDn, system.SUBTREE, '('+conf.ldap.group.member+'='+conf.ldap.user.rdn+'='+user+','+conf.ldap.user.baseDn+')', conf.ldap.group.rdn, function(m,e,d){
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
		system.search(conf.ldap.user.baseDn, system.SUBTREE, '('+conf.ldap.user.email+'='+email+')', conf.ldap.user.username, function(m,e,d) {
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
		system.modify(user.dn, toLdapForm(user, 'replace'), function(m,e){
			if (e) return cb(e);
			finish();
		});
		
		// parse groups in object; update groups for user by comparing userobj's groups with their groups in the server		
		system.search(conf.ldap.group.baseDn, system.SUBTREE, '('+conf.ldap.group.rdn+'=*)', conf.ldap.group.rdn, function(m,e,d) {
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
				system.search(conf.ldap.group.baseDn, system.SUBTREE, '('+conf.ldap.group.rdn+'='+group+')', conf.ldap.group.member, function(m,e,d){
					if (e) return cb(e);
					
					var allMembers = d[0].member,
						allIndex = allMembers.indexOf(user.dn),
						userIndex = user.memberof.indexOf(group);
						
					function updateMembers() {
						var memberObj = new Object;
						memberObj[conf.ldap.group.member] = allMembers;
						system.modify(groupDN, toLdapForm(memberObj, 'replace'), function(m, e){
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
					
			system.add(user.dn, toLdapForm(user, 'add'), function(m,e){
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
	
	function reset(userdn) {
		log.debug(userdn);
		system.search(userdn, system.SUBTREE, '('+conf.ldap.user.rdn+'=*)', 'pwdPolicySubentry', function(m,e,d) {
			if (e) return cb(e);
			if (d[0].pwdPolicySubentry) {
				neededOp = 'replace';
				log.warn('"'+userdn+'" already has a pwdPolicySubentry attribute, which is not supposed to happen on users (!)')
			}
			else neededOp = 'add';
			
			log.debug('resetting password for '+userdn);
			system.modify(userdn, [
				{op: 'add', type: 'pwdPolicySubentry', vals: [conf.ldap.user.passwordResetPolicy]}
			], function(m, e){
				if (e) return cb(e);
	
				system.modify(userdn, [
					{op: 'replace', type: 'userPassword', vals: [newPassword]},
					{op: 'delete', type: 'pwdPolicySubentry', vals: [conf.ldap.user.passwordResetPolicy]}
				], function(m, e){
					if (e) return cb(e);
					else cb();
				});
				
			});
		});
	}
	
	connect(function(e){if (e) return cb(e);
		if (input.indexOf('@') > -1) {
			system.search(conf.ldap.user.baseDn, system.SUBTREE, '('+conf.ldap.user.email+'='+input+')', conf.ldap.user.username, function(m,e,d) {
				if (e) return cb(e);
				userdn = d[0]['dn'].toString();
				reset(userdn);
			});
		}
		else {
			system.search(conf.ldap.user.baseDn, system.SUBTREE, '('+conf.ldap.user.rdn+'='+input+')', conf.ldap.user.username, function(m,e,d) {
				if (e) return cb(e);
				userdn = d[0]['dn'].toString();
				reset(userdn);
			});
		}
	});
};