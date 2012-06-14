/* NEEDS MODIFICATION / PLEASE UPDATE ME */

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

module.exports = {
site: {
	url: "http://localhost:3000/",
	title: "OpenMRS ID"
},

// LDAP settings
ldap: {
	server: {
		uri: "ldap://localhost:389",
		baseDn: "dc=example,dc=com", // hierarchy above system account's DN
		rdn: "uid", // unique portion of the system account's DN
		loginUser: "system_account_user",
		password: "secret",
	},
	user: {
		baseDn: "ou=users,dc=example,dc=com", // hierarchy above a user's DN
		rdn: "uid", // unique portion of a user's DN
		
		// corresponds with form input names
		username: "uid",
		firstname: "cn",
		lastname: "sn",
		displayname: "displayName",
		email: "mail",
		password: "userPassword",
		secondaryemail: "otherMailbox",
		
		defaultObjectClass: ["inetOrgPerson"],
		usernameRegex: /^[a-zA-Z0-9]+$/, // validation regex for new users
		defaultGroups:
			["bamboo-user",
			 "confluence-users",
			 "dashboard-users",
			 "jira-chg-requester",
			 "jira-icm-assignee",
			 "jira-icm-reporter",
			 "jira-trunk-developer",
			 "jira-users",
			 "modrepo-users",
			 "osqa-users"],
		passwordResetPolicy: "cn=reset,ou=policy,dc=example,dc=com", // password policy when password is being reset (as opposed to default)
		passwordResetTimeout: 7200000,
	},
	group: {
		baseDn: "ou=groups,dc=example,dc=com",
		member: "member",
		rdn: "cn"
	},
},

db: {
	dbname: "id_dashboard_session",
	username: "db_user",
	password: "secret",
}
// session storage & session DB
session: {
	// session secret, used to secure session data
	secret: "secret"
	duration: 1000*60*60*24, // time before session terminates
},


//Google Groups Settings
groups: {
	syncInterval: 1000*60*60, // hourly
},


// Log settings
logger: {
	relativePath: '/../logs/openmrsid.log'
},


// Validation settings
validation: {
	recaptchaPublic: "public_key",
	recaptchaPrivate: "private_key",
},


// Email settings
email: {
	validation: {
		emailRegex: /^[A-Za-z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
		forceUniquePrimaryEmail: true,
		forceUniqueSecondaryEmail: true,
	},
	smtp: {
		host: 'localhost',
	    port: 25,
	    use_authentication: false,
	    user: 'postfix_user',
	    pass: 'secret'
	}
},


// EJS Plugs
defaultSidebar: ["sidebar/needhelp"],
aboutHTML: "<a href=\"/\">OpenMRS ID Dashboard</a>, v1.2",


// User navigation bar links
userNavLinks: {
	// Links for not-logged-in sessions
	"Welcome": {
		"url": "/",
		"viewName": "root",
		"visibleLoggedOut": false,
		"visibleLoggedIn": true
	},
	"Sign Up": {
		"url": "/signup",
		"viewName": "signup",
		"visibleLoggedOut": true,
		"visibleLoggedIn": false
	},

	"Password Reset": {
		"url": "/reset",
		"viewName": "reset-public",
		"visibleLoggedOut": true,
		"visibleLoggedIn": false
	},
	
	"Your Profile": {
		"url": "/edit/profile",
		"viewName": "edit-profile",
		"visibleLoggedOut": false,
		"visibleLoggedIn": true,
		"requiredGroup": "dashboard-users"
	},
	
	"Your Password": {
		"url": "/edit/password",
		"viewName": "edit-password",
		"visibleLoggedOut": false,
		"visibleLoggedIn": true,
		"requiredGroup": "dashboard-users"
	}
}
};

// expose shorthand method used by view renderers
module.exports.user = module.exports.ldap.user;
