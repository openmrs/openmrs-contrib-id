var url = require('url');
var path = require('path');
var botproof = require('./botproof');
var signupMiddleware = require('./middleware');
var async = require('async');
var _ = require('lodash');

var Common = require(global.__commonModule);
var conf = Common.conf;
var app = Common.app;
// var ldap = Common.ldap;
var log = Common.logger.add('signup');
var mid = Common.mid;
var validate = Common.validate;
var verification = Common.verification;
var nav = Common.userNav;

var User = require(path.join(global.__apppath, 'model/user'));

/*
USER-NAV
========
*/
nav.add({
  name: 'Sign Up',
  url: '/signup',
  viewName: 'signup',
  visibleLoggedOut: true,
  visibleLoggedIn: false,
  icon: 'icon-asterisk',
  order: 20
});

/*
ROUTES
======
*/

// get signup from /signup or from / and handle accordingly
app.get(/^\/signup\/?$|^\/$/i, validate.receive(), botproof.generators,
  function(req, res, next) {

  if (req.session.user) {
    return next(); // pass onward if a user is signed in
  }

  // parse querystrings for pre-populated data
  var values = res.local('validation').values || {};
  var renderLayout = true;
  var query = url.parse(req.url, true).query;

  for (var prop in query) {
    if (/^(firstName|lastName|username|primaryEmail|)$/.test(prop)) {
      values[prop] = query[prop];
    }
  }

  // handle layout query string & determine which view to render
  renderLayout = (query.layout === 'false') ? false : true;
  var viewPath = (renderLayout) ? __dirname + '/../views/signup' : __dirname + '/../views/signup-standalone';

  // render the page
  res.render(viewPath, {
    values: values,
    layout: renderLayout,
    renderLayout: renderLayout, // allows view to see whether or not it has layout
    bodyAppend: '<script type="text/javascript" src="https://www.google.com/recaptcha/api/challenge?k=' + conf.validation.recaptchaPublic + '"></script>'
  });
});

// prevent from getting 404'd if a logged-in user hits /signup
app.get('/signup', mid.forceLogout);

app.post('/signup', mid.forceLogout, botproof.parsers,
  signupMiddleware.includeEmpties,
  signupMiddleware.validator, function(req, res, next) {

  console.log(req.body);

  var id = req.body.username;
  var first = req.body.firstName;
  var last = req.body.lastName;
  var email = req.body.primaryEmail;
  var pass = req.body.password;

  id = id.toLowerCase();

  // TODO
  var newUser = new User({
    username: id,
    firstName: first,
    lastName: last,
    displayName: first + ' ' + last,
    primaryEmail: email,
    emailList: [email],
    password: pass,
    locked: true,
  });
  async.series([
    function (callback) {
      newUser.save(callback);
    },

    function (callback) {
      verification.begin({
        urlBase: 'signup',
        email: email,
        subject: '[OpenMRS] Welcome to the OpenMRS Community',
        template: path.join(__dirname, '../views/welcome-verify-email.ejs'),
        locals: {
          displayName: first + ' ' + last,
          username: id,
          userCredentials: {
            id: id,
            email: email
          }
        },
        timeout: 0
      }, callback);
    },

  ],
  function (err) {
    if (err) {
      return next(err);
    }
    req.flash('success', '<p>Thanks and welcome to the OpenMRS Community!</p>' +
    '<p>Before you can use your OpenMRS ID across our services, ' +
    'we need to verify your email address.</p>' +
    '<p>We\'ve sent an email to <strong>' + email +
    '</strong> with instructions to complete the signup process.</p>');

    res.redirect('/signup/verify', 303);
  });
});

app.get('/signup/verify', function(req, res, next) {
  res.render('signedup');
});

// verification
app.get('/signup/:id', function(req, res, next) {
  //ToDo
  verification.check(req.params.id, function(err, valid, locals) {
    if (err) {
      return next(err);
    }
    if (!valid) {
      req.flash('error', 'The requested signup verification does not exist.');
      return res.redirect('/');
    }
    var username = locals.username;
    User.findOneAndUpdate({username: username}, {
      locked: false
    },
    function (err, user) {
      if (err) {
        return next(err);
      }
      log.debug(user.id + ': account enabled');
      verification.clear(req.params.id);
      req.flash('success', 'Your account was successfully created. Welcome!');

      req.session.user = user;
      log.debug(user);
      res.redirect('/');
    });
  });
});

// AJAX, check whether or not user exists
app.get('/checkuser/*', function(req, res, next) {
  if (!req.isXMLHttpRequest) {
    return res.redirect('/signup');
  }
  var username = req.params[0];
  var isValid = conf.ldap.user.usernameRegex.test(username);

  if (!isValid) {
    return res.end(JSON.stringify({illegal: true}));
  }

  User.findOne({username: username}, function chkUser(err, user) {
    if (err) {
      return next(err);
    }
    if (user) {
      return res.end(JSON.stringify({ exists: true}));
    }
    return res.end(JSON.stringify({ exists: false}));
  });
});


// Resource handler
app.get('/signup/resource/*', function(req, res, next) {

  // resolve the path
  var file = path.join(__dirname, '/../resource/', req.params[0]);

  // transmit the file
  res.sendfile(file, function(err) {
    if (err) {
      return next(err);
    }
  });
});
