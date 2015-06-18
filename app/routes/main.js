/**
 * This is the route logic for Dashboard's Homepage
 */
var https = require('https');
var app = require(global.__commonModule).app;

// LOGIN-LOGOUT
app.get('/', function(req, res, next) {

  if (!req.session.user) {
    return next();
  }
  res.locals.osqaUser = false;
  res.render('root');
  // https.get({
  //   host: 'answers.openmrs.org',
  //   path: '/users/' + req.session.user.uid
  // }, function(response) {
  //   if (response.statusCode === 200) {
  //     res.locals({
  //       osqaUser: true
  //     });
  //   } else {
  //     res.locals({
  //       osqaUser: false
  //     });
  //   }

  //   res.render('root');
  // });
});
