'use strict';
/**
 * This file defines the Schema of OpenMRS-ID
 */

const mongoose = require('mongoose');
const async = require('async');
const _ = require('lodash');

const Schema = mongoose.Schema;

const log = require('log4js').addLogger('user model');
const ldap = require('../ldap');
const utils = require('../utils');

const conf = require('../conf');
const Group = require('./group');

// Ensure the email list is not empty and no duplicate
// Because mongo won't ensure all the members to be unique in one array
const nonEmpty = {
  validator: function(ar) {
    return ar.length > 0;
  },
  msg: 'The array can\'t be empty'
};

const chkArrayDuplicate = {
  validator: function(arr) {
    const sorted = arr.slice();
    sorted.sort();

    let i;
    for (i = 1; i < sorted.length; ++i) {
      if (sorted[i] === sorted[i - 1]) {
        return false;
      }
    }
    return true;
  },
  msg: 'Some items are duplicate'
};

function arrToLowerCase(arr) {
  arr.forEach((str, index, array) => {
    array[index] = str.toLowerCase();
  });
  return arr;
}

const userSchema = new Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
  }, // unique username

  firstName: {
    type: String,
    index: true,
  },

  lastName: {
    type: String,
    index: true,
  },

  displayName: {
    type: String,
    index: true,
  },

  primaryEmail: {
    type: String, // Used for notifications
    required: true,
    lowercase: true,
    index: true,
  },

  displayEmail: {
    type: String, // Used for displaying
  },

  emailList: {
    type: [String], // All the user's Emails
    required: true,
    unique: true,
    set: arrToLowerCase,
    validate: [nonEmpty, chkArrayDuplicate],
  },

  password: {
    type: String, //hashed password
  },

  groups: { // All the groups that user belong
    type: [String],
    validate: [chkArrayDuplicate],
  },

  locked: { // seal this user from log-in
    type: Boolean,
    required: true,
  },

  createdAt: { // TTL index, let mongodb automatically delete this doc
    type: Date,
    expires: conf.mongo.commonExpireTime,
  },

  extra: {
    type: Schema.Types.Mixed
  },

  inLDAP: { // flag used to mark whether this record is stored in LDAP yet
    type: Boolean,
    default: false,
  },

  // Special flag used to skip the LDAP procedure.
  // Note that this flag will be deleted in pre middleware,
  // so it will only works once.
  skipLDAP: {
    type: Boolean,
  },
});

// diable autoIndex in production
if ('production' === process.env.NODE_ENV) {
  userSchema.set('autoIndex', false);
}

// ensure primaryEmail be one of emailList
userSchema.path('primaryEmail').validate(function(email) {
  return -1 !== this.emailList.indexOf(email);
}, 'The primaryEmail should be one member of emailList');

// generate an iterative function over a group with a callback function that
// takes 1 err argument
const createIteratorOverGroups = (groups, operation) => {
  const updateGroup = (groupName, cb) => {
    //efficiently update groups
    Group.findOneAndUpdate({
      groupName: groupName
    }, operation, {
      lean: true,
      select: 'groupName',
    }, (err, group) => {
      if (err) {
        return cb(err);
      }
      if (_.isEmpty(group)) {
        return cb(new Error(`No such group ${groupName}`));
      }
      return cb();
    });
  };

  return callback => {
    async.each(groups, updateGroup, callback);
  };
};

// maintain the groups relations
userSchema.pre('save', function(next) {
  const user = this;
  const userRef = {
    objId: user.id,
    username: user.username
  };

  // get the added and removed array
  const prepare = callback => {
    User.findById(user._id, (err, oldUser) => {
      if (err) {
        return callback(err);
      }
      const added = _.difference(user.groups, oldUser.groups);
      const removed = _.difference(oldUser.groups, user.groups);
      return callback(null, added, removed);
    });
  };



  let addGroups = (added, removed, callback) => {
    const worker = createIteratorOverGroups(added, {
      $addToSet: {
        member: userRef,
      }
    });
    return worker(err => {
      callback(err, removed);
    });
  };

  const delGroups = (removed, callback) => {
    const worker = createIteratorOverGroups(removed, {
      $pop: {
        member: userRef,
      }
    });
    return worker(callback);
  };

  // real logic starts
  if (this.isNew) { // Mongoose new document boolean flag
    const added = this.groups;
    addGroups = createIteratorOverGroups(added, {
      $addToSet: {
        member: userRef,
      }
    });
    return addGroups(next);
  }

  async.waterfall([
    prepare,
    addGroups,
    delGroups,
  ], next);
});

