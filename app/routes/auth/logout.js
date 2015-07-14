/**
 * This is the logout logic for Dashboard
 */
var log = require('log4js').getLogger('express');

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
  if (req.params.destination) {
    res.redirect(req.params.destination);
  } else {
    res.redirect('/');
  }
});


};