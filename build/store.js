'use strict';
var async = require('async');
var _ = require('lodash');

require('../app/new-db');
require('../app/logger');

var log = require('log4js').addLogger('storing');
var Group = require('../app/models/group');
var User = require('../app/models/user');
var groupList = require('./groups.json').objList;
var userList = require('./users.json').objList;
// store groupnames and its member names to query
var groups = [];

if (_.isUndefined(groupList)) {
	log.error('Cannot find groups.json!');
	process.exit();
}

if (_.isUndefined(userList)) {
	log.error('Cannot find users.json!');
	process.exit();
}


var store = groupInfo => {
	var ret = {};
	ret.name = groupInfo.groupName;
	ret.member = {};
	_.forEach(groupInfo.member, user => {
		ret.member[user] = true;
	});
	return ret;
};

var getGroups = username => {
	var ret = [];
	_.forEach(groups, group => {
		if (group.member[username]) {
			ret.push(group.name);
		}
	});
	return ret;
};

var addGroups = next => {
	log.info('\n##################################  Starting to sync\n');
	async.map(groupList, (item, callback) => {
			var groupInfo = _.cloneDeep(item);
			groups.push(store(groupInfo));
			groupInfo.member = [];
			groupInfo.inLDAP = true;
			var group = new Group(groupInfo);
			group.save(callback);
		},
		err => {
			if (err) {
				log.error('screwed');
				log.error(err);
				process.exit();
			}
			log.info('successfully synced all groups');
			return next();
		});
};

var deletedEmails = [];
var checkUsers = next => {
	var count = {};
	var addToMap = mail => {
		if (_.isArray(mail)) {
			_.forEach(mail, item => {
				addToMap(item);
			});
			return;
		}
		mail = mail.toLowerCase();
		if (!count[mail]) {
			count[mail] = 1;
			return;
		}
		++count[mail];
	};

	// preparation
	_.forEach(userList, user => {
		addToMap(user.emailList);
	});

	// delete duplicated nonprimary emails
	_.forEach(userList, user => {
		for (var i = user.emailList.length - 1; i >= 0; --i) {
			var mail = user.emailList[i];
			var cp = mail.toLowerCase();
			if (count[cp] === 1) {
				continue;
			}
			if (mail === user.primaryEmail) {
				continue;
			}
			user.emailList.splice(i, 1);
			log.warn('Deleteing duplicated nonprimary email ' + mail +
				' for user ' + user.username);
			deletedEmails.push(mail);
		}
	});
	deletedEmails = _.uniq(deletedEmails);

	// recount and mark users with duplicated primaryEmail
	count = {};
	_.forEach(userList, user => {
		addToMap(user.primaryEmail);
	});
	_.forEach(userList, user => {
		var mail = user.primaryEmail;
		if (count[mail] > 1) {
			user.duplicate = true;
		}
	});
	return next();
};

var skipped = [];
var addUsers = next => {
	async.mapSeries(userList, (item, callback) => {
			log.info('Adding user ', item.username);
			var user = new User(item);
			if (item.duplicate) {
				log.warn('Skipping user ' + item.username + ' for duplicated primaryEmail.');
				var copy = _.cloneDeep(item);
				delete copy.duplicate;
				copy.groups = getGroups(user.username);
				skipped.push(copy);
				return callback();
			}
			user.inLDAP = true;
			user.locked = false; /// ToDo
			user.createdAt = undefined;
			user.skipLDAP = true;

			var groups = getGroups(user.username);
			log.debug('before calling save groups');
			user.addGroupsAndSave(groups, callback);
		},
		err => {
			if (err) {
				log.error('screwed');
				log.error(err);
				process.exit();
			}
			var skipObj = {
				skippedUsers: skipped,
				deletedEmails: deletedEmails,
			};
			var data = JSON.stringify(skipObj, null, 4);
			log.info('Stored skipped users and deleted emails to "skipped.json"');
			log.info('successfully synced all users');
			return next();
		});
};

async.series([
	addGroups,
	checkUsers,
	addUsers,
], err => {
	process.exit();
});