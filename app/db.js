// FEATURE IN DEVELOPMENT, DON'T USE FOR THE TIME BEING

var Sequelize = require('sequelize'),
	conf = require('./conf'),
	log = require('./logger').add('database');
	
var sql = new Sequelize(conf.db.dbname, conf.db.username, conf.db.password, {
		logging: false
	}),
	models = [];

// PUBLISHED METHODS

// get a new instance of a model, ready to accept attributes
exports.create = function(model) {
	if (!models[model]) {
		log.warn("Requested model "+model+" doesn't exist.");
		return;
	}
	
	log.trace('building new instance of '+model);
	var instance = models[model].build();
	
	// custom creation paramaters
	if (instance.onCreate) instance.onCreate(instance);
	
	return instance;
}

// send an updated instance back to the DB, optionally only updating certain attributes
exports.update = function(instance, attrs, callback) {
	log.trace('updating instance '+instance)
	// detect whether attrs & callback are present
	if (arguments[1] && arguments[1].constructor == Array) attrs = arguments[1]; // if array, those are the attrs
		else if (arguments[1].constructor == Function) {attrs = null; callback = arguments[1]; }
	if (arguments[2] && arguments[2].constructor == Function) callback = arguments[2];
	if (!callback) callback = new Function;
	
	// data housekeeping
	if (instance.onSave) instance.onSave(instance);
	
	instance.save(attrs).success(function(){
		log.trace('instance saved & updated');
		callback(null, instance);
	}).error(function(err){
		callback(err);
	});
	
}

// find and retreive instance(s) from DB based on search criteria
// criteria example: {name: 'A Project', id: [1,2,3]}
exports.find = function(model, criteria, callback) {
	if (!models[model]) return callback(new Error("Requested model doesn't exist."));
	
	// findAll will return an array of multiple results
	models[model].findAll({where: criteria}).success(function(instances){
		instances.forEach(function(item) {
			if (item.onGet) item.onGet(item);
		});
		callback(null, instances);
	}).error(function(err){
		callback(err);
	});
};

// get instance by id
exports.get = function(model, id, callback) {
	if (!models[model]) return callback(new Error("Requested model doesn't exist."));
	
	models[model].find(id).success(function(instance){
		if (instance.onGet) instance.onGet(instance);
		callback(null, instance);
	}).error(function(err){
		callback(err);
	});
}; 

// get all instances from a model, returned in array
exports.getAll = function(model, callback) {
	if (!models[model]) return callback(new Error("Requested model doesn't exist."));
	
	models[model].findAll().success(function(instances){
		instances.forEach(function(item) {
			if (item.onGet) item.onGet(item)
		});
		callback(null, instances);
	}).error(function(err){
		callback(err);
	});	
};

// retrieve a single instance, or create a new model with supplied criteria
exports.findOrCreate = function(model, criteria, callback) {
	log.trace('looking for '+model+' instance with '+JSON.stringify(criteria));
	exports.find(model, criteria, function(err, instances){
		if (err) callback(err);
		else {
			if (instances.length == 0) { // need to create a new model
				var created = exports.create(model);
				for (prop in criteria) { // apply criteria properties to new instance
					created[prop] = criteria[prop];
				}
				if (created.onCreate) created.onCreate(created);
				callback(null, created); // return new instance
				log.trace('new instance of '+model+' created');
			}
			else {
				if (instances[0].onGet) instances[0].onGet(instances[0]);
				callback(null, instances[0]); // return found instance
			}
		}
	})
}

// save an array of instances through a chain query
exports.chainSave = function(array, callback) {
	var chainer = new Sequelize.Utils.QueryChainer;
	array.forEach(function(member){
		if (member.onSave) member.onSave(member);
		chainer.add(member.save());
		log.trace('adding '+member.address+' to chain-op');
	});
	chainer.run().success(function(){
		log.trace('chain save completed');
		return callback();
	}).error(function(errors){
		return callback(errors);
	})
}




// STORAGE MODEL

/* additional instance methods:
	- onGet, onSave, onCreate: synchronous, each passed a copy of its own instance
*/

models.Groups = sql.define('Groups', { // mirrors output of ga-provisioning api
	id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
	address: {type: Sequelize.STRING, unique: true},
	name: Sequelize.STRING,
	urlName: Sequelize.STRING,
	emailPermission: Sequelize.STRING,
	permissionPreset: Sequelize.STRING,
	description: Sequelize.STRING,
	visible: {type: Sequelize.BOOLEAN, defaultValue: false}
});

models.Subscriptions = sql.define('Subscriptions', {
	user: {type: Sequelize.STRING, allowNull: false, unique: true, primaryKey: true},
	subscriptions: {type: Sequelize.TEXT}
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

models.Conf = sql.define('Conf', {
	key: {type: Sequelize.STRING, allowNull: false, unique: true, primaryKey: true},
	value: {type: Sequelize.STRING, allowNull: false}
});

models.Test = sql.define('SequelizeTest', {
	id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true},
	name: {type: Sequelize.STRING},
});



// SYNC (on startup)
sql.sync().success(function(){
	log.info('Data models synced & ready.');
}).error(function(err){
	log.error('sync error: ');
	log.error(err);
})





// TESTING

/*
exports.find('Test', {name: 'hello world'}, function(err, data) {
	if (err) console.log(err);
	else console.log(data.__factory.name);
	
});
*/

/*
models.Test = sql.define('SequelizeTest', {
	id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true},
	name: {type: Sequelize.STRING},
});

models.Test.sync().success(function(){
	console.log('successful sync!');

	var test = models.Test.build({
		name: 'another test'
	});
	var test = models.Test.build();
	
	test.name = 'Try something new.';
	test.save().success(function(){
		console.log('saved!');
	});
	
	
	models.Test.find(2).success(function(result){
		result.name = 'another PRESSED';
		result.save();
	});


}).error(function(err){
	console.log('sync fail :(');
	console.log(err);
});
*/