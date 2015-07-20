'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('lodash');

var conf = require('../conf');

var emailSchema = new Schema({
  uuid: {
    type: String,
    required: true,
    index: true,
  },
  addr: {
    type: String,
    required: true,
    index: true,
  },
  category: { // email verification type
    type: String,
  },
  username: {
    type: String,
    index: true,
    required: true,
  },
  description: {
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
  createdAt: { // TTL index, let mongodb automatically delete this doc
    type: Date,
    expires: conf.mongo.commonExpireTime,
    default: Date.now,
  },
});


if ('production' === process.env.NODE_ENV) {
  emailSchema.set('autoIndex', false);
}

var EmailVertification = mongoose.model('EmailVerification', emailSchema);

exports = module.exports = EmailVertification;
