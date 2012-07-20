var path = require('path'),
	Common = require(global.__apppath+'/openmrsid-common'),
	log = Common.logger.add('groups'),
	db = Common.db,
	conf = Common.conf,
	app = Common.app,
	mid = Common.mid,
	nav = Common.userNav;

	
/*
DATABASE MODEL
==============
*/

db.define('Groups', { // mirrors output of ga-provisioning
	id: {type: db.INTEGER, primaryKey: true, autoIncrement: true},
	address: {type: db.STRING, unique: true},
	name: db.STRING,
	urlName: db.STRING,
	emailPermission: db.STRING,
	permissionPreset: db.STRING,
	description: db.STRING,
	visible: {type: db.BOOLEAN, defaultValue: false}
});

db.define('Subscriptions', {
	id: {type: db.INTEGER, primaryKey: true, autoIncrement: true},
	user: {type: db.STRING, allowNull: false, unique: true},
	subscriptions: {type: db.TEXT},
}, {
	instanceMethods: {
		onSave: function(instance){
			// JSON subscriptions object to string for storing as text
			if (typeof instance.subscriptions == 'object') {
				log.trace('converting subscriptions data from JSON to string');
				instance.subscriptions = JSON.stringify(instance.subscriptions);
			}
		},
		onGet: function(instance){
			// JSON text string to subscriptions object
			if (typeof instance.subscriptions == 'string') {
				log.trace('converting subscriptions data from string to JSON');
				instance.subscriptions = JSON.parse(instance.subscriptions);
			}
		}
	}
});

// Load module components now that DB structure is defined
var	ga = require('./ga-provisioning'),
	groupVisibilities = require('./sync').groupVisibilities;


/*
USER-NAV
========
*/
nav.add({
	"name": "Mailing Lists",
	"url": "/mailinglists",
	"viewName": "mailinglists",
	"visibleLoggedOut": false,
	"visibleLoggedIn": true,
	"requiredGroup": "dashboard-users",
	"icon": "icon-envelope-alt",
	"order": 50
});


/*
ROUTES
======
*/
app.get('/mailinglists', mid.forceLogin, function(req, res, next) {
	var user = req.session.user;
	
	// initiate variables
	var addresses = [], subscriptions = {};

	// use email address(es) to get all groups user belongs to
	addresses.push(user[conf.user.email]);
	if (user[conf.user.secondaryemail]) user[conf.user.secondaryemail].forEach(function(email){
		addresses.push(email);
	});
	
	// get all groups
	db.getAll('Groups', function(err, groups){
		if (err) return next(err);
		
		// load groups into subscription table & patch over preconfigured visibilities
		groups.forEach(function(group, idx){
			subscriptions[group.address] = [];
			if (groupVisibilities[group.address])
				group.visible = groupVisibilities[group.address];
		});
		

		var errored = false; // keeps next(err) from being called multiple times, which is _bad_
		addresses.forEach(function(email){
			ga.getGroupsByEmail(email, function(err, subbedGroups){
				if (err) {
					if (!errored) next(err);
					var errored = true;
					return;
				}
				
				// build subscriptions table
				subbedGroups.forEach(function(group){
					subscriptions[group.address].push(email);
				});
				
				finishLoading();
			});
		});
		
		var callbacks = 0;
		var finishLoading = function() {
			callbacks++;
			if (callbacks == addresses.length) { // every address has called back
				
				// RENDER THE PAGE
				res.render(__dirname+'/../views/mailinglists', {
					groups: groups,
					subs: subscriptions,
					emails: addresses
				});
				log.trace('mailinglists rendered, now storing subscriptions in DB');
				
				// store subscriptions for user in DB (occurs after page has loaded)
				db.findOrCreate('Subscriptions', {user: req.session.user[conf.ldap.user.username]}, function(err, instance){
					if (err) return log.error("Error saving user subscriptions to DB:\n"+JSON.stringify(err));
										
					// update with current subscriptions & push to DB
					instance.subscriptions = subscriptions;
					log.trace('pushing updated subscription instance to DB');
					db.update(instance, function(err) {
						if (err) return log.error("Error saving user subscriptions to DB:\n"+JSON.stringify(err));
						log.trace('DB update returned successfully');
					});
				});
			}
		}
	
	});
});

