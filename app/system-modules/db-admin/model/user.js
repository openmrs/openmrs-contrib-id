var path = require('path');
var User = require(path.join(global.__apppath, 'model/user'));

User.formage = {
  label: 'OpenMRS ID',

  // filters: [
  //   'username',
  //   'primaryEmail',
  // ],

  list: [
    'username',
    'firstName',
    'lastName',
    'primaryEmail',
    'locked',
  ],

  search: [
    'username',
    'primaryEmail',
    'emailList',
  ],

  exclude: [
    'createdAt',
    'inLDAP',
    'skipLDAP',
    'extra',
  ],
};

exports = module.exports = User;
