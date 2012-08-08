var Common = require('./openmrsid-common'),
	app = Common.app,
	log = Common.logger.add('render-helpers'),
	conf = Common.conf,
	userNav = Common.userNav,
	url = require('url');

// insert our own helpers to be used in rendering
app.helpers({
	// reset error validation variables
	clearErrors: function() {
		app.helpers({failed: false, values: {}, fail: {}, failReason: {}});
	},
	defaultSidebar: conf.defaultSidebar,
	
	failed: false, fail: {}, values: {},
	aboutHTML: conf.aboutHTML,
	siteURL: conf.siteURL,
	conf: conf,
	url: url
});

app.dynamicHelpers({
	flash: function(req){
		// Makes it easier to display flash messages, which are created via req.flash() and erased each page render
		return req.flash();
	},

	clear: function(){
		// Change undefined variables to default values; keep us from getting "undefined" errors from EJS
		var current = app.helpers()._locals, replace = new Object;
		
		replace.title = (current.title) ? current.title : conf.site.title;
		replace.failed = (current.failed) ? current.failed : false;
		replace.showHeadlineAvatar = (current.showHeadlineAvatar) ? current.showHeadlineAvatar : true;
		replace.showSidebar = (current.showSidebar) ? current.showSidebar : true;
		
		['defaultSidebar', 'sidebar'].forEach(function(prop){
			replace[prop] = (current[prop]) ? current[prop] : [];
		});
		['bodyAppend', 'headAppend', 'headline', 'aboutHTML', 'viewName', 'sentTo', 'emailUpdated'].forEach(function(prop){
			replace[prop] = (current[prop]) ? current[prop] : '';
		});
		['flash', 'fail', 'values', 'failReason', 'navLinks', 'progress', 'sidebarParams'].forEach(function(prop){
			replace[prop] = (current[prop]) ? current[prop] : {};
		});
		app.helpers(replace);
	},
	
	userNavLinks: function(req, res){
		// Uses login state and privileges to generate the links to include in the user navigation bar		

		var list = userNav.list;
			toRender = [];
			
		log.trace('userNavLinks: entering for loop');
		if (req.session.user) log.trace('userNavLinks: current groups: '+req.session.user.memberof.toString());
		
		// Build list of links to display
		list.forEach(function(link){
			
			// determine if session has access to page
			if (link.requiredGroup) {
					if (req.session.user && req.session.user.memberof.indexOf(link.requiredGroup) > -1)
						toRender.push(link);
					else if (link.visibleLoggedIn) {
						if (req.session.user) toRender.push(link);
					}
			}
			if (link.visibleLoggedIn && !link.requiredGroup) {
				if (req.session.user) toRender.push(link);
			}
			if (link.visibleLoggedOut) {
				if (!req.session.user) toRender.push(link);
			}
		});
		
		// Sort list by order specified
		toRender.sort(function(a, b){
			return a.order - b.order;
		});
		
		// Hand the result back to EJS
		app.helpers({navLinks: toRender});
		
		// debug
		var names = '';
		for (page in toRender) names += page+', ';
		log.trace('will render nav-links: '+names);
	}
	
});