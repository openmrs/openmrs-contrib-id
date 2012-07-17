var path = require('path'),
	url = require('url'),
	Common = require(global.__commonModule),
	app = Common.app,
	log = Common.logger.add('module-global-nav');

/*
DATA MODEL
==========
*/
// To do: write the data model
var links = [
	{
		name: 'OpenMRS',
		url: 'http://openmrs.org/',
	},
	{
		name: 'ID',
		url: 'http://localhost:3000/',
	},	
	{
		name: 'Wiki',
		url: 'http://wiki.openmrs.org/',
	},
	{
		name: 'JIRA',
		url: 'http://tickets.openmrs.org/',
	},
	{
		name: 'Bamboo',
		url: 'http://ci.openmrs.org/',
	},
	{
		name: 'FishEye and Crucible',
		url: 'http://source.openmrs.org/',
	},
	{
		name: 'Answers',
		url: 'http://answers.openmrs.org/',
	},
	{
		name: 'OMRS12',
		url: 'http://events.openmrs.org/',
	}
];


/*
ROUTES
======
*/

// request made by clients iframes
app.get('/globalnav', function(req, res, next){
	// redirect non-ajax requests to homepage
	if (!req.isXMLHttpRequest) return res.redirect('/');
	
	// get hostname of URL to compare
	var referrer = req.header('Referer');
	log.debug('Referrer: '+referrer);	
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


app.get('/globalnav/*', function(req, res, next) {

	// resolve the path
	var file = path.join(__dirname, '/../resource/', req.params[0]);
	
	// transmit the file
	res.sendfile(file, function(err){
		if (err) return next(err);
	});
});