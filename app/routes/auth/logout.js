'use strict';
/**
 * This is the logout logic for Dashboard
 */
var log = require('log4js').addLogger('express');

exports = module.exports = function (app) {


app.get('/logout', function (req, res) {
  return res.redirect('/disconnect');
});

app.get('/disconnect', function(req, res, next) {
  if (req.session.user) {
    log.info(req.session.user.username + ': disconnecting');
    req.session.destroy();
  }
  // redirect to a predefined destination or to home
  var destination = req.query.destination;
  if (destination) {
    res.redirect(decodeURIComponent(destination));
  } else {
    res.redirect('/');
  }
});


};
