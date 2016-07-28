'use strict';
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

var ldap = require('ldapjs');
var async = require('async');
var _ = require('lodash');
var log = require('log4js').addLogger('ldap');

var conf = require('./conf');
var serverAttr = conf.ldap.server;
var userAttr = conf.ldap.user;
var groupAttr = conf.ldap.group;


// ldap connection url
var url = serverAttr.uri;

var systemDN = serverAttr.rdn + '=' + serverAttr.loginUser + ',' +
  serverAttr.baseDn;
var bindCredentials = serverAttr.password;

// LDAP client used for general operation
var client = ldap.createClient({
  url: url,
  maxConnections: 10,
  bindDN: systemDN,
  bindCredentials: bindCredentials,
  // timeout: ,
  // connectTimeout: ,
});

/* Private helper functions */

// Convert a normal user object into proper ldap form **with out groups**
// and check the types of the user's attributes,
// throw out an error if anything is wrong.
var checkAndConvert = function (user) {
  var invalid = (!_.isString(user.username) || !_.isString(user.password) ||
    !_.isString(user.firstName) || !_.isString(user.lastName) ||
    !_.isString(user.displayName || !_.isString(user.primaryEmail)));

  if (invalid) {
    throw new Error('The user object is invalid with ' + user);
  }
  var ret = {};
  ret[userAttr.username] = user.username;
  ret[userAttr.firstname] = user.firstName;
  ret[userAttr.lastname] = user.lastName;
  ret[userAttr.displayname] = user.displayName;
  ret[userAttr.email] = user.primaryEmail;
  ret[userAttr.password] = user.password;
  ret.objectClass = userAttr.defaultObjectClass;
  return ret;
};

// get the raw LDAP entry
var searchRaw = function (username, attributes, cb) {
  if (!_.isArray(attributes)) {
    attributes = [attributes];
  }
  var getAll = username === '*';
  var base = getAll ? userAttr.baseDn : 'uid=' + username + ',' + userAttr.baseDn;
  var options = {
    scope: getAll ? 'sub': 'base',
    attributes: attributes,
  };

  client.search(base, options, function (err, res) {
    if (err) {
      return cb(err);
    }
    var ret = [];
    res.on('searchEntry', function (entry) {
      ret.push(entry.object);
    });
    res.on('error', function(err) {
      if (err.code === 32) { // not found, no such dn
        return cb(null, null);
      }
      log.error('error: ' + err.message);
      return cb(err);
    });
    res.on('end', function(result) {
      log.debug('ldap search ended with status: ' + result.status);
      if (!ret.length) {
        return cb(null, null);
      }
      else if (ret.length === 1) {
        return cb(null, ret[0]);
      }
      else {
        return cb(null, _.filter(ret, function(item) {
          return item.uid;
        }));
      }
    });
  });
};

var convertUser = function(old) {
  var user = {};
  user.username = old[userAttr.username];
  user.password = old[userAttr.password];
  user.firstName = old[userAttr.firstname];
  user.lastName = old[userAttr.lastname];
  user.displayName = old[userAttr.displayname];
  user.primaryEmail = old[userAttr.email];
  return user;
};

// Helper function that searches the user records in LDAP.
var searchUser = function (username, cb) {
  var attributes = [
    userAttr.username,
    userAttr.firstname,
    userAttr.lastname,
    userAttr.displayname,
    userAttr.email,
    userAttr.password,
    // userAttr.secondaryemail,     // we don't use this in LDAP
    // 'objectClass',               // it's useless outside LDAP
  ];
  searchRaw(username, attributes, function (err, old) {
    if (err) {
      return cb(err);
    }
    if (_.isEmpty(old)) {
      return cb(null, null);
    }
    else if (_.isArray(old)) {
      async.map(old, function (el, callback) {
        callback(null, convertUser(el));
      }, function(err, users) {
        return cb(null, users)
      })
    }
    else {
      return cb(null, convertUser(old));
    }
  });
};

// Helper function that gets the groups that the user belongs to
var searchGroups = function (username, cb) {
  var base = groupAttr.baseDn;
  var options = {
    filter: '(' + groupAttr.member + '=' + userAttr.rdn + '=' + username +
      ',' + userAttr.baseDn + ')',
    scope: 'sub',
    attributes: [ groupAttr.rdn ],
  };

  client.search(base, options, function (err, res) {
    if (err) {
      return cb(err);
    }
    var groups = [];
    res.on('searchEntry', function (entry) {
      groups.push(entry.object[groupAttr.rdn]);
    });
    res.on('error', function (err) {
      log.error(err);
      return cb(err);
    });
    res.on('end', function (result) {
      log.debug('ldap search ended with status: ' + result.status);
      return cb(null, groups);
    });
  });
};

/* Public API functions */

/**
 * Authenticates user to LDAP
 * @param  {string}   username  User's username
 * @param  {string}   pass      User's password in cleartext (maybe unsafe)
 * @param  {Function} cb        cb(err)
 */
