'use strict';
const async = require('async');
const _ = require('lodash');

require('../app/new-db');
require('../app/logger');

const Group = require('../app/models/group');
const User = require('../app/models/user');
const data = require('./add-admin.json');

const userList = data.userList;
const groupName = data.groupName;

// plain-validation
if (_.isUndefined(data) || _.isUndefined(userList) || _.isUndefined(groupName)) {
  console.error('Please check add-admin.json!');
  process.exit();
}

// data-validation
const checkGroup = callback => {
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

const work = callback => {
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