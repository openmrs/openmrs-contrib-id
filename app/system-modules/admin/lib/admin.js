var Common = require(global.__commonModule),
	app = Common.app,
	utils = require('connect').utils,
	mid = Common.mid,
	nav = Common.userNav,
	path = require('path');
	
var modulePages = [];

/*
USER-NAV
========
*/
nav.add({
	name: "Admin",
	url: "/admin",
	viewName: "admin",
	requiredGroup: "dashboard-administrators",
	icon: "icon-wrench",
	order: 100
});

/*
EXPORTS
=======
*/
// add a link to the admin sidebar
exports.addModulePage = function(name, url){
	modulePages.push({name: name, url: url});
};
// middleware, restricts to admin group, adds user-nav, css, and sidebar to any page
exports.useSidebar = [mid.restrictTo('dashboard-administrators'),
	function(req, res, next) {
	var sidebar = res.local('sidebar') || [], // get current sidebar and params
		params = res.local('sidebarParams') || {},
		head = res.local('headAppend') || '';
	
	// merge admin-sidebar with current
	res.local('sidebar', sidebar.concat(__dirname+'/../views/sidebar-admin'));
	params[__dirname+'/../views/sidebar-admin'] = {
		className: 'box',
		locals: {
			pages: modulePages,
			reqUrl: req.url
		}
	};
	res.local('sidebarParams', params);
	
	// merge admin.css with headAppend
	res.local('headAppend', head+'<link rel="stylesheet" href="/admin/resource/admin.css">');
	
	// set view name to admin for user-nav
	res.local('name', 'admin');
	next();
}];

// expose in the common module
Common.module.admin = exports;


/*
ROUTES
======
*/
app.get('/admin', mid.restrictTo('dashboard-administrators'), exports.useSidebar, function(req, res, next) {
	res.render(__dirname+'/../views/admin');
});
exports.addModulePage('Welcome', '/admin'); // add this page to the list


// resource loading
app.get('/admin/resource/*', function(req, res, next) {

	// resolve the path
	var file = path.join(__dirname, '/../resource/', req.params[0]);
	
	// transmit the file
	res.sendfile(file, function(err){
		if (err) return next(err);
	});
});