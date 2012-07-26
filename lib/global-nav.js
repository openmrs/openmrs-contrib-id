var path = require('path'),
	url = require('url'),
	Common = require(global.__commonModule),
	app = Common.app,
	db = Common.db,
	mid = Common.mid,
	log = Common.logger.add('module-global-nav'),
	admin = Common.module.admin;

/*
DATA MODEL
==========
*/

db.define('GlobalNavLinks', {
	id: {type: db.INTEGER, primaryKey: true, autoIncrement: true},
	name: db.STRING,
	url: db.STRING,
	popover: db.TEXT
});

/*
db.define('GlobalNavConfig', {
	id: {type: db.INTEGER, primaryKey: true, autoIncrement: true},
	name: db.STRING,
	value: db.TEXT
});
*/

/*
ADMIN PAGE
==========
*/
admin.addModulePage('Global Navigation', '/admin/globalnav');


/*
ROUTES
======
*/

// request made by clients iframes
app.get('/globalnav', function(req, res, next){
	// redirect non-ajax requests to homepage
	if (!req.isXMLHttpRequest) return res.redirect('/');
	
	// get current links from DB
	db.getAll('GlobalNavLinks', function(err, links){
	
		// get hostname of URL to compare
		var referrer = req.header('Referer');
		log.trace('Referrer: '+referrer);	
		if (referrer) {
			var refHost = url.parse(referrer).host;
		}
		
		// find link page is currently at (if any)
		var activeLink;
		for (i in links) {
			var linkUrl = url.parse(links[i].url);
			
			if (refHost == linkUrl.host) {
				activeLink = links[i];
			}
		}
		
		// render & send the page (along with render variables)
		res.render(__dirname+'/../views/global-nav', {
			layout: false,
			links: links,
			activeLink: activeLink
		});
	});
});


app.get('/admin/globalnav', mid.restrictTo('dashboard-administrators'), admin.useSidebar, function(req, res, next){
	db.getAll('GlobalNavLinks', function(err, links){
		res.render(__dirname+'/../views/globalnav-admin', {links: links});
	});
});

app.post('/admin/globalnav', mid.restrictTo('dashboard-administrators'), function(req, res, next){
	// form body to array
	var generatedList = [];
	for (a in req.body) {
		var split = /([0-9])-(\D+)/.exec(a), // splits to name and number of input
			ind = split[1], type = split[2];
			
		if (!req.body[a]) break; // skip if this link is blank
			
		if (!generatedList[ind]) {
			generatedList[ind] = {}; // create if it doesn't exist (first item of this link)
			generatedList[ind].id = ind;
		}
		
		generatedList[ind][type] = req.body[a];
	}
	
	log.warn('list: ');
	log.warn(generatedList);
	
	// push to DB
	var chain = [], dbFinished = 0;
	db.sync('GlobalNavLinks', {force: true}, function(err){ // clear DB
		if (err) return next(err);
		
		for (link in generatedList) {
			
			var inst = db.create('GlobalNavLinks');
			inst.name = generatedList[link].name;
			inst.url = generatedList[link].url;
			
			chain.push(inst);
		}
		
		// save chain to DB
		db.chainSave(chain, function(err){
			if (err) return next(err);
			req.flash('success', 'Global navigation links updated.');
			res.redirect('/admin/globalnav');
		});
	});
	
});


app.get('/globalnav/*', function(req, res, next) {

	// resolve the path
	var file = path.join(__dirname, '/../resource/', req.params[0]);
	
	// transmit the file
	res.sendfile(file, function(err){
		if (err) return next(err);
	});
});