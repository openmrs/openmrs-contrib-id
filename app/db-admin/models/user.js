'use strict';
const User = require('../../models/user');

User.formage = {
  label: 'Users',

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
    'inLDAP',
    'skipLDAP',
    'extra',
  ],
};

exports = module.exports = User;