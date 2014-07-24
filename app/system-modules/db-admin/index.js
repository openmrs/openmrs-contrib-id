var express = require('express');
var formage = require('formage');
var models = require('./model');
var Common = require(global.__commonModule);
var conf = Common.conf;
var mid = Common.mid;
var fields = require('./lib/fields');
var widgets = require('./lib/widgets');
var syncAdminUsers = require('./lib/syncAdminUsers');

var app = Common.app;

app.use('/panel', mid.restrictTo('dashboard-administrators'));

var registry = formage.init(app, express, models, {
  title: 'OpenMRS ID Management',
  root: '/panel',
  default_section: 'OpenMRS ID',
  username: conf.mongo.username,
  password: conf.mongo.password,
  admin_users_gui: false,
  no_users: false
});

syncAdminUsers(registry.models.formage_users_.model, models.user);

module.exports = {
  fields: fields,
  widgets: widgets,
  registry: registry
};

Common.module.dbAdmin = module.exports;
