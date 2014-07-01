/**
 * This file defines the Schema of OpenMRS-ID
 */

var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');

var Schema = mongoose.Schema;

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
  // something else
});

// ensure primaryEmail be one of emailList
userSchema.path('primaryEmail').validate(function (email){
  return -1 !== this.emailList.indexOf(email);
}, 'The primaryEmail should be one member of emailList');

var User = mongoose.model('User', userSchema);

exports = module.exports = User;

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
  User.findOne({username: username}, callback);
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
