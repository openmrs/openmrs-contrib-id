var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var conf = require('../conf');

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
  urlBase: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  associatedId: {
    type: String,
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

