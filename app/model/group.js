/**
 * This file defines the model of user group
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

// reference to a specifc user object, and store the username for easy access
var userRefSchema = new Schema({
  id: {
    type: ObjectId,
  },
  username: {
    type: String,
  },
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
});

var Group = mongoose.model('Group', groupSchema);

exports = module.exports = Group;
