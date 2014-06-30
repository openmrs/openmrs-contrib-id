require('../new-db');
var Group = require('./group');
var async = require('async');

var groupList = [
  {
    groupName: "crowd-administrators",
    description: "Users who administer crowd",
  },
  {
    groupName: "confluence-users",
  },
  {
    groupName: "confluence-administrators",
  },
  {
    groupName: "jira-users",
  },
  {
    groupName: "jira-administrators",
  },
  {
    groupName: "jira-developers",
  },
  {
    groupName: "osqa-users",
  },
  {
    groupName: "osqa-superuser",
  },
  {
    groupName: "dashboard-users",
  },
  {
    groupName: "dashboard-administrators",
  },
  {
    groupName: "ga-user",
  }
];

async.map(groupList, function (item, callback) {
  var group = new Group(item);
  group.save(callback);
},
function (err) {
  if (err) {
    console.error('fucked');
    return;
  }
  console.log('successfully');
});
