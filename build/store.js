'use strict';
const async = require('async');
const _ = require('lodash');

require('../app/new-db');
require('../app/logger');

const log = require('log4js').addLogger('storing');
const Group = require('../app/models/group');
const User = require('../app/models/user');
const groupList = require('./groups.json').objList;
const userList = require('./users.json').objList;
// store groupnames and its member names to query
const groups = [];

if (_.isUndefined(groupList)) {
	log.error('Cannot find groups.json!');
	process.exit();
}

if (_.isUndefined(userList)) {
	log.error('Cannot find users.json!');
	process.exit();
}


const store = groupInfo => {
	const ret = {};
	ret.name = groupInfo.groupName;
	ret.member = {};
	_.forEach(groupInfo.member, user => {
		ret.member[user] = true;
	});
	return ret;
};

const getGroups = username => {
	const ret = [];
	_.forEach(groups, group => {
		if (group.member[username]) {
			ret.push(group.name);
		}
	});
	return ret;
};

const addGroups = next => {
	log.info('\n##################################  Starting to sync\n');
	async.map(groupList, (item, callback) => {
			const groupInfo = _.cloneDeep(item);
			groups.push(store(groupInfo));
			groupInfo.member = [];
			groupInfo.inLDAP = true;
			const group = new Group(groupInfo);
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

let deletedEmails = [];
const checkUsers = next => {
	let count = {};
	const addToMap = mail => {
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
		for (let i = user.emailList.length - 1; i >= 0; --i) {
			const mail = user.emailList[i];
			const cp = mail.toLowerCase();
			if (count[cp] === 1) {
				continue;
			}
			if (mail === user.primaryEmail) {
				continue;
			}
			user.emailList.splice(i, 1);
			log.warn(`Deleteing duplicated nonprimary email ${mail} for user ${user.username}`);
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
		const mail = user.primaryEmail;
		if (count[mail] > 1) {
			user.duplicate = true;
		}
	});
	return next();
};

const skipped = [];
const addUsers = next => {
	async.mapSeries(userList, (item, callback) => {
			log.info('Adding user ', item.username);
			const user = new User(item);
			if (item.duplicate) {
				log.warn(`Skipping user ${item.username} for duplicated primaryEmail.`);
				const copy = _.cloneDeep(item);
				delete copy.duplicate;
				copy.groups = getGroups(user.username);
				skipped.push(copy);
				return callback();
			}
			user.inLDAP = true;
			user.locked = false; /// ToDo
			user.createdAt = undefined;
			user.skipLDAP = true;

			const groups = getGroups(user.username);
			log.debug('before calling save groups');
			user.addGroupsAndSave(groups, callback);
		},
		err => {
			if (err) {
				log.error('screwed');
				log.error(err);
				process.exit();
			}
			const skipObj = {
				skippedUsers: skipped,
				deletedEmails: deletedEmails,
			};
			const data = JSON.stringify(skipObj, null, 4);
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