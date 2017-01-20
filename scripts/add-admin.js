'use strict';
var async = require('async');
var _ = require('lodash');

require('../app/new-db');
require('../app/logger');

var Group = require('../app/models/group');
var User = require('../app/models/user');
var data = require('./add-admin.json');

var userList = data.userList;
var groupName = data.groupName;

// plain-validation
if (_.isUndefined(data) || _.isUndefined(userList) || _.isUndefined(groupName)) {
	console.error('Please check add-admin.json!');
	process.exit();
}

// data-validation
var checkGroup = callback => {
	Group.findOne({
		groupName: groupName
	}, (err, group) => {
		if (err) {
			console.error('screwed');
			console.error(err);
			process.exit();
		}
		if (_.isEmpty(group)) {
			console.error('screwed');
			console.error('No such group found, please check again');
			process.exit();
		}
		return callback();
	});
};

var work = callback => {
	async.mapSeries(userList, (username, cb) => {
		console.log('Adding user ', username);
		User.findOne({
			username: username
		}, (err, user) => {
			if (err) {
				console.error('screwed');
				console.error(err);
				return cb(err);
			}
			if (_.isEmpty(user)) {
				console.error('no such user ', username);
				return cb();
			}
			user.addGroupsAndSave(groupName, cb);
		});
	}, callback);
};

async.series([
	checkGroup,
	work
], err => {
	process.exit();
});