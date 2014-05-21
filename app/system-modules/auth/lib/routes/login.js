var url = require('url');

// OpenMRS Common
var Common   = require(global.__commonModule);
var app      = Common.app;
var conf  = Common.conf;
var mid      = Common.mid;
var validate = Common.validate;
var ldap    = Common.ldap;
var log   = Common.logger.add('express');

app.get(/^\/login\/?$/, mid.forceLogout, validate.receive(),
  function(req, res, next) {
    res.render('login');
  }
);

app.post('/login', mid.stripNewlines, validate(), function(req, res, next) {
  var completed = 0;
  var needToComplete = 1;
  // var userobj = {};
  var username = req.body.loginusername;
  var password = req.body.loginpassword;



  var redirect = (req.body.destination) ? req.body.destination : '/';

  // do the actual authentication by forming a unique bind to the server as
  // the authenticated user;
  // closes immediately (all operations work through system's LDAP bind)
  ldap.authenticate(username, password, function handle(e) {
    ldap.close(username);

    if (e) { // authentication error
      if (e.message === 'Invalid credentials') { // login failed
        log.debug('known login failure');
        log.info('authentication failed for "' + username +
          '" (' + e.message + ')');
        req.flash('error', 'Login failed.');
        res.locals({
          fail: {
            loginusername: false,
            loginpassword: true
          },
          values: {
            loginusername: username,
            loginpassword: password
          }
        });
        if (req.body.destination) { // redirect to the destination login page
          return res.redirect(
            url.resolve(conf.site.url, '/login?destination=' +
            encodeURIComponent(req.body.destination))
          );
        } else { // redirect to generic login page
          return res.redirect(url.resolve(conf.site.url, '/login'));
        }
      } else {
        log.debug('login error');
        return next(e);
      }
    }

    log.info(username + ': authenticated'); // no error!

    // get a crowd SSO token and set the cookie for it
    // not implemented yet :-(
    /*crowd.getToken(username, password, function(error, token) {
      if (error && error.name != 403) next(e);
      else res.cookie('crowd.token_key', token);
      finish();
    })*/

    // get user's profile and put it in memory
    log.trace('getting user data');
    ldap.getUser(username, function(e, userobj) {
      log.trace(' returned');
      if (e) {
        return next(e);
      }
      req.session.user = userobj;
      log.debug('user ' + username + ' stored in session');
      finish();
    });

    var finish = function() {
      completed++;
      if (completed === needToComplete) {
        res.redirect(url.resolve(conf.site.url, decodeURIComponent(redirect)));
      }
    };
  });
});
