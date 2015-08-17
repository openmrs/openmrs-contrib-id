'use strict';
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


exports = module.exports = function (app) {

var pages = [];
var admin = app.admin = {
  addPage: function (name, url) {
    pages.push({name: name, url: url});
  },
};


app.use(/^\/admin($|\/.*$)/, mid.restrictTo('dashboard-administrators'));
app.get(/^\/admin($|\/.*$)/, function prependSidebar (req, res, next) {
  res.locals.pages = pages;
  res.locals.reqURL = req.url;
  return next();
});
app.get('/admin', function(req, res, next) {
  res.render('views/admin');
});
admin.addPage('Welcome', '/admin');


};
