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
    // formageField: fields.JsonField
  },
  locals: {
    type: {},
    required: true,
    // formageField: fields.JsonField
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


if ('production' === process.env.NODE_ENV) {
  emailSchema.set('autoIndex', false);
}

var EmailVertification = mongoose.model('EmailVertification', emailSchema);

exports = module.exports = EmailVertification;
exports.categories = categories;
