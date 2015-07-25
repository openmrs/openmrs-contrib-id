'use strict';
var _ = require('lodash');
var url = require('url');

module.exports = {

  _strategies: [],
  conf: require('../conf.json'),


  // Do the authentication process: If user is logged in, call the appropriate
  // validator function and redirect back to the application with an encrypted
  // login callback. If the user is not logged in, direct them through the
  // login interface.
  authenticate: function authenticate(req, res, next, strategy) {
    var route = url.parse(req.url);

    if (res.locals.connected) { // Forward to endpoint

      var loginString = strategy.validator(req, req.session.user);

      if (!loginString) {
        return next(new Error('Unable to process ' + strategy.id + ' login string'));
      }

      res.redirect(loginString);

    } else { // Log in the user

      req.flash('info', 'Log in with your OpenMRS ID to access ' +
        strategy.serviceName + '. If you don\'t have one, please sign up ' +
        ' <a href="/signup">here</a>.');

      var search = route.search || ''; // Avoid undefined
      return res.redirect('/login?destination=' +
        encodeURIComponent(route.pathname + search));
    }
  },



  // Return an authentication function with the validator expression filled
  authenticateWith: function authenticateWith(strategy) {
    return _.partial(this.authenticate, _, _, _, strategy);
  },





  // Call to register an sso authentication strategy. `opts` is a hash that
  // with these properties:
  //
  //     id: slug name of the auth strategy used to build the url (discourse)
  //     name: human-readable name of the strategy (Discourse SSO)
  //     serviceName: name of the service using this strategy (OpenMRS Talk)
  //     validator: function that returns a processed login string
  register: function register(app, opts) {

    var strategy = {
      id: opts.id,
      name: opts.name,
      serviceName: opts.serviceName,
      validator: opts.validator
    };

    this._strategies.push(strategy);

    app.get('/authenticate/'+strategy.id, this.authenticateWith(strategy));

    return strategy;
  }
};
