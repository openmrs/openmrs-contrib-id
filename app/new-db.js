'use strict';
const mongoose = require('mongoose');
require('./logger');
const log = require('log4js').addLogger('mongodb');

const conf = require('./conf');
const uri = conf.mongo.uri;
const options = {
	server: {
		// sets how many times to try reconnecting
		reconnectTries: Number.MAX_VALUE,
		// sets the delay between every retry (milliseconds)
		reconnectInterval: 1000,
		auto_reconnect: true,
	},
	socketOptions: {
		keepAlive: 300000,
		connectTimeoutMS: 30000,
	},
}

const db = mongoose.connect(uri, options);


db.connection.on('error', (error) => {
	log.error('Error in MongoDB connection: %j', error);
	mongoose.disconnect();
});

db.connection.on('connected', () => {
	log.info(`Connected to ${uri}`);
});

db.connection.on('reconnected', () => {
	log.info('Successfully re-connected after connection loss.');
});

db.connection.on('disconnected', () => {
	log.error('MongoDB disconnected!');
});
