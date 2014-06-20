/**
 * This file defines the schema of admin user
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;

var adminSchema = new Schema({
  userId: {
    type: ObjectId,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
});

var admin = mongoose.model('AdminUser', adminSchema);

exports = module.exports = admin;
