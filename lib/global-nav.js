var path = require('path');
var url = require('url');
var express = require('express');
var cors = require('cors');

var Common = require(global.__commonModule);
var app = Common.app;
var mid = Common.mid;
var log = Common.logger.add('module-global-nav');
var admin = Common.module.admin;

var low = require('lowdb');
var db = low(path.join(__dirname, 'db.json'));

/*
ADMIN PAGE
==========
*/
admin.addModulePage('Global Navigation', '/admin/globalnav');


/*
ROUTES
======
*/

var subApp = express();
subApp.set('view engine', 'ejs');

// CORS support (allow navbar code to be loaded from different origins)
subApp.use(cors());
app.options('/globalnav', cors());

// request made by clients
subApp.get('/globalnav', function(req, res, next) {

  var links = db('GlobalNavLinks');
  var prefs = db('GlobalNavPrefs');

  // create settings object from prefs instances
  var prefsObj = {};
  prefs.forEach(function(inst) {
    prefsObj[inst.key] = inst.value;
  });

  var referrer = url.parse(req.header('Referer') || '');
  var bestMatch;
  var match;
  links.each(function (link) {
    var parsed = url.parse(link.url);
    if (referrer.host === parsed.host) {
      match = link.url;
      if (referrer.pathname.replace(/\/$/, '') === parsed.pathname.
                                                    replace(/\/$/, '')) {
        bestMatch = link.url;
      }
    }
  });

  // render & send the page (along with render variables)
  res.render(__dirname + '/../views/global-nav', {
    links: links.value(),
    prefs: prefsObj,
    matche: bestMatch || match,
  });
});

// panel for global navbar
app.get('/admin/globalnav',
  mid.restrictTo('dashboard-administrators'),
  admin.useSidebar,
  function(req, res, next) {

  var links = db('GlobalNavLinks');
  var prefs = db('GlobalNavPrefs');

  res.render(__dirname + '/../views/globalnav-admin', {
    links: links.value(),
    prefs: prefs.value(),
  });
});

//update links
app.post('/admin/globalnav/links',
  mid.restrictTo('dashboard-administrators'),
  mid.parseParamTable,
  function(req, res, next) {

  var params = res.locals.params;

  var links = db('GlobalNavLinks');
  links.remove();

  for (var link in params) {
    log.debug("creating link: " + JSON.stringify(params[link]));

    var inst = {};
    inst.id = params[link].id;
    inst.name = params[link].name;
    inst.url = params[link].url;

    links.push(inst);
  }
  req.flash('success', 'Global navigation links updated.');
  res.redirect('/admin/globalnav', 303);
});

app.post('/admin/globalnav/prefs',
  mid.restrictTo('dashboard-administrators'), function(req, res, next) {

  var prefs = db('GlobalNavPrefs');
  for (var name in req.body) {
    log.debug('finding config value ' + name);
    var inst = prefs.find({key: name});
    inst.value = req.body[name];
  }
  db.save();

  req.flash('success', 'Preferences updated.');
  res.redirect('/admin/globalnav', 303);
});

subApp.use(subApp.router);
subApp.use('/globalnav', express.static(path.join(__dirname, '/../resource/')));

app.use(subApp);

