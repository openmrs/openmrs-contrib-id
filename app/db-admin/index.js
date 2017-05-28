'use strict';
const syncAdminUsers = require('./syncAdminUsers');
const formage = require('formage');
// var admin = Common.module.admin;
const models = require('./models');
const conf = require('../conf');
const mid = require('../express-middleware');


exports = module.exports = (app, express) => {


  const registry = formage.init(app, express, models, {
    title: 'OpenMRS ID Management',
    root: '/panel',
    default_section: 'OpenMRS ID',
    admin_users_gui: false,
    no_users: false
  });

  syncAdminUsers(registry.models.formage_users_.model, models.user);

  app.admin.addPage('Data Management (Formage)', '/panel');


};