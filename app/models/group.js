'use strict';
/**
 * This file defines the model of user group
 */
const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const ldap = require('../ldap');

// reference to a specifc user object, and store the username for easy access
const userRefSchema = new Schema({
  objId: {
    type: ObjectId,
  },
  username: {
    type: String,
  },
}, {
  _id: false,
});

const groupSchema = new Schema({
  groupName: {
    type: String,
    unique: true,
    required: true,
  },
  description: {
    type: String,
  },
  member: {
    type: [userRefSchema],
  },
  inLDAP: {
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

if ('production' === process.env.NODE_ENV) {
  groupSchema.set('autoIndex', false);
}

// pre hooks used to sync with LDAP,
// currently we only support to add, no modification
groupSchema.pre('save', function(next) {
  if (this.skipLDAP) {
    this.skipLDAP = undefined;
    return next();
  }
  if (this.inLDAP) {
    return next();
  }
  const that = this;
  const group = {
    groupName: this.groupName,
    description: this.description
  };
  ldap.addGroup(group, err => {
    if (err) {
      return next(err);
    }
    that.inLDAP = true;
    return next();
  });
});

const Group = mongoose.model('Group', groupSchema);

exports = module.exports = Group;

Group.prototype.indexOfUser = function(username) {
  username = username.toLowerCase();
  for (let i = 0, len = this.member.length; i < len; ++i) {
    if (this.member[i].username === username) {
      return i;
    }
  }
  return -1;
};