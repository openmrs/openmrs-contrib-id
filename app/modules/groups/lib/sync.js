var fs = require('fs'),
	ga = require('./ga-provisioning'),
	Common = require(global.__apppath+'/openmrsid-common'),
	log = Common.logger.add('groups'),
	db = Common.db,
	conf = Common.conf;

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
					
					log.trace('group '+gaGrp.address+' exists in DB');
					for (attr in gaGrp) {
						if ((gaGrp[attr] && !dbGrp[attr]) || (gaGrp[attr] != dbGrp[attr])) { // if attr different or not present in DB
							log.trace(gaGrp.address+': '+attr+': '+gaGrp[attr]+' != '+dbGrp[attr]);
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

// Load group-visibilities	
var data = fs.readFileSync(__dirname+'/group-visibility.json', 'utf8');
exports.groupVisibilities = JSON.parse(data);
