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

var os = require("os");

module.exports = {
  "site": {
    // use full url, like http://localhost:3000/
    "url": "http://" + os.hostname() + ".use1.nitrousbox.com",
    "title": "OpenMRS ID"
  },
  "ldap": {
    // LDAP Settings

    "server": {
      "uri": "ldap://localhost:1389",
      "baseDn": "ou=system,dc=openmrs,dc=org",
      "rdn": "uid",
      "loginUser": "omrsid",
      "password": "omrsid"
    },
    "user": {
      "baseDn": "ou=users,dc=openmrs,dc=org",
      "rdn": "uid",

      // corresponds with form input names
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
      "usernameRegex": /^[a-zA-Z0-9]+[.]?[a-zA-Z0-9]+$/,
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
      "passwordResetPolicy": "cn=reset,ou=policy,dc=openmrs,dc=org",
      "passwordResetTimeout": 7200000
    },
    "group": {
      "baseDn": "ou=groups,dc=openmrs,dc=org",
      "member": "member",
      "rdn": "cn",
      "objectClass": "groupOfNames"
    }
  },
  "db": {
    "dbname": "id_dashboard",
    "username": "",
    "password": "",
    "dialect": "sqlite",
    "storage": "./id_dashboard.sqlite"
  },
  "mongo": {
    "uri": "mongodb://localhost/id_dashboard",
    "username": "omrsid",
    "password": "omrsid",
    "commonExpireTime": "2d"
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

    // hourly
    "syncInterval": 3600000
  },
  "logger": {
    // Log settings

    "relativePath": "/../logs/openmrsid.log"
  },
  "validation": {
    "__comment": "Validation settings",
    "recaptchaPublic": "6LeSlv4SAAAAADYxgJCjvRmp8FWd9R-UWmxQoWjw",
    "recaptchaPrivate": "6LeSlv4SAAAAAN2nQu_IiMCdRxwYMYbvG4027fuQ ",
    // The above key is distributed only for development purposes, and is
    // restricted to this domain.
    "allowPlusInEmail": true,
  },
  "email": {
    // Email settings

    "validation": {
      "emailRegex": /^[A-Za-z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
      "forceUniquePrimaryEmail": true,
      "forceUniqueSecondaryEmail": true
    },
    "smtp": {
      "host": "localhost",
      "port": 1025,
      "use_authentication": false,
      "user": "",
      "pass": ""
    }
  },

  // EJS Plugs
  "defaultSidebar": [
    "sidebar/needhelp"
  ],

  // displays at bottom of sidebar
  "aboutHTML": "<a href=\"/\">OpenMRS ID Dashboard</a>, v" + require("../package").version,

  // system modules
  "systemModules": [
    "admin",
    "signup",
    "auth",
    "profile",
    "reset-pwd",
    "db-admin",
  ],

  // user-configured modules
  "userModules": [
    "openmrs-contrib-id-groups",
    "openmrs-contrib-id-styleguide"
  ],

  // a exceptionlists of session middlware, use regular expressions
  "sessionExceptions": [
    /^\/globalnav($|\/.*$)/,
    /^\/resource\/.*$/,
  ],
};

// expose shorthand method used by view renderers
module.exports.user = module.exports.ldap.user;
