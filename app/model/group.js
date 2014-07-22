/**
 * This file defines the model of user group
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var ldap = require('../ldap');

// reference to a specifc user object, and store the username for easy access
var userRefSchema = new Schema({
  objId: {
    type: ObjectId,
  },
  username: {
    type: String,
  },
},{
  _id: false,
});

var groupSchema = new Schema({
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
  }
});

if ('production' === process.env.NODE_ENV) {
  groupSchema.set('autoIndex', false);
}

// pre hooks used to sync with LDAP,
// currently we only support to add, no modification
groupSchema.pre('save', function (next) {
  if (this.inLDAP) {
    return next();
  }
  var group = {groupName: this.groupName, description: this.description};
  ldap.addGroup(group, function (err) {
    if (err) {
      return next(err);
    }
    this.inLDAP = true;
    return next();
  });
});

var Group = mongoose.model('Group', groupSchema);

exports = module.exports = Group;