// sync with LDAP
userSchema.pre('save', function(next) {
  // aliases
  const uid = this.username;
  const that = this;
  if (!_.isEmpty(this.password) && 0 !== this.password.indexOf('{SSHA}')) {
    this.password = utils.getSSHA(this.password);
  }
  if (this.locked) {
    return next();
  }
  if (this.skipLDAP) {
    return next();
  }
  if (!this.inLDAP) { // not stored in LDAP yet
    ldap.addUser(that, err => {
      if (err) {
        log.error(`${uid} failed to add record to OpenLDAP`);
        return next(err);
      }
      log.info(`${uid} stored in OpenLDAP`);
      that.inLDAP = true;
      return next();
    });
    return;
  }
  // already stored in LDAP, modify it
  const getUser = callback => {
    ldap.getUser(uid, (err, userobj) => {
      if (err) {
        return callback(err);
      }
      return callback(null, userobj);
    });
  };

  const updateUser = (userobj, callback) => {
    ldap.updateUser(that, callback);
  };

  // due to limitation of LDAP, password shall be dealt individually
  const changePassword = (userobj, callback) => {
    if (userobj.password === that.password) { // not changed
      return callback();
    }
    ldap.resetPassword(uid, that.password, callback);
  };

  async.waterfall([
      getUser,
      updateUser,
      changePassword,
    ],
    err => {
      if (err) {
        log.error(`${uid} failed to sync with OpenLDAP`);
        log.error(err);
        return next(err);
      }
      return next();
    });
});

// Hook used to remove the record from LDAP
userSchema.pre('remove', function(next) {
  if (!this.inLDAP) {
    return next();
  }
  ldap.deleteUser(this.username, next);
});

// Hook used to remove user from groups
userSchema.pre('remove', function(next) {
  const user = this;
  const userRef = {
    objId: user.id,
    username: user.username
  };
  const delGroups = createIteratorOverGroups(user.groups, {
    $pop: {
      member: userRef,
    }
  });
  delGroups(next);
});

// When rendering JSON, omit sensitive attributes from the model
userSchema.options.toJSON = {
  transform: function(doc, ret, options) {
    delete ret.password;
    delete ret.locked;
    delete ret.inLDAP;
    delete ret.skipLDAP;
    delete ret.createdAt;
    delete ret.__v;
  }
};

var User = mongoose.model('User', userSchema);

exports = module.exports = User;

/**
 * Dynamically retrieve data from OpenLDAP
 * and sync it in Mongo*
 */
const findAndSync = (filter, callback) => {

  const findMongo = cb => {
    User.findOne(filter, (err, user) => {
      if (err) {
        return cb(err);
      }
      if (user) { // if found, directly end the chain
        return callback(null, user);
      }
      return cb();
    });
  };

  // not found in mongo, have a try in OpenLDAP
  const findLDAP = cb => {
    let finder;
    let condition;
    if (filter.username) { // choose finder
      finder = ldap.getUser;
      condition = filter.username;
    } else if (filter.email) { // choose finder
      finder = ldap.getUserByEmail;
      condition = filter.username;
    } else {
      return callback();
    }

    finder(condition, (err, userobj) => { // find in OpenLDAP
      if (err) {
        return cb(err);
      }
      if (!userobj) { // not found, end chain
        return callback();
      }
      return cb(null, userobj);
    });
  };

  // store the data retrieved to Mongo
  const syncMongo = (userobj, cb) => {
    const userInfo = {
      username: userobj.username,
      firstName: userobj.firstName,
      lastName: userobj.lastName,
      displayName: userobj.displayName,
      primaryEmail: userobj.primaryEmail,
      password: userobj.password,
      emailList: [userobj.primaryEmail],
      locked: false,
      createdAt: undefined,
      inLDAP: true,
    };
    const user = new User(userInfo);
    user.addGroupsAndSave(userobj.groups, cb);
  };

  async.waterfall([
      findMongo,
      findLDAP,
      syncMongo,
    ],
    (err, user) => {
      if (err) {
        return callback(err);
      }
      log.info(`${user.username} retrieved from OpenLDAP and stored`);
      return callback(null, user);
    });
};

/**
 * Helper function for searching user via username case-insensitively.
 * Just delegate the query to <code>Model.findOne</code>.
 *
 * @param  {string}   username The username used for searching,
 * case-insensitive.
 * @param  {Function} callback Receive(err,user)
 */
User.findByUsername = (username, callback) => {
  username = username.toLowerCase();
  findAndSync({
    username: username
  }, callback);
};

/**
 * Just similar to above
 */
User.findByEmail = (email, callback) => {
  email = email.toLowerCase();
  findAndSync({
    emailList: email
  }, callback); // actually there won't be sync
};

/**
 * Just a delegator
 */
User.findByFilter = (filter, callback) => {
  _.forIn(filter, (value, key) => {
    filter[key] = value.toLowerCase();
  });
  findAndSync(filter, callback);
};


/**
 * Add specific groups to an user, and the user to those groups as well.
 * Note that this could only be used in adding new users.
 * @param {[String]}   groups  groupNames
 * @param {Function} callback  same as the one of <code>Model#save</code>
 */
User.prototype.addGroupsAndSave = function(groups, callback) {
  // ToDo May have duplicate problems
  if (!Array.isArray(groups)) {
    groups = [groups];
  }
  const user = this;
  const userRef = {
    objId: user.id,
    username: user.username
  };
  async.each(groups, function addToGroup(groupName, cb) {
      // efficiently update groups
      Group.findOneAndUpdate({
        groupName: groupName
      }, {
        $addToSet: {
          member: userRef,
        }
      }, {
        lean: true,
        select: 'groupName',
      }, (err, group) => {
        if (err) {
          return cb(err);
        }
        if (_.isEmpty(group)) {
          return cb(new Error('No such groups'));
        }
        return cb();
      });
    },
    err => {
      if (err) {
        return callback(err);
      }
      user.groups.addToSet.apply(user.groups, groups);
      user.save(callback);
    });
};
