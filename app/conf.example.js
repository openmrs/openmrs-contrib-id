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

// valid JSON, except for RegExp's
module.exports = {
    "site": {
        "url": "http://id.openmrs.org/",
        "title": "OpenMRS ID"
    },
    "ldap": {
        "__comment": "LDAP Settings",
        "server": {
            "uri": "ldap://localhost",
            "baseDn": "ou=systemacct,dc=example",
            "rdn": "uid",
            "loginUser": "system_acct",
            "password": "secret"
        },
        "user": {
            "baseDn": "ou=users,dc=example",
            "rdn": "uid",
            "__comment": "corresponds with form input names",
            "username": "uid",
            "firstname": "cn",
            "lastname": "sn",
            "displayname": "displayName",
            "email": "mail",
            "password": "userPassword",
            "secondaryemail": "otherMailbox",
            "defaultObjectClass": [
                "inetOrgPerson",
                "extensibleObject"
            ],
            "usernameRegex": /^[a-zA-Z0-9]+$/,
            "defaultGroups": [
                "bamboo-user",
                "confluence-users",
                "dashboard-users",
                "jira-chg-requester",
                "jira-icm-assignee",
                "jira-icm-reporter",
                "jira-trunk-developer",
                "jira-users",
                "modrepo-users",
                "osqa-users"
            ],
            "passwordResetPolicy": "cn=reset,ou=policy,dc=example",
            "passwordResetTimeout": 7200000
        },
        "group": {
            "baseDn": "ou=groups,dc=example",
            "member": "member",
            "rdn": "cn"
        }
    },
    "db": {
        "dbname": "id_dashboard",
        "username": "db_user",
        "password": "secret"
    },
    "session": {
        "__comment3": "session storage DB",
        "__comment1": "session secret, used to secure session data",
        "secret": "secret",
        "__comment2": "how long until session terminates (24hr)",
        "duration": 86400000
    },
    "groups": {
        "__comment2": "Google Groups settings",
        "__comment": "hourly",
        "syncInterval": 3600000
    },
    "logger": {
        "__comment": "Log settings",
        "relativePath": "/../logs/openmrsid.log"
    },
    "validation": {
        "__comment": "Validation settings",
        "recaptchaPublic": "public_key",
        "recaptchaPrivate": "private_key",
        "allowPlusInEmail": false,
    },
    "email": {
        "__comment": "Email settings",
        "validation": {
            "emailRegex": /^[A-Za-z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
            "forceUniquePrimaryEmail": true,
            "forceUniqueSecondaryEmail": true
        },
        "smtp": {
            "host": "localhost",
            "port": 25,
            "use_authentication": false,
            "user": "postfix_user",
            "pass": "secret"
        }
    },
    "__comment": "EJS Plugs",
    "defaultSidebar": [
        "sidebar/needhelp"
    ],
    "aboutHTML": "<a href=\"/\">OpenMRS ID Dashboard</a>, v1.3.1",
    "userNavLinks": {
        "Welcome": {
			"url": "/",
			"viewName": "root",
			"visibleLoggedOut": false,
			"visibleLoggedIn": true,
			"icon": "icon-home" // corresponds with font awesome
		},
		"Sign Up": {
			"url": "/signup",
			"viewName": "signup",
			"visibleLoggedOut": true,
			"visibleLoggedIn": false,
			"icon": "icon-asterisk"
		},
		
		"Password Reset": {
			"url": "/reset",
			"viewName": "reset-public",
			"visibleLoggedOut": true,
			"visibleLoggedIn": false,
			"icon": "icon-unlock"
		},
		
		"Your Profile": {
			"url": "/edit/profile",
			"viewName": "edit-profile",
			"visibleLoggedOut": false,
			"visibleLoggedIn": true,
			"requiredGroup": "dashboard-users",
			"icon" : "icon-user",
		},
		
		"Mailing Lists": {
			"url": "/mailinglists",
			"viewName": "mailinglists",
			"visibleLoggedOut": false,
			"visibleLoggedIn": true,
			"requiredGroup": "dashboard-users",
			"icon": "icon-envelope-alt"
		},
		
		"Your Password": {
			"url": "/edit/password",
			"viewName": "edit-password",
			"visibleLoggedOut": false,
			"visibleLoggedIn": true,
			"requiredGroup": "dashboard-users",
			"icon": "icon-lock"
		}
    }
};

// expose shorthand method used by view renderers
module.exports.user = module.exports.ldap.user;
