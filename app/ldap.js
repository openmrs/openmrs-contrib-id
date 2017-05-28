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

const ldap = require('ldapjs');
const async = require('async');
const _ = require('lodash');
const log = require('log4js').addLogger('ldap');

const conf = require('./conf');
const serverAttr = conf.ldap.server;
const userAttr = conf.ldap.user;
const groupAttr = conf.ldap.group;


// ldap connection url
const url = serverAttr.uri;

const systemDN = `${serverAttr.rdn}=${serverAttr.loginUser},${serverAttr.baseDn}`;
const bindCredentials = serverAttr.password;

// LDAP client used for general operation
const client = ldap.createClient({
  url: url,
  maxConnections: 10,
  bindDN: systemDN,
  bindCredentials: bindCredentials,
  queueDisable: true, //fail fast when connections times out. https://github.com/mcavage/node-ldapjs/issues/328
  reconnect: { // tries to reconnect if LDAP server is down. https://github.com/mcavage/node-ldapjs/issues/403
    initialDelay: 100,
    maxDelay: 500,
    failAfter: Infinity,
  },
});

/* Private helper functions */

// Convert a normal user object into proper ldap form **with out groups**
// and check the types of the user's attributes,
// throw out an error if anything is wrong.
const checkAndConvert = user => {
  const invalid = (!_.isString(user.username) || !_.isString(user.password) ||
    !_.isString(user.firstName) || !_.isString(user.lastName) ||
    !_.isString(user.displayName || !_.isString(user.primaryEmail)));

  if (invalid) {
    throw new Error(`The user object is invalid with ${user}`);
  }
  const ret = {};
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
const searchRaw = (username, attributes, cb) => {
  if (!_.isArray(attributes)) {
    attributes = [attributes];
  }
  const getAll = username === '*';
  const base = getAll ? userAttr.baseDn : `uid=${username},${userAttr.baseDn}`;
  const options = {
    scope: getAll ? 'sub' : 'base',
    attributes: attributes,
  };

  client.search(base, options, (err, res) => {
    if (err) {
      return cb(err);
    }
    const ret = [];
    res.on('searchEntry', entry => {
      ret.push(entry.object);
    });
    res.on('error', err => {
      if (err.code === 32) { // not found, no such dn
        return cb(null, null);
      }
      log.error(`error: ${err.message}`);
      return cb(err);
    });
    res.on('end', result => {
      log.debug(`ldap search ended with status: ${result.status}`);
      if (!ret.length) {
        return cb(null, null);
      } else if (ret.length === 1) {
        return cb(null, ret[0]);
      } else {
        return cb(null, _.filter(ret, item => item.uid));
      }
    });
  });
};

const convertUser = old => {
  const user = {};
  user.username = old[userAttr.username];
  user.password = old[userAttr.password];
  user.firstName = old[userAttr.firstname];
  user.lastName = old[userAttr.lastname];
  user.displayName = old[userAttr.displayname];
  user.primaryEmail = old[userAttr.email];
  return user;
};

// Helper function that searches the user records in LDAP.
const searchUser = (username, cb) => {
  const attributes = [
    userAttr.username,
    userAttr.firstname,
    userAttr.lastname,
    userAttr.displayname,
    userAttr.email,
    userAttr.password,
  ];
  searchRaw(username, attributes, (err, old) => {
    if (err) {
      return cb(err);
    }
    if (_.isEmpty(old)) {
      return cb(null, null);
    } else if (_.isArray(old)) {
      async.map(old, (el, callback) => {
        callback(null, convertUser(el));
      }, (err, users) => cb(null, users))
    } else {
      return cb(null, convertUser(old));
    }
  });
};

// Helper function that gets the groups that the user belongs to
const searchGroups = (username, cb) => {
  const base = groupAttr.baseDn;
  const options = {
    filter: `(${groupAttr.member}=${userAttr.rdn}=${username},${userAttr.baseDn})`,
    scope: 'sub',
    attributes: [groupAttr.rdn],
  };

  client.search(base, options, (err, res) => {
    if (err) {
      return cb(err);
    }
    const groups = [];
    res.on('searchEntry', entry => {
      groups.push(entry.object[groupAttr.rdn]);
    });
    res.on('error', err => {
      log.error(err);
      return cb(err);
    });
    res.on('end', result => {
      log.debug(`ldap search ended with status: ${result.status}`);
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
exports.authenticate = (username, pass, cb) => {
  log.debug(`${username}: will authenticate`);
  // client used for authenticating users specially
  const userClient = ldap.createClient({
    url: url,
  });
  const userdn = `${userAttr.rdn}=${username},${userAttr.baseDn}`;
  userClient.bind(userdn, pass, err => {
    userClient.unbind();
    return cb(err);
  });
};


/**
 * Get a user's info from LDAP server based on the username
 * @param  {string}   username  User's username
 * @param  {Function} cb        cb(err, user)
 */
exports.getUser = (username, cb) => {
  log.debug(`check validity of username ${username}`);
  if (!userAttr.usernameRegex.test(username)) {
    return cb(new Error('Illegal username specified'));
  }

  async.parallel([
    searchUser.bind(null, username),
    searchGroups.bind(null, username),
  ], (err, results) => {
    if (err) {
      return cb(err);
    }
    const user = results[0];
    const groups = results[1];
    if (_.isEmpty(user)) {
      log.debug(`user: ${username} not found`);
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
exports.getAllUsers = cb => searchUser('*', (err, users) => {
  if (users && !_.isArray(users)) {
    user = [users];
  }
  async.map(users, (user, callback) => {
    if (user.username) {
      searchGroups(user.username, (err, groups) => {
        user.groups = groups;
        callback(null, user);
      });
    } else {
      callback();
    }
  }, (err, results) => {
    cb(err, _.reject(results, el => !el));
  });
});


// Get the changes used for updating a user
// Note that the username and password couldn't be changed this way
const getChanges = (newUser, oldUser) => {
  const ret = [];
  const attrs = ['firstName', 'lastName', 'displayName', 'primaryEmail', ];
  const ldapNames = [userAttr.firstname, userAttr.lastname, userAttr.displayname,
    userAttr.email,
  ];
  for (let i = 0; i < attrs.length; ++i) {
    const attr = attrs[i];
    const ldapAttr = ldapNames[i];
    const item = {
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
exports.updateUser = (user, cb) => {
  // first check the validity
  checkAndConvert(user);
  const userDn = `${userAttr.rdn}=${user.username},${userAttr.baseDn}`;

  // get the differences
  const diff = (oldUser, next) => {
    const oldGroups = oldUser.groups;
    const added = _.difference(user.groups, oldGroups);
    const removed = _.difference(oldGroups, user.groups);
    const changes = getChanges(user, oldUser);
    return next(null, changes, added, removed);
  };

  const updateU = (changes, added, removed, next) => {
    if (_.isEmpty(changes)) {
      return next(null, added, removed);
    }
    client.modify(userDn, changes, err => {
      if (err) {
        return next(err);
      }
      return next(null, added, removed);
    });
  };

  // update the groups
  const operateOnGroups = (groups, change, callback) => {
    async.each(groups, (group, next) => {
      const groupDn = `${groupAttr.rdn}=${group},${groupAttr.baseDn}`;
      client.modify(groupDn, change, next);
    }, callback);
  };

  const updateG = (added, removed, next) => {
    // add
    const addChange = {
      operation: 'add',
      modification: {},
    };
    addChange.modification[groupAttr.member] = userDn;
    // remove
    const removeChange = {
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
  ], err => {
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
exports.addUser = (user, cb) => {
  const userobj = checkAndConvert(user);
  if (!userAttr.usernameRegex.test(user.username)) {
    return cb(new Error('Illegal username specified'));
  }
  if (!conf.email.validation.emailRegex.test(user.primaryEmail)) {
    return cb(new Error('Illegal email specified'));
  }

  const dn = `${userAttr.rdn}=${user.username},${userAttr.baseDn}`;

  async.waterfall([
    next => {
      client.add(dn, userobj, err => next(err));
    },
    exports.updateUser.bind(null, user),
  ], cb);
};

/**
 * Delete a user and its relevent memberships records
 * @param  {string}   username a valid username
 * @param  {Function} cb       cb(err)
 */
exports.deleteUser = (username, cb) => {
  async.waterfall([
    exports.getUser.bind(null, username),
    function check(user, next) {
      if (!user) {
        return cb(null);
      }
      return next(null, user);
    },
    function updateGroups(user, next) {
      if (!user) {
        return next(null);
      }
      user.groups = [];
      exports.updateUser(user, next);
    },
    function delUser(user, next) {
      const dn = `${userAttr.rdn}=${user.username},${userAttr.baseDn}`;
      client.del(dn, next);
    },
  ], cb);
};

/**
 * Reset a new password for a specified user
 * @param  {string}   username A valid username
 * @param  {Function} cb       cb(err)
 */
exports.resetPassword = (username, newPass, cb) => {
  if (!userAttr.usernameRegex.test(username)) {
    return cb(new Error('Illegal username specified'));
  }

  // first check the existence
  const search = next => {
    searchRaw(username, 'pwdPolicySubentry', (err, user) => {
      if (err) {
        return next(err);
      }
      return next(null, user);
    });
  };

  const modifyPolicy = (entry, next) => {
    const change = {
      modification: {
        pwdPolicySubentry: userAttr.passwordResetPolicy,
      },
    };
    if (entry.pwdPolicySubentry) {
      log.warn(`"${username}" already has a pwdPolicySubentry attribute, which is not supposed to appear on users (!)`);
      change.operation = 'replace';
    } else {
      change.operation = 'add';
    }

    client.modify(entry.dn, change, err => {
      if (err) {
        return next(err);
      }
      return next(null, entry.dn);
    });
  };

  const update = (userdn, next) => {
    const changes = [{
      operation: 'replace',
      modification: {
        userPassword: newPass,
      },
    }, {
      operation: 'delete',
      modification: {
        pwdPolicySubentry: userAttr.passwordResetPolicy,
      },
    }, ];

    client.modify(userdn, changes, err => next(err));
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
exports.lockoutUser = (username, cb) => {
  // find the user
  const search = next => {
    searchRaw(username, 'pwdAccountLockedTime', (err, user) => {
      if (err) {
        return next(err);
      }
      return next(null, user);
    });
  };

  const modify = (userobj, next) => {
    if (userobj.pwdAccountLockedTime) {
      log.debug(`${username} is already locked`);
      return cb();
    }
    const userdn = `${userAttr.rdn}=${username},${userAttr.baseDn}`;
    const change = {
      operation: 'add',
      modification: {
        pwdAccountLockedTime: '000001010000Z', // lock user permanently
      },
    };
    client.modify(userdn, change, err => next(err));
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
exports.enableUser = (username, cb) => {
  // find the user
  const search = next => {
    searchRaw(username, 'pwdAccountLockedTime', (err, user) => {
      if (err) {
        return next(err);
      }
      return next(null, user);
    });
  };

  const modify = (userobj, next) => {
    if (_.isEmpty(userobj.pwdAccountLockedTime)) {
      log.debug(`${username} is not locked`);
      return cb();
    }
    const userdn = `${userAttr.rdn}=${username},${userAttr.baseDn}`;
    const change = {
      operation: 'delete',
      modification: {
        pwdAccountLockedTime: [],
      },
    };
    client.modify(userdn, change, err => next(err));
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
exports.addGroup = (options, callback) => {
  if (_.isEmpty(options.groupName)) {
    throw new Error('missing groupName');
  }
  log.info(`adding group ${options.groupName} to LDAP`);
  const entry = {
    cn: options.groupName,
    objectClass: groupAttr.objectClass,
    member: [''],
  };
  if (!_.isEmpty(options.description)) {
    entry.description = options.description;
  }

  const dn = `${groupAttr.rdn}=${options.groupName},${groupAttr.baseDn}`;
  client.add(dn, entry, callback);
};