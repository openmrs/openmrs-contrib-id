var fs = require('fs'),
	ga = require('./ga-provisioning'),
	log = require('../logger').add('groups'),
	db = require('../db.js'),
	conf = require('../conf.js'),
	app = require('../app').app,
	mid = require('../express-middleware'),
	groupVisibilities = {};


// Routes
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
				
				res.render('mailinglists', {
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

app.post('/mailinglists/:group', function(req, res, next) { // both sub and unsub's get posted here
	// detech whether this is in AJAX call
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

// GGroups Sync
var syncGroups = function(callback) {
	log.debug('Syncing Google Groups to DB...');
	ga.getAllGroups(function(err, groupList){
		log.trace('getAllGroups returned from provisioning api');
		if (err) return callback(new Error("Unable to retreive groups: "+err.message+"\n"+err.stack));
		
		var dbGroupList = [];
		var loopsNeeded = groupList.length, idx = 0, attr;
		
		// will be called once for each group
		var handleGroup = function(idx, callback) {
			var gaGrp = groupList[idx];
			db.find('Groups', {address: gaGrp.address}, function(err, dbGrp){
				dbGrp = dbGrp[0]; // only want the first result
				//log.debug(dbGrp);
				
				if (err) return callback(err);
				if (dbGrp) { // this group already exists in DB
					
					log.debug('group '+gaGrp.address+' exists in DB');
					for (attr in gaGrp) {
						if ((gaGrp[attr] && !dbGrp[attr]) || (gaGrp[attr] != dbGrp[attr])) { // if attr different or not present in DB
							log.debug(gaGrp.address+': '+attr+': '+gaGrp[attr]+' != '+dbGrp[attr]);
							dbGrp[attr] = gaGrp[attr];
						}
					}
				}
				
				else { // create group in DB and populate it
					log.debug('group '+gaGrp.address+' does not exist, creating instance...');
					var dbGrp = db.create('Groups');
					for (attr in gaGrp) {
						log.trace('adding attribute '+attr+' to instance');
						dbGrp[attr] = gaGrp[attr];
					}
				}
				dbGroupList.push(dbGrp);
				callback(null);
			});
		};
		
		// loops through all the groups to add
		var loop = function(){
			handleGroup(idx, function(err){
				if (err) return callback(err);
				
				// finish if looping has completed, otherwise continue
				if (idx == loopsNeeded-1)
					finish();
				else {
					idx++;
					loop();
				}
			});
		}
		
		var finish = function() { // is it really over so soon?
			log.trace('finished looping through groups');
			
			db.chainSave(dbGroupList, function(err){
				if (err) return callback(err);
				
				//all done!
				log.info('Google Groups synced to local DB.');
				callback();
			})

		}
		
		loop(); // call once to begin
	});
	
}
var syncLoop = function(){
	syncGroups(function(err){
		if (err) log.error(err);
	});
}

// Startup
syncLoop(); setInterval(syncLoop, conf.groups.syncInterval);
fs.readFile(__dirname+'/group-visibility.json', function(err, data) { // Load group-visibilities	
	if (err) throw err;
	groupVisibilities = JSON.parse(data);
});


// Tests 
/*
syncGroups(function(err){
	if (err) return log.error(err);
	log.info('done.');
});
*/
