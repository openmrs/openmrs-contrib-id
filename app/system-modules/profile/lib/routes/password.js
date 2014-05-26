/**
 * This file handles users' password related request.
 */
var path = require('path');

var settings = require('../settings');

var Common = require(global.__commonModule);
var ldap = Common.ldap;
var mid = Common.mid;
var log = Common.logger.add('express');
var validate = Common.validate;

var app = Common.app;

app.get('/password', mid.forceLogin, validate.receive(),
  function(req, res, next) {

  res.render(path.join(settings.viewPath,'edit-password'));
});

app.post('/password', mid.forceLogin, validate(), function(req, res, next) {
  var updUser = req.session.user;

  ldap.changePassword(updUser, req.body.currentpassword, req.body.newpassword,
    function(e) {

    log.trace('password change return');
    if (e) {
      log.error(e);
      return next(e);
    }
    log.trace('password change no errors');
    log.info(updUser.uid + ': password updated');

    req.flash('success', 'Password changed.');
    res.redirect('/');
  });
});
