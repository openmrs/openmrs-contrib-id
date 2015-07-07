/**
 * This is the route logic for Dashboard's Homepage
 */
var https = require('https');
var app = require(global.__commonModule).app;

// LOGIN-LOGOUT
app.get('/', function(req, res, next) {
  if (!req.session.user) { // only shown to users logged in
    return next();
  }

  res.render('root');
});
