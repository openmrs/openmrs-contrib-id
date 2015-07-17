'use strict';
exports = module.exports = function (app) {
  // homepage
  app.get('/', require('./main'));

  // Legacy Redirects
  app.get('/edit/profile', function(req, res) {
    res.redirect('/profile');
  });
  app.get('/edit/password', function(req, res) {
    res.redirect('/password');
  });

  require('./signup')(app);
  require('./reset-password')(app);
  require('./auth')(app);
  require('./profile')(app);
  require('./admin')(app);

  app.use(require('./404'));
  app.use(require('./error'));

};
