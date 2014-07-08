var express = require('express');
var formage = require('formage');
var models = require(global.__apppath + '/model');
var Common = require(global.__commonModule);
var fields = require('./lib/fields');
var widgets = require('./lib/widgets');

var app = express();

app.use(express.cookieParser('2w98dfuslk'));
app.use(express.cookieSession({key: 'id-admin'}));

formage.init(app, express, models, {
  title: 'OpenMRS ID Database Admin',
  root: '/admin',
  default_section: 'main',
  username: 'admin',
  password: 'admin',
  admin_users_gui: true
});

app.use('/resource', express.static(__dirname + '/resource'));

// Common.app.use('/db', app);

app.listen(3001);

module.exports = {
  app: app,
  fields: fields,
  widgets: widgets
};

Common.module.dbAdmin = module.exports;