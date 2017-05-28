'use strict';
/*
These links appear on the navigation bar in the order defined.
Modules can add to this list by calling add()
*/

const userNavLinks = [ // built-in links
  {
    'name': 'Welcome',
    'url': '/',
    'viewName': 'root',
    'visibleLoggedOut': false,
    'visibleLoggedIn': true,
    'icon': 'fa-home', // corresponds with font awesome
    'order': 10,
  },

  {
    'name': 'Your Profile',
    'url': '/profile',
    'viewName': 'profile',
    'visibleLoggedOut': false,
    'visibleLoggedIn': true,
    'requiredGroup': 'dashboard-users',
    'icon': 'fa-user',
    'order': 40,
  },

];

exports.list = userNavLinks;

exports.add = props => {
  userNavLinks.push(props); // that's all there is to it
  return props;
};