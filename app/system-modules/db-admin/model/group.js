var path = require('path');
var Group = require(path.join(global.__apppath, 'model/group'));

Group.formage = {
  list: [
    'groupName',
    'description',
  ],
};

exports = module.exports = Group;
