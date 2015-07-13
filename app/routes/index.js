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

  //signup
  require('./signup')(app);

  app.use(require('./404'));
  app.use(require('./error'));
};
