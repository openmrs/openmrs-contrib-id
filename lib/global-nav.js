'use strict';
var path = require('path');
var url = require('url');
var express = require('express');
var cors = require('cors');

var mid = require('../../../express-middleware');
var conf = require('../../../conf');
var log = require('log4js').addLogger('module-global-nav');

var low = require('lowdb');
var db = low(path.join(__dirname, 'db.json'));



var subApp = express();
subApp.set('view engine', 'pug');

// CORS support (allow navbar code to be loaded from different origins)
subApp.use(cors());

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


subApp.use('/globalnav', express.static(path.join(__dirname, '/../resource/')));

exports = module.exports = function (app) {


app.admin.addPage('Global Navigation', '/admin/globalnav');
app.use(subApp);

// panel for global navbar
app.get('/admin/globalnav', function(req, res, next) {

  var links = db('GlobalNavLinks');
  var prefs = db('GlobalNavPrefs');
  var scriptURL = url.resolve(conf.site.url, '/globalnav/js/app-optimized.js');

  res.render(__dirname + '/../views/globalnav-admin', {
    links: links.value(),
    prefs: prefs.value(),
    scriptURL: scriptURL,
  });
});



//update links
app.post('/admin/globalnav/links', mid.parseParamTable,
  function(req, res, next) {

  var params = res.locals.params;

  // refresh db
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
  res.redirect(303, '/admin/globalnav');
});

app.post('/admin/globalnav/prefs', function(req, res, next) {

  var prefs = db('GlobalNavPrefs');
  for (var name in req.body) {
    log.debug('finding config value ' + name);
    var inst = prefs.find({key: name});
    inst.value = req.body[name];
  }
  db.save();

  req.flash('success', 'Preferences updated.');
  res.redirect(303, '/admin/globalnav');
});


};