exports.authenticate = function (username, pass, cb) {
  log.debug(username + ': will authenticate');
  // client used for authenticating users specially
  var userClient = ldap.createClient({
    url: url,
  });
  var userdn = userAttr.rdn + '=' + username + ',' + userAttr.baseDn;
  userClient.bind(userdn, pass, function (err) {
    userClient.unbind();
    return cb(err);
  });
};


/**
 * Get a user's info from LDAP server based on the username
 * @param  {string}   username  User's username
 * @param  {Function} cb        cb(err, user)
 */
exports.getUser = function (username, cb) {
  log.debug('check validity of username ' + username);
  if (!userAttr.usernameRegex.test(username)) {
    return cb(new Error('Illegal username specified'));
  }

  async.parallel([
    searchUser.bind(null, username),
    searchGroups.bind(null, username),
  ], function (err, results) {
    if (err) {
      return cb(err);
    }
    var user = results[0];
    var groups = results[1];
    if (_.isEmpty(user)) {
      log.debug('user: ' + username + ' not found');
      return cb(null, null);
    }
    user.groups = groups;
    return cb(null, user);
  });
};

/**
 * Get users list from LDAP
 * @param {Function} cb cb(err, users)
 */
exports.getAllUsers = function(cb) {
  return searchUser('*', function(err, users) {
    if (users && !_.isArray(users)) {
      return cb(err, [users]);
    }
    else {
      return cb(err, users);
    }
  });
};


// Get the changes used for updating a user
// Note that the username and password couldn't be changed this way
var getChanges = function (newUser, oldUser) {
  var ret = [];
  var attrs = ['firstName', 'lastName', 'displayName', 'primaryEmail',];
  var ldapNames = [userAttr.firstname, userAttr.lastname, userAttr.displayname,
                 userAttr.email, ];
  for (var i = 0; i < attrs.length; ++i) {
    var attr = attrs[i];
    var ldapAttr= ldapNames[i];
    var item = {
      modification: {},
    };

    if (_.isEmpty(oldUser[attr]) && !_.isEmpty(newUser)) {
      // this should be impossible in normal condtion
      item.operation = 'add';
    } else if (oldUser[attr] === newUser[attr]) { //same
      continue;
    } else {
      item.operation = 'replace';
    }
    item.modification[ldapAttr] = newUser[attr];
    ret.push(item);
  }
  return ret;
};

/**
 * Update a existing user's memberships
 * @param  {Object}   user valid user object
 * @param  {Function} cb   cb(err, newUser)
 */
exports.updateUser = function (user, cb) {
  // first check the validity
  checkAndConvert(user);
  var userDn = userAttr.rdn + '=' + user.username + ',' + userAttr.baseDn;

  // get the differences
  var diff = function (oldUser, next)  {
    var oldGroups = oldUser.groups;
    var added = _.difference(user.groups, oldGroups);
    var removed = _.difference(oldGroups, user.groups);
    var changes = getChanges(user, oldUser);
    return next(null, changes, added, removed);
  };

  var updateU = function (changes, added, removed, next) {
    if (_.isEmpty(changes)) {
      return next(null, added, removed);
    }
    client.modify(userDn, changes, function (err) {
      if (err) {
        return next(err);
      }
      return next(null, added, removed);
    });
  };

  // update the groups
  var operateOnGroups = function (groups, change, callback) {
    async.each(groups, function (group, next) {
      var groupDn = groupAttr.rdn + '=' + group + ',' + groupAttr.baseDn;
      client.modify(groupDn, change, next);
    }, callback);
  };

  var updateG = function (added, removed, next) {
    // add
    var addChange = {
      operation: 'add',
      modification: {},
    };
    addChange.modification[groupAttr.member] = userDn;
    // remove
    var removeChange = {
      operation: 'delete',
      modification: {},
    };
    removeChange.modification[groupAttr.member] = userDn;
    async.parallel([
      operateOnGroups.bind(null, added, addChange),
      operateOnGroups.bind(null, removed, removeChange),
    ], next);
  };

  async.waterfall([
    exports.getUser.bind(null, user.username),
    diff,
    updateU,
    updateG,
  ], function (err) {
    if (err) {
      return cb(err);
    }
    exports.getUser(user.username, cb);
  });
};

/**
 * Add a user into LDAP
 * @param {Object}   user Valid user object with neccessary attributes
 *                        i.e. username, password, firstName, lastName
 *                        displayName, primaryEmail, groups.
 *                        It will report error when the username or primaryEmail
 *                        is invalid.
 * @param {Function} cb   cb(err, newUser), newUser with groups
 */
exports.addUser = function (user, cb) {
  var userobj = checkAndConvert(user);
  if (!userAttr.usernameRegex.test(user.username)) {
    return cb(new Error('Illegal username specified'));
  }
  if (!conf.email.validation.emailRegex.test(user.primaryEmail)) {
    return cb(new Error('Illegal email specified'));
  }

  var dn = userAttr.rdn + '=' + user.username + ',' + userAttr.baseDn;

  async.waterfall([
    function (next) {
      client.add(dn, userobj, function (err) {
        return next(err);
      });
    },
    exports.updateUser.bind(null, user),
  ], cb);
};

