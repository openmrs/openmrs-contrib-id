/* CONF.JS
 * TODO FOR RELEASE:
 * - nothing
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
		passwordResetPolicy: "cn=reset,ou=policy,dc=example,dc=com" // password policy when password is being reset (as opposed to default)
	},
	group: {
		baseDn: "ou=groups,dc=example,dc=com",
		member: "member",
		rdn: "cn"
	},
},


// session storage & session DB
session: {
	dbname: "id_dashboard_session",
	username: "db_user",
	password: "secret",
	// session secret, used to secure session data
	secret: "secret"
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
	
	"Edit Profile": {
		"url": "/edit/profile",
		"viewName": "edit-profile",
		"visibleLoggedOut": false,
		"visibleLoggedIn": true,
		"requiredGroup": "dashboard-users"
	},
	
	"Change Password": {
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
