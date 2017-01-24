'use strict';
const log = require('log4js').addLogger('render-helpers');
const app = require('./app');
const conf = require('./conf');
const userNav = require('./user-nav');

// insert our own GLOBAL variables to be used in rendering
app.locals.defaultSidebar = conf.defaultSidebar;
app.locals.aboutHTML = conf.aboutHTML;
app.siteURL = conf.site.url;

//flash
app.use(function flash(req, res, next) {
	// Makes it easier to display flash messages,
	// which are created via req.flash() and erased each page render
	res.locals.flash = req.session ? req.flash() : null;
	return next();
});

//navLinks
const navLinks = (req, res, next) => {
	// Uses login state and privileges to generate the links to
	// include in the user navigation bar

	// directly skip, if no session exists
	if (!req.session) {
		return next();
	}

	const list = userNav.list;
	const links = [];
	res.locals.navLinks = links;

	log.trace('userNavLinks: entering for loop');
	if (req.session.user) {
		log.trace('userNavLinks: current groups: ' +
			req.session.user.groups.toString());
	}

	// Build list of links to display
	list.forEach(link => {
		// determine if session has access to page

		// not logged in
		if (!req.session.user) {
			if (link.visibleLoggedOut) {
				links.push(link);
			}
			return;
		}

		// logged in
		if (link.requiredGroup) { // testing groups
			const inGroup = req.session.user.groups.indexOf(link.requiredGroup) > -1;
			if (inGroup) {
				links.push(link);
				return;
			}
		}

		if (link.visibleLoggedIn) {
			links.push(link);
			return;
		}
	});

	// Sort list by order specified
	links.sort((a, b) => a.order - b.order);
	return next();
};
app.use(navLinks);