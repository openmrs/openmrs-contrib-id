'use strict';
exports = module.exports = app => {
  // homepage
  app.get('/', require('./main'));

  // Legacy Redirects
  app.get('/edit/profile', (req, res) => {
    res.redirect('/profile');
  });
  app.get('/edit/password', (req, res) => {
    res.redirect('/password');
  });

  require('./signup')(app);
  require('./reset-password')(app);
  require('./auth')(app);
  require('./profile')(app);
  require('./admin')(app);
};