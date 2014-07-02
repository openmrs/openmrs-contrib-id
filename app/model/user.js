/**
 * This file defines the Schema of OpenMRS-ID
 */

var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');

var Schema = mongoose.Schema;
var Common = require(global.__commonModule);
var log = Common.logger.add('user model');
var ldap = Common.ldap;
var utils = Common.utils;

var conf = require('../conf');
var Group = require('./group');

var uidRegex = conf.user.usernameRegex;
var emailRegex = conf.email.validation.emailRegex;

// Just a placeholder
function uidValidator(argument) {
  return true; // do something else, maybe check the length.
}

// Ensure the email list is not empty and no duplicate
// Because mongo won't ensure all the members to be unique in one array
var nonEmpty = {
  validator: function (ar) {
    return ar.length > 0;
  },
  msg: 'The array can\'t be empty'
};

function validEmail(email) {
  return emailRegex.test(email);
}

var chkEmailsValid = {
  validator: function (emails) {
    return emails.every(validEmail);
  },
  msg: 'Some email are illegal'
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
    match: [uidRegex, 'Illegal username'],
    validate: uidValidator,
  }, // unique username

  firstName: {
    type: String,
  },

  lastName: {
    type: String,
  },

  displayName: {
    type: String,
  },

  primaryEmail: {
    type: String, // Used for notifications
    match: [emailRegex, 'Illegal Email address'],
    required: true,
    lowercase: true,
  },

  displayEmail: {
    type: String, // Used for displaying
    match: [emailRegex, 'Illegal Email address'],
  },

  emailList: {
    type: [String], // All the user's Emails
    required: true,
    unique: true,
    set: arrToLowerCase,
    validate: [nonEmpty,chkEmailsValid,chkArrayDuplicate],
  },

  password: {
    type: String, //hashed password
    required: true,
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
});

// ensure primaryEmail be one of emailList
userSchema.path('primaryEmail').validate(function (email){
  return -1 !== this.emailList.indexOf(email);
}, 'The primaryEmail should be one member of emailList');

// sync with LDAP
userSchema.pre('save', function (next) {
  // aliases
  var uid = this.username;
  var first = this.firstName;
  var last = this.lastName;
  var disp = this.displayName;
  var email = this.primaryEmail; // only sync primary email with OpenLDAP
  var pass = this.password;
  var groups = this.groups;
  var that = this;
  if (0 !== pass.indexOf('{SHA}')) {
    this.password = utils.getSHA(pass);
  }
  if (this.locked) {
    return next();
  }
  if (!this.inLDAP) { // not stored in LDAP yet
    ldap.addUser(uid, first, last, email, pass, function (err) {
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
    // update attributes one by one
    userobj[conf.user.username] = uid;
    userobj[conf.user.firstname] = first;
    userobj[conf.user.lastname] = last;
    userobj[conf.user.displayname] = disp;
    userobj[conf.user.email] = email;
    userobj.memberof = groups;
    ldap.updateUser(userobj, callback);
  };

  // due to limitation of LDAP, password shall be dealt individually
  var changePassword = function (userobj, callback) {
    if (userobj[conf.user.password] === pass) { // not changed
      return callback();
    }
    ldap.resetPassword(uid, pass, callback);
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


var User = mongoose.model('User', userSchema);

exports = module.exports = User;

/**
 * Dynamically retrieve data from OpenLDAP
 */
var findAndSync = function(filter, callback) {
  var findMongo = function (cb) {
    User.findOne(filter,cb);
  };
  var findLDAP = function (user, cb) {
    if (user) { // Found in mongo
      return cb(null, user);
    }
    // not found in mongo, have a try in OpenLDAP
    var finder;
    var condition;
    if (filter.username) {// choose finder
      finder = ldap.getUser;
      condition = filter.username;
    } else {
      finder = ldap.getUserByEmail;
      condition = filter.emailList;
    }

    finder(condition, function (err, userobj) {// find in OpenLDAP
      if (err) {
        if (err.message === 'User data not found') {
          return callback();
        }
        return callback(err);
      }
      var userInfo = {
        username: userobj[conf.user.username],
        firstName: userobj[conf.user.firstname],
        lastName: userobj[conf.user.lastname],
        displayName: userobj[conf.user.displayname],
        primaryEmail: userobj[conf.user.email],
        password: userobj[conf.user.password],
        emailList: [userobj[conf.user.email]],
        groups: userobj.memberof,
        locked: false,
        createdAt: undefined,
        inLDAP: true,
      };
      var user = new User(userInfo);
      user.save(cb);
    });
  };
  async.waterfall([
    findMongo,
    findLDAP,
  ],
  function (err, user) {
    if (err) {
      return callback(err);
    }
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
  findAndSync({emailList: email}, callback);
};

/**
 * Just a delegator
 */
User.findByFilter = function (filter, callback) {
  _.forIn(filter, function (value, key) {
    filter[key] = value.toLowerCase;
  });
  findAndSync(filter, callback);
};


/**
 * Add specific groups to an user instance, and the user to those groups as well
 * @param {[String]}   groups  groupNames
 * @param {Function} callback  same as the one of <code>Model#save</code>
 */
User.prototype.addGroups = function (groups, callback) {
  if (!Array.isArray(groups)) {
    groups = [groups];
  }
  var user = this;
  var userRef = {id: user.id, username: user.username};
  async.map(groups, function addToGroup(group, cb) {
    Group.findOne({groupName: group}, function (err, group) {
      if (err) {
        return cb(err);
      }
      group.userList.push(userRef);
      group.save(cb);
    });
  },
  function (err) {
    if (err) {
      return callback(err);
    }
    user.groups = _.union(user.groups, groups);
    user.save(callback);
  });
};

/// ToDO
/// Remove user instances with records stored in groups
