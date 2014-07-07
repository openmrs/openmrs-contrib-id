var Common = require(global.__commonModule);
var app = Common.app;
var log = Common.logger.add('render-helpers');
var conf = Common.conf;
var userNav = Common.userNav;
var url = require('url');

// insert our own GLOBAL variables to be used in rendering
app.helpers({
  defaultSidebar: conf.defaultSidebar,

  aboutHTML: conf.aboutHTML,
  siteURL: conf.site.url,
  conf: conf,
  url: url
});

app.dynamicHelpers({
  flash: function(req) {
    // Makes it easier to display flash messages,
    // which are created via req.flash() and erased each page render
    if (req.session) {
      return req.flash();
    }
    return null;
  },

  navLinks: function(req, res) {
    // Uses login state and privileges to generate the links to include in the user navigation bar

    var list = userNav.list;
    var links = [];

    log.trace('userNavLinks: entering for loop');
    if (req.session && req.session.user) {
      log.trace('userNavLinks: current groups: ' +
        req.session.user.groups.toString());
    }

    // Build list of links to display
    list.forEach(function(link) {

      // determine if session has access to page
      if (link.requiredGroup) {
        if (req.session && req.session.user &&
          req.session.user.groups.indexOf(link.requiredGroup) > -1) {

          links.push(link);
        } else if (link.visibleLoggedIn) {
          if (req.session && req.session.user) {
            links.push(link);
          }
        }
      }
      if (link.visibleLoggedIn && !link.requiredGroup) {
        if (req.session && req.session.user) {
          links.push(link);
        }
      }
      if (link.visibleLoggedOut) {
        if (req.session && !req.session.user) {
          links.push(link);
        }
      }
    });

    // Sort list by order specified
    links.sort(function(a, b) {
      return a.order - b.order;
    });

    return links;
  }

});

app.use(function style(req, res, next) {
  var enqueuedStylesheets = [];

  res.local('style', function(stylesheet, sort) {
    enqueuedStylesheets.push({
      css: stylesheet,
      sort: sort || 0
    });

    enqueuedStylesheets = enqueuedStylesheets.sort(function (a, b) {
      return a.sort - b.sort;
    });

    log.debug('enqueuedStylesheets', enqueuedStylesheets);
  });

  res.local('enqueuedStylesheets', enqueuedStylesheets);
  next();
});

app.use(function script(req, res, next) {
  var enqueuedScripts = [];

  res.local('script', function(script, opts, sort) {
    if (typeof opts === 'number') {
      sort = opts;
      opts = {};
    }

    enqueuedScripts.push({
      script: script,
      opts: opts || {},
      sort: sort || 0
    });

    enqueuedScripts = enqueuedScripts.sort(function (a, b) {
      return a.sort - b.sort;
    });

    log.debug('enqueuedScripts', enqueuedScripts);
  });

  res.local('enqueuedScripts', enqueuedScripts);
  next();
})