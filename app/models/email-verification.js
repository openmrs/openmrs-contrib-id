'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash');

const conf = require('../conf');

const emailSchema = new Schema({
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

const EmailVertification = mongoose.model('EmailVerification', emailSchema);

exports = module.exports = EmailVertification;