'use strict';
/**
 * This file defines the Schema of OpenMRS-ID
 */

var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');

var Schema = mongoose.Schema;

var log = require('log4js').addLogger('user model');
var ldap = require('../ldap');
var utils = require('../utils');

var conf = require('../conf');
var Group = require('./group');

// Ensure the email list is not empty and no duplicate
// Because mongo won't ensure all the members to be unique in one array
var nonEmpty = {
  validator: function (ar) {
    return ar.length > 0;
  },
  msg: 'The array can\'t be empty'
};

var chkArrayDuplicate = {
  validator: function (arr) {
    var sorted = arr.slice();
    sorted.sort();

    var i;
    for (i = 1; i < sorted.length; ++i) {
      if (sorted[i] === sorted[i-1]) {
        return false;
      }
    }
    return true;
  },
  msg: 'Some items are duplicate'
};

function arrToLowerCase(arr) {
  arr.forEach(function (str, index, array) {
    array[index] = str.toLowerCase();
  });
  return arr;
}

var userSchema = new Schema({
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
    default: Date.now,
  },

  extra: {
    type: Schema.Types.Mixed
  },

  inLDAP: {// flag used to mark whether this record is stored in LDAP yet
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
userSchema.path('primaryEmail').validate(function (email){
  return -1 !== this.emailList.indexOf(email);
}, 'The primaryEmail should be one member of emailList');

// generate an iterative function over a group with a callback function that
// takes 1 err argument
var createIteratorOverGroups = function (groups, operation) {
  var updateGroup = function (groupName, cb) {
    //efficiently update groups
    Group.findOneAndUpdate({groupName: groupName}, operation, {
      lean: true,
      select: 'groupName',
    }, function (err, group) {
      if (err) {
        return cb(err);
      }
      if (_.isEmpty(group)) {
        return cb(new Error('No such group ' + groupName));
      }
      return cb();
    });
  };

  return function (callback) {
    async.each(groups, updateGroup, callback);
  };
};

// maintain the groups relations
userSchema.pre('save', function (next) {
  var user = this;
  var userRef = {objId: user.id, username: user.username};

  // get the added and removed array
  var prepare = function (callback) {
    User.findById(user._id, function (err, oldUser) {
      if (err) {
        return callback(err);
      }
      var added = _.difference(user.groups, oldUser.groups);
      var removed = _.difference(oldUser.groups, user.groups);
      return callback(null, added, removed);
    });
  };



  var addGroups = function (added, removed, callback) {
    var worker = createIteratorOverGroups(added, {
      $addToSet: {
        member: userRef,
      }
    });
    return worker(function (err) {
      callback(err, removed);
    });
  };

  var delGroups = function (removed, callback) {
    var worker = createIteratorOverGroups(removed, {
      $pop: {
        member: userRef,
      }
    });
    return worker(callback);
  };

  // real logic starts
  if (this.isNew) { // Mongoose new document boolean flag
    var added = this.groups;
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
userSchema.pre('save', function (next) {
  // aliases
  var uid = this.username;
  var that = this;
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
    ldap.addUser(that, function (err) {
      if (err) {
        log.error(uid + ' failed to add record to OpenLDAP');
        return next(err);
      }
      log.info(uid + ' stored in OpenLDAP');
      that.inLDAP = true;
      return next();
    });
    return;
  }
  // already stored in LDAP, modify it
  var getUser = function (callback) {
    ldap.getUser(uid, function (err, userobj) {
      if (err) {
        return callback(err);
      }
      return callback(null ,userobj);
    });
  };

  var updateUser = function (userobj, callback) {
    ldap.updateUser(that, callback);
  };

  // due to limitation of LDAP, password shall be dealt individually
  var changePassword = function (userobj, callback) {
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
  function (err) {
    if (err) {
      log.error(uid + ' failed to sync with OpenLDAP');
      return next(err);
    }
    return next();
  });
});

// Hook used to remove the record from LDAP
userSchema.pre('remove', function (next) {
  if (!this.inLDAP) {
    return next();
  }
  ldap.deleteUser(this.username, next);
});

// Hook used to remove user from groups
userSchema.pre('remove', function (next) {
  var user = this;
  var userRef = {objId: user.id, username: user.username};
  var delGroups = createIteratorOverGroups(user.groups, {
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
var findAndSync = function(filter, callback) {

  var findMongo = function (cb) {
    User.findOne(filter, function (err, user) {
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
  var findLDAP = function (cb) {
    var finder;
    var condition;
    if (filter.username) {// choose finder
      finder = ldap.getUser;
      condition = filter.username;
    } else {
      return callback(); // ldap.js findByEmail is deprecated, end chain
    }

    finder(condition, function (err, userobj) {// find in OpenLDAP
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
  var syncMongo = function (userobj, cb) {
    var userInfo = {
      username: userobj.username,
      firstName: userobj.firstName,
      lastName: userobj.lastName,
      displayName: userobj.displayName,
      primaryEmail: userobj.primaryEmail,
      password: userobj.password,
      emailList: [ userobj.primaryEmail ],
      locked: false,
      createdAt: undefined,
      inLDAP: true,
    };
    var user = new User(userInfo);
    user.addGroupsAndSave(userobj.groups, cb);
  };

  async.waterfall([
    findMongo,
    findLDAP,
    syncMongo,
  ],
  function (err, user) {
    if (err) {
      return callback(err);
    }
    log.info(user.username + ' retrieved from OpenLDAP and stored');
    return callback(null ,user);
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
User.findByUsername = function (username, callback) {
  username = username.toLowerCase();
  findAndSync({username: username}, callback);
};

/**
 * Just similar to above
 */
User.findByEmail = function (email, callback) {
  email = email.toLowerCase();
  findAndSync({emailList: email}, callback); // actually there won't be sync
};

/**
 * Just a delegator
 */
User.findByFilter = function (filter, callback) {
  _.forIn(filter, function (value, key) {
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
User.prototype.addGroupsAndSave = function (groups, callback) {
  // ToDo May have duplicate problems
  if (!Array.isArray(groups)) {
    groups = [groups];
  }
  var user = this;
  var userRef = {objId: user.id, username: user.username};
  async.each(groups, function addToGroup(groupName, cb) {
    // efficiently update groups
    Group.findOneAndUpdate({groupName: groupName}, {
      $addToSet: {
        member: userRef,
      }
    },{
      lean: true,
      select: 'groupName',
    }, function (err, group) {
      if (err) {
        return cb(err);
      }
      if (_.isEmpty(group)) {
        return cb(new Error('No such groups'));
      }
      return cb();
    });
  },
  function (err) {
    if (err) {
      return callback(err);
    }
    user.groups.addToSet.apply(user.groups,groups);
    user.save(callback);
  });
};
