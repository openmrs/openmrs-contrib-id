var app = require(global.__commonModule).app;
// Legacy Redirects
app.get('/edit/profile?', function(req, res) {
  res.redirect('/profile');
});
app.get('/edit/password', function(req, res) {
  res.redirect('/password');
});
