'use strict';
/*
These links appear on the navigation bar in the order defined.
Modules can add to this list by calling add()
*/

var userNavLinks = [ // built-in links
  {
    'name': 'Welcome',
    'url': '/',
    'viewName': 'root',
    'visibleLoggedOut': false,
    'visibleLoggedIn': true,
    'icon': 'icon-home', // corresponds with font awesome
    'order': 10,
  },

  {
    'name': 'Password Reset',
    'url': '/reset',
    'viewName': 'reset-public',
    'visibleLoggedOut': true,
    'visibleLoggedIn': false,
    'icon': 'icon-unlock',
    'order': 30,
  },

  {
    'name': 'Your Profile',
    'url': '/edit/profile',
    'viewName': 'edit-profile',
    'visibleLoggedOut': false,
    'visibleLoggedIn': true,
    'requiredGroup': 'dashboard-users',
    'icon': 'icon-user',
    'order': 40,
  },

];

exports.list = userNavLinks;

exports.add = function(props) {
  userNavLinks.push(props); // that's all there is to it
  return props;
};
