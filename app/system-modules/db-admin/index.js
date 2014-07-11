var express = require('express');
var formage = require('formage');
var models = require('./model');
var Common = require(global.__commonModule);
var fields = require('./lib/fields');
var widgets = require('./lib/widgets');

var app = Common.app;

formage.init(app, express, models, {
  title: 'OpenMRS ID Database Admin',
  root: '/mongo',
  default_section: 'main',
  username: 'admin',
  password: 'admin',
  admin_users_gui: true
});

module.exports = {
  fields: fields,
  widgets: widgets
};

Common.module.dbAdmin = module.exports;
