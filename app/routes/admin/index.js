var path = require('path');
var mid = require('../../express-middleware');
var nav = require('../../user-nav');



/*
USER-NAV
========
*/
nav.add({
  name: "Admin",
  url: "/admin",
  viewName: "admin",
  requiredGroup: "dashboard-administrators",
  icon: "icon-wrench",
  order: 100
});

// add a link to the admin sidebar

// middleware, restricts to admin group, adds user-nav, css, and sidebar to any page
// var addSidebar = function(req, res, next) {
//   var sidebar = res.locals.sidebar || [], // get current sidebar and params
//     params = res.locals.sidebarParams || {},

//   // merge admin-sidebar with current
//   res.locals.sidebar = sidebar.concat(__dirname + '/../views/sidebar-admin');
//   params[__dirname + '/../views/sidebar-admin'] = {
//     className: 'box',
//     locals: {
//       pages: modulePages,
//       reqUrl: req.url
//     }
//   };
//   res.locals.sidebarParams = params;

//   next();
// };


exports = module.exports = function (app) {

var modulePages = [];

app.get('/admin', mid.restrictTo('dashboard-administrators'),
  function(req, res, next) {

  res.render('views/admin', {
    // pages:
  });
});


};


exports.addModulePage = function(name, url) {
  modulePages.push({
    name: name,
    url: url
  });
};

// exports.addModulePage('Welcome', '/admin'); // add this page to the list