/**
 * Delete a user and its relevent memberships records
 * @param  {string}   username a valid username
 * @param  {Function} cb       cb(err)
 */
exports.deleteUser = function (username, cb) {
  async.waterfall([
    exports.getUser.bind(null, username),
    function check(user, next) {
      if (!user) {
        return cb(null);
      }
      return next(null, user);
    },
    function updateGroups (user, next) {
      if (!user) {
        return next(null);
      }
      user.groups = [];
      exports.updateUser(user, next);
    },
    function delUser(user, next) {
      var dn = userAttr.rdn + '=' + user.username + ',' + userAttr.baseDn;
      client.del(dn, next);
    },
  ], cb);
};

/**
 * Reset a new password for a specified user
 * @param  {string}   username A valid username
 * @param  {Function} cb       cb(err)
 */
exports.resetPassword = function (username, newPass, cb) {
  if (!userAttr.usernameRegex.test(username)) {
    return cb(new Error('Illegal username specified'));
  }

  // first check the existence
  var search = function (next) {
    searchRaw(username, 'pwdPolicySubentry', function (err, user) {
      if (err) {
        return next(err);
      }
      return next(null, user);
    });
  };

  var modifyPolicy = function (entry, next) {
    var change = {
      modification: {
        pwdPolicySubentry: userAttr.passwordResetPolicy,
      },
    };
    if (entry.pwdPolicySubentry) {
      log.warn('"' + username + '" already has a pwdPolicySubentry attribute,' +
        ' which is not supposed to appear on users (!)');
      change.operation = 'replace';
    } else {
      change.operation = 'add';
    }

    client.modify(entry.dn, change, function (err) {
      if (err) {
        return next(err);
      }
      return next(null, entry.dn);
    });
  };

  var update = function (userdn, next) {
    var changes = [
      {
        operation: 'replace',
        modification: {
          userPassword: newPass,
        },
      },
      {
        operation: 'delete',
        modification: {
          pwdPolicySubentry: userAttr.passwordResetPolicy,
        },
      },
    ];

    client.modify(userdn, changes, function (err) {
      return next(err);
    });
  };

  async.waterfall([
    search,
    modifyPolicy,
    update,
  ], cb);
};

/**
 * Add lock time attribute for a user
 * @param  {string}   username valid username
 * @param  {Function} cb       cb(err)
 */
exports.lockoutUser = function (username, cb) {
  // find the user
  var search = function (next) {
    searchRaw(username, 'pwdAccountLockedTime', function (err, user) {
      if (err) {
        return next(err);
      }
      return next(null, user);
    });
  };

  var modify = function (userobj, next) {
    if (userobj.pwdAccountLockedTime) {
      log.debug(username + ' is already locked');
      return cb();
    }
    var userdn = userAttr.rdn + '=' + username + ',' + userAttr.baseDn;
    var change = {
      operation: 'add',
      modification: {
        pwdAccountLockedTime: '000001010000Z', // lock user permanently
      },
    };
    client.modify(userdn, change, function (err) {
      return next(err);
    });
  };

  async.waterfall([
    search,
    modify,
  ], cb);
};

/**
 * Unlock a user
 * @param  {string}   username
 * @param  {Function} cb       cb(err)
 */
exports.enableUser = function (username, cb) {
  // find the user
  var search = function (next) {
    searchRaw(username, 'pwdAccountLockedTime', function (err, user) {
      if (err) {
        return next(err);
      }
      return next(null, user);
    });
  };

  var modify = function (userobj, next) {
    if (_.isEmpty(userobj.pwdAccountLockedTime)) {
      log.debug(username + ' is not locked');
      return cb();
    }
    var userdn = userAttr.rdn + '=' + username + ',' + userAttr.baseDn;
    var change = {
      operation: 'delete',
      modification: {
        pwdAccountLockedTime: [],
      },
    };
    client.modify(userdn, change, function (err) {
      return next(err);
    });
  };

  async.waterfall([
    search,
    modify,
  ], cb);
};


/**
 * Add a group into LDAP
 * @param {object}   options    {groupName: ... , description: ... }
 * @param {Function} callback   callback(err)
 */
exports.addGroup = function (options, callback) {
  if (_.isEmpty(options.groupName)) {
    throw new Error('missing groupName');
  }
  log.info('adding group ' + options.groupName + ' to LDAP');
  var entry = {
    cn: options.groupName,
    objectClass: groupAttr.objectClass,
    member: [''],
  };
  if (!_.isEmpty(options.description)) {
    entry.description = options.description;
  }

  var dn = groupAttr.rdn + '=' + options.groupName + ',' + groupAttr.baseDn;
  client.add(dn, entry, callback);
};

exports.getAllUsers(function(err, users) {
  console.log(users)
})
