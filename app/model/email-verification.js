var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('lodash');

var conf = require('../conf');

// category for verifications
var categories = {
  signup: 'signup',
  resetPwd: 'reset password',
  newEmail: 'add email',
};
var categoriesList = [];
_.forIn(categories, function (value) {
  categoriesList.push(value);
});

var emailSchema = new Schema({
  verifyId: {
    type: String,
    required: true,
    unique: true,
  },
  actionId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    index: true,
  },
  associatedId: {
    type: String,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: categoriesList,
  },
  settings: {
    type: {},
    required: true,
  },
  locals: {
    type: {},
    required: true,
  },
  timeoutDate: { // optional
    type: Date,
  },
  createdAt: { // TTL index, let mongodb automatically delete this doc
    type: Date,
    expires: conf.mongo.commonExpireTime,
    default: Date.now,
  },
});

var EmailVertification = mongoose.model('EmailVertification', emailSchema);

exports = module.exports = EmailVertification;
exports.categories = categories;

