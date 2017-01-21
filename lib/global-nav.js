'use strict';
const path = require('path');
const url = require('url');
const express = require('express');
const cors = require('cors');

const mid = require('../../../express-middleware');
const conf = require('../../../conf');
const log = require('log4js').addLogger('module-global-nav');

const low = require('lowdb');
const db = low(path.join(__dirname, 'db.json'));


const subApp = express();
subApp.set('view engine', 'pug');

// CORS support (allow navbar code to be loaded from different origins)
subApp.use(cors());

// request made by clients
subApp.get('/globalnav', (req, res, next) => {

	const links = db.get('GlobalNavLinks');
	const prefs = db.get('GlobalNavPrefs');

	// create settings object from prefs instances
	const prefsObj = {};
	prefs.forEach(inst => {
		prefsObj[inst.key] = inst.value;
	});

	const referrer = url.parse(req.header('Referer') || '');
	let bestMatch;
	let match;
	links.each(link => {
		const parsed = url.parse(link.url);
		if (referrer.host === parsed.host) {
			match = link.url;
			if (referrer.pathname.replace(/\/$/, '') === parsed.pathname.replace(/\/$/, '')) {
				bestMatch = link.url;
			}
		}
	});

	// render & send the page (along with render variables)
	res.render(`${__dirname}/../views/global-nav`, {
		links: links.value(),
		prefs: prefsObj,
		matche: bestMatch || match,
	});
});


subApp.use('/globalnav', express.static(path.join(__dirname, '/../resource/')));

exports = module.exports = app => {


	app.admin.addPage('Global Navigation', '/admin/globalnav');
	app.use(subApp);

	// panel for global navbar
	app.get('/admin/globalnav', (req, res, next) => {

		const links = db.get('GlobalNavLinks');
		const prefs = db.get('GlobalNavPrefs');
		const scriptURL = url.resolve(conf.site.url, '/globalnav/js/app-optimized.js');

		res.render(`${__dirname}/../views/globalnav-admin`, {
			links: links.value(),
			prefs: prefs.value(),
			scriptURL: scriptURL,
		});
	});



	//update links
	app.post('/admin/globalnav/links', mid.parseParamTable,
		(req, res, next) => {

			const params = res.locals.params;

			// refresh db
			const links = db.get('GlobalNavLinks');
			links.remove();

			for (const link in params) {
				log.debug(`creating link: ${JSON.stringify(params[link])}`);

				const inst = {};
				inst.id = params[link].id;
				inst.name = params[link].name;
				inst.url = params[link].url;

				links.push(inst);
			}
			req.flash('success', 'Global navigation links updated.');
			res.redirect(303, '/admin/globalnav');
		});

	app.post('/admin/globalnav/prefs', (req, res, next) => {

		const prefs = db.get('GlobalNavPrefs');
		for (const name in req.body) {
			log.debug(`finding config value ${name}`);
			const inst = prefs.find({
				key: name
			});
			inst.value = req.body[name];
		}
		db.write();

		req.flash('success', 'Preferences updated.');
		res.redirect(303, '/admin/globalnav');
	});


};