// allows direct linking to a list
app.get('/mailinglists/:group', function(req, res, next){
	res.redirect('/mailinglists#'+req.params.group);
});

app.post('/mailinglists/:group', mid.forceLogin, function(req, res, next) { // both sub and unsub's get posted here
	// detect whether this is in AJAX call
	var ajax = (req.header('X-Requested-With') == 'XMLHttpRequest') ? true : false;
	log.trace('incoming ajax request: '+ajax);

	var user = req.session.user,
		group = req.params.group;
		
	if (!req.body.address) req.body.address = []; // if empty, should be represented as a blank array
	var	updatedAddresses = (req.body.address.constructor == Array) ? req.body.address : [req.body.address];
		
	// get array of all a user's email addresses
	var userEmails = [];
	userEmails.push(user[conf.user.email]);
	if (user[conf.user.secondaryemail]) user[conf.user.secondaryemail].forEach(function(email){
		userEmails.push(email);
	});
	
	// get group with this url-name, to find its email address	
	db.find('Groups', {urlName: group}, function(err, instance){
		if (err) return handleError(err);
		var groupEmail = instance[0].address;
				
		// get subscriptions from database, to determine changes made
		db.find('Subscriptions', {user: user[conf.ldap.user.username]}, function(err, instance){
			if (err) return handleError(err);
			if (!instance || instance.length == 0) return handleError(new Error('Unable to retrieve groups.'));
			var oldSubs = instance[0].subscriptions;
						
			var updatedSubs = {};
			updatedSubs[groupEmail] = updatedAddresses; // in the same format as oldSubs
			
			var actions = {}, errored = false;
			
			var handleError = function(err){ // response to AJAX properly, keeps from getting caught in an error-loop
				if (!errored) {
					errored = true;
					if (ajax) { // respond with JSON
						return res.send(err.message, 500);
					}
					else {
						return next(err);
					}
				}
			}
			
			var updateCallsNeeded = userEmails.length, updateCallsReturned = 0;
			var finishSubscriptionUpdate = function(){
				updateCallsReturned++;
				log.debug('subscription finished for an email address, '+updateCallsReturned+' of '+updateCallsNeeded);
				if (updateCallsReturned == updateCallsNeeded) { // done
					// create list of all user's subscriptions including those just updated
					var newSubList = oldSubs;
					for (list in updatedSubs) {oldSubs[list] = updatedSubs[list]};
					
					// push new subscriptions to DB
					instance[0].subscriptions = newSubList;
					db.update(instance[0], function(err) {
						log.trace('pushed new subscription list to DB');
						if (err) handleError(err);
					});
				
					// server is finished; send the response back
					if (ajax) { // send JSON response
						log.trace('sending ajax response');
						res.contentType('application/json');
						return res.send(updatedSubs[groupEmail], 200); // send JSON array of subscriptions to group
					}
					else {
						log.trace('sending redirect repsonse');
						req.flash('success', 'Subscriptions updated for '+group);
						return res.redirect('/mailinglists', 303);
					}
				}
			}
			
			// do the actual subscription - handle any contradiction between old and updated subs
			userEmails.forEach(function(email){
				if (oldSubs[groupEmail].indexOf(email) > -1 && updatedSubs[groupEmail].indexOf(email) == -1) {
					// remove email from group
					log.trace('removing '+email+' from '+group);
					ga.removeUser(email, group, function(err) {
						if (err) handleError(err);
						log.info(user[conf.user.username]+': '+email+' unsubscribed from '+group);
						finishSubscriptionUpdate();
					});
				}
				else if (oldSubs[groupEmail].indexOf(email) == -1 && updatedSubs[groupEmail].indexOf(email) > -1) {
					// add email to group
					log.trace('adding '+email+' to '+group);
					ga.addUser(email, group, function(err, result) {
						if (err) handleError(err);
						log.info(user[conf.user.username]+': '+email+' subscribed to '+group);
						finishSubscriptionUpdate();
					});
				}
				else finishSubscriptionUpdate(); // no change made
			});
			
			
		});
	});
	
});

app.get('/mailinglists/resource/*', function(req, res, next){
	var resourcePath = path.join(__dirname, '/../resource/', req.params[0]);
	res.sendfile(resourcePath);
});