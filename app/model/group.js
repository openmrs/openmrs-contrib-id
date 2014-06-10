/**
 * This file defines the model of user group
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var groupSchema = new Schema({
  groupName: {
    type: String,
    unique: true,
    required: true,
  },
  description: {
    type: String,
  }
});

var Group = mongoose.model('Group', groupSchema);

exports = module.exports = Group;
