var path = require('path');
var Group = require(path.join(global.__apppath, 'model/group'));

Group.formage = {
  label: 'Groups',

  list: [
    'groupName',
    'description',
  ],

  search: [
    'groupName',
  ],

  exclude: [
    'inLDAP',
  ],
};

exports = module.exports = Group;
