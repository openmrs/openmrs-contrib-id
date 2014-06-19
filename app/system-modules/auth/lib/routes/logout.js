/**
 * This is the logout logic for Dashboard
 */

// Dashboard Common
var Common = require(global.__commonModule);
var app    = Common.app;
var log    = Common.logger.add('express');

app.get('/disconnect', function(req, res, next) {
  if (req.session.user) {
    log.info(req.session.user.username + ': disconnecting');
    req.session.destroy();
  }
  // redirect to a predefined destination or to home
  if (req.param('destination')) {
    res.redirect(req.param('destination'));
  } else {
    res.redirect('/');
  }
});
