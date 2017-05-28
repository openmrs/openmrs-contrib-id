'use strict';
const path = require('path');
const mid = require('../../express-middleware');
const nav = require('../../user-nav');



/*
USER-NAV
========
*/
nav.add({
  name: "Admin",
  url: "/admin",
  viewName: "admin",
  requiredGroup: "dashboard-administrators",
  icon: "fa-wrench",
  order: 100
});


exports = module.exports = app => {

  const pages = [];
  const admin = app.admin = {
    addPage: function(name, url) {
      pages.push({
        name: name,
        url: url
      });
    },
  };


  app.use(/^\/admin($|\/.*$)/, mid.restrictTo('dashboard-administrators'));
  app.get(/^\/admin($|\/.*$)/, function prependSidebar(req, res, next) {
    res.locals.pages = pages;
    res.locals.reqURL = req.url;
    return next();
  });
  app.get('/admin', (req, res, next) => {
    res.render('views/admin');
  });
  admin.addPage('Welcome', '/admin');


};