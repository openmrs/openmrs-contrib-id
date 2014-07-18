var Common = require(global.__commonModule);
var app = Common.app;
var log = Common.logger.add('render-helpers');
var conf = Common.conf;
var userNav = Common.userNav;
var url = require('url');

// insert our own GLOBAL variables to be used in rendering
app.locals({
  defaultSidebar: conf.defaultSidebar,

  aboutHTML: conf.aboutHTML,
  siteURL: conf.site.url,
  conf: conf,
  url: url
});

//flash
app.use(function flash(req, res, next) {
  // Makes it easier to display flash messages,
  // which are created via req.flash() and erased each page render
  res.locals.flash = req.session ? req.flash() : null;
  return next();
});

//navLinks
var navLinks = function(req, res, next) {
  // Uses login state and privileges to generate the links to
  // include in the user navigation bar

  // directly skip, if no session exists
  if (!req.session) {
    return next();
  }

  var list = userNav.list;
  var links = [];
  res.locals.navLinks = links;

  log.trace('userNavLinks: entering for loop');
  if (req.session.user) {
    log.trace('userNavLinks: current groups: ' +
      req.session.user.groups.toString());
  }

  // Build list of links to display
  list.forEach(function(link) {
    // determine if session has access to page

    // not logged in
    if (!req.session.user) {
      if (link.visibleLoggedOut) {
        links.push(link);
      }
      return ;
    }

    // logged in
    if (link.requiredGroup) {// testing groups
      var inGroup = req.session.user.groups.indexOf(link.requiredGroup) > -1;
      if (inGroup) {
        links.push(link);
        return ;
      }
    }

    if (link.visibleLoggedIn) {
      links.push(link);
      return ;
    }
  });

  // Sort list by order specified
  links.sort(function(a, b) {
    return a.order - b.order;
  });
  return next();
};
app.use(navLinks);

app.use(function style(req, res, next) {
  var enqueuedStylesheets = [];

  res.locals.style = function(stylesheet, sort) {
    enqueuedStylesheets.push({
      css: stylesheet,
      sort: sort || 0
    });

    enqueuedStylesheets = enqueuedStylesheets.sort(function(a, b) {
      return a.sort - b.sort;
    });

    log.debug('enqueuedStylesheets', enqueuedStylesheets);
  };

  res.locals.enqueuedStylesheets = enqueuedStylesheets;
  next();
});

app.use(function script(req, res, next) {
  var enqueuedScripts = [];

  res.locals.script = function(script, opts, sort) {
    if (typeof opts === 'number') {
      sort = opts;
      opts = {};
    }

    enqueuedScripts.push({
      script: script,
      opts: opts || {},
      sort: sort || 0
    });

    enqueuedScripts = enqueuedScripts.sort(function(a, b) {
      return a.sort - b.sort;
    });

    log.debug('enqueuedScripts', enqueuedScripts);
  };

  res.locals.enqueuedScripts = enqueuedScripts;
  next();
});
