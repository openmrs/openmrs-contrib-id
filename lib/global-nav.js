var path = require('path');
var url = require('url');
var express = require('express');

var Common = require(global.__commonModule);
var app = Common.app;
var db = Common.db;
var mid = Common.mid;
var log = Common.logger.add('module-global-nav');
var admin = Common.module.admin;

/*
DATA MODEL
==========
*/

db.define('GlobalNavLinks', {
  id: {
    type: db.INTEGER,
    primaryKey: true
  },
  name: db.STRING,
  url: db.STRING,
  popover: db.TEXT
});

db.define('GlobalNavConf', {
  id: {
    type: db.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: db.STRING,
    unique: true
  },
  name: {
    type: db.STRING
  },
  value: {
    type: db.TEXT
  },
  placeholder: {
    type: db.TEXT
  },
  description: {
    type: db.TEXT
  },
  type: {
    type: db.STRING,
    defaultValue: 'text'
  }
}, function(err) {
  if (err) {
    log.error(err);
  }

  // initiate with default settings
  db.initiate('GlobalNavConf', [{
    key: 'customCSS',
    name: 'Custom CSS',
    placeholder: 'body {background: magenta;}',
    type: 'textarea',
    description: 'Include any CSS to be inserted to the navbar.'
  }, {
    key: 'cseId',
    name: 'Google CSE ID',
    placeholder: '012345678901234567890:abcdefghijk',
    description: 'Display a Google Custom Search field in the navbar by providing a CSE ID.'
  }, {
    key: 'csePlaceholder',
    name: 'Search Placeholder',
    placeholder: 'Search',
    description: 'Placeholder text displayed in the search field by default.'
  }]);
});

/*
ADMIN PAGE
==========
*/
admin.addModulePage('Global Navigation', '/admin/globalnav');


/*
ROUTES
======
*/


var subApp = express.createServer();
// CORS support (prevent XSS problems)
subApp.all('/globalnav', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

// request made by clients
subApp.get('/globalnav', function(req, res, next) {

  // get current links from DB
  db.getAll('GlobalNavLinks', function(err, links) {
    if (err) return next(err);

    // get navbar config values
    db.getAll('GlobalNavConf', function(err, prefs) {
      if (err) return next(err);

      // create settings object from prefs instances
      var prefsObj = {};
      prefs.forEach(function(inst) {
        prefsObj[inst.key] = inst.value;
      });

      // get URL to compare
      var referrer = url.parse(req.header('Referer') || '');

      // find link page is currently at (if any)
      var activeLink, matches;
      var parsedLinks = links.map(function(l) {
        return url.parse(l.url)
      });

      // filter to find a link that matches the same path
      matches = links.filter(function(link) {
        var parsed = url.parse(link.url)
        return referrer.host === parsed.host &&
          referrer.pathname.replace(/\/$/, '') === parsed.pathname.replace(/\/$/, '')
      })

      // if no same-path links, find one with a matching host
      if (matches.length === 0) {
        matches = links.filter(function(link) {
          var parsed = url.parse(link.url)
          return referrer.host === parsed.host
        })

        // sort links in order of less qualified to more qualified (path lenghts)
        matches = matches.sort(function(a, b) {
          a = url.parse(a.url)
          b = url.parse(b.url)

          return a.pathname.length - b.pathname.length
        })
      }

      log.debug("globalnav matches for " + req.header('Referer') +
        ": " + matches.map(function(l) {
          return l.url
        }))



      // render & send the page (along with render variables)
      res.render(__dirname + '/../views/global-nav', {
        layout: false,
        links: links,
        prefs: prefsObj,
        matches: matches[0] || null
      });
    });
  });
});

app.get('/admin/globalnav', mid.restrictTo('dashboard-administrators'), admin.useSidebar, function(req, res, next) {
  db.getAll('GlobalNavLinks', function(err, links) { // get links
    if (err) return next(err);
    db.getAll('GlobalNavConf', function(err, prefs) { // get preferences
      if (err) return next(err);

      // render the page
      res.render(__dirname + '/../views/globalnav-admin', {
        links: links,
        prefs: prefs
      });
    });
  });
});

app.post('/admin/globalnav/links', mid.restrictTo('dashboard-administrators'), mid.parseParamTable, function(req, res, next) {
  var params = res.local('params');

  // push to DB
  var chain = [],
    dbFinished = 0;
  db.sync('GlobalNavLinks', {
    force: true
  }, function(err) { // clear DB
    if (err) return next(err);

    for (var link in params) {
      log.trace("creating link: " + JSON.stringify(params[link]));

      var inst = db.create('GlobalNavLinks');
      inst.id = params[link].id;
      inst.name = params[link].name;
      inst.url = params[link].url;

      chain.push(inst);
    }

    // save chain to DB
    db.chainSave(chain, function(err) {
      if (err) return next(err);
      req.flash('success', 'Global navigation links updated.');
      res.redirect('/admin/globalnav', 303);
    }, true);
  });

});

app.post('/admin/globalnav/prefs', mid.restrictTo('dashboard-administrators'), function(req, res, next) {

  var chain = [],
    dbFinished = 0,
    dbNeeded = 0,
    dbErrored = false;

  // handle errors coming from an async loop
  var dbError = function(err) {
    if (!dbErrored) {
      dbErrored = true;
      return next(err);
    }
  };

  // update or create GlobalNavConf attributes containing form data
  var processAttribute = function(err, inst) {
    if (err) dbError(err);

    inst.value = req.body[inst.key];
    chain.push(inst);
    dbFinish();
  };

  // loop through submitted prefs and add changes to chain
  for (var pref in req.body) {
    dbNeeded++;
    log.trace('finding config value ' + pref);
    db.findOrCreate('GlobalNavConf', {
      key: pref
    }, processAttribute);
  }

  if (dbNeeded === 0) dbFinish();

  // once all db edits made, save the changes and redirect
  var dbFinish = function() {
    dbFinished++;
    log.trace('db edit ' + dbFinished + ' of ' + dbNeeded + ' finished');
    if (dbFinished >= dbNeeded) {
      log.trace('saving db edits');
      db.chainSave(chain, function(err) {
        if (err) return next(err);
        req.flash('success', 'Preferences updated.');

        // REDIRECT THE PAGE
        res.redirect('/admin/globalnav', 303);
      });
    }
  };
});


subApp.get('/globalnav/*', function(req, res, next) {

  // resolve the path
  var file = path.join(__dirname, '/../resource/', req.params[0]);

  // transmit the file
  res.sendfile(file);
});

app.use(subApp);

