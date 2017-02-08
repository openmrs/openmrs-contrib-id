'use strict';
/*jshint expr: true*/
const _ = require('lodash');
const expect = require('chai').expect;
const async = require('async');

const User = require('../app/models/user');
const Group = require('../app/models/group');
const ldap = require('../app/ldap');
const utils = require('../app/utils');
const conf = require('../app/conf');

// data for testing purposes
const VALID_EMAIL1 = 'foo@bar.com';
const VALID_EMAIL2 = 'no@mistake.com';
const VALID_EMAIL3 = 'hello@world.com';
const VALID_EMAIL4 = 'foo@baz.com';
const ORPHAN_EMAIL = 'im@lonely.com';

const INVALID_EMAIL = 'badatgoogle.com';


const VALID_USERNAME1 = 'Plypy';
const VALID_USERNAME2 = 'plypx';
const VALID_USERNAME3 = ' usernamewithspaces ';

const INVALID_USERNAME = 'Ply_py'; // contain one underscore

const SIMPLE_STRING = 'string';
const DOUBLE_STRING = SIMPLE_STRING + SIMPLE_STRING;

const VALID_PASSWORD = 'UCvvmJuqCbDyejN2+Hz3MwDnO8baGPbiHOckfsBU2Yfw22Xc609UhG8nke/h2+HFd0f8qJBTnltbtyM7r50SmYRE3qAMvu1pqpkqbANbaQ3OV54zldpzZi2bOaJyq87CnnGLBM';

const VALID_INFO1 = {
	username: VALID_USERNAME1,
	firstName: SIMPLE_STRING,
	lastName: SIMPLE_STRING,
	displayName: SIMPLE_STRING,
	primaryEmail: VALID_EMAIL1,
	displayEmail: VALID_EMAIL2,
	emailList: [VALID_EMAIL1, VALID_EMAIL3],
	password: VALID_PASSWORD,
	groups: [],
	locked: false,
	skipLDAP: true,
};

const VALID_INFO2 = {
	username: VALID_USERNAME2,
	primaryEmail: VALID_EMAIL2,
	firstName: DOUBLE_STRING,
	lastName: DOUBLE_STRING,
	displayEmail: VALID_EMAIL2,
	emailList: [VALID_EMAIL2],
	password: DOUBLE_STRING,
	locked: true,
	skipLDAP: true,
};


const VALID_INFO3 = {
	username: VALID_USERNAME3,
	firstName: SIMPLE_STRING,
	lastName: SIMPLE_STRING,
	displayName: SIMPLE_STRING,
	primaryEmail: VALID_EMAIL4,
	displayEmail: VALID_EMAIL4,
	emailList: [VALID_EMAIL4],
	password: VALID_PASSWORD,
	groups: [],
	locked: false,
	skipLDAP: true,
};

const GROUP_NAME1 = 'Mafia';

const ORPHAN_GROUP_NAME = 'Brotherhood';

const GROUP1 = {
	groupName: GROUP_NAME1,
	skipLDAP: true,
};

const DUP_ERROR_CODE = 11000;


describe('User', () => {
	before(done => {
		let flag = false;
		async.series([
				callback => {
					User.ensureIndexes();
					User.on('index', callback);
				},
				callback => {
					User.remove(callback);
				},
			],
			err => {
				if (flag) {
					return;
				}
				flag = true;
				done(err);
			});
	});

	afterEach(done => {
		User.remove(done);
	});

	after(done => {
		async.series([
				callback => {
					User.remove(callback);
				},
			],
			err => {
				done(err);
			});
	});

	it('should store the valid users well', done => {
		const user1 = new User(VALID_INFO1);
		const user2 = new User(VALID_INFO2);
		const user3 = new User(VALID_INFO3);
		async.parallel([
				callback => {
					user1.save(callback);
				},
				callback => {
					user2.save(callback);
				},
				callback => {
					user3.save(callback);
				}
			],
			err => {
				expect(err).to.be.null;

				User.find({}, (err, users) => {
					expect(err).to.be.null;
					expect(users).to.have.length(3);
					done();
				});
			});

	});

	it('should fail when two user have same username', done => {
		const dupUsernameInfo = _.cloneDeep(VALID_INFO2);
		dupUsernameInfo.username = VALID_INFO1.username.toUpperCase();

		const user1 = new User(VALID_INFO1);
		const user2 = new User(dupUsernameInfo);
		async.parallel([
				callback => {
					user1.save(callback);
				},
				callback => {
					user2.save(callback);
				}
			],
			err => {
				expect(err).to.exist;
				expect(err).to.have.property('code', DUP_ERROR_CODE);
				done();
			});

	});

	// it('should fail when the username is invalid', function(done) {
	//   var invalidUsernameInfo = _.cloneDeep(VALID_INFO1);
	//   invalidUsernameInfo.username = INVALID_USERNAME;

	//   var user = new User(invalidUsernameInfo);
	//   user.save(function(err) {
	//     expect(err).to.exist;
	//     expect(err).to.have.property('name', 'ValidationError');
	//     expect(err).to.have.property('errors');
	//     expect(err.errors).to.have.property('username');
	//     done();
	//   });
	// });

	it('should fail when the username is missing', done => {
		const noUsernameInfo = _.cloneDeep(VALID_INFO1);
		delete noUsernameInfo.username;

		const user = new User(noUsernameInfo);
		user.save(err => {
			expect(err).to.exist;
			expect(err).to.have.property('name', 'ValidationError');
			expect(err).to.have.property('errors');
			expect(err.errors).to.have.property('username');
			done();
		});
	});

	// it ('should fail when the displayEmail is invalid', function(done) {
	//   var invalidDisplayEmailInfo = _.cloneDeep(VALID_INFO1);
	//   invalidDisplayEmailInfo.displayEmail = INVALID_EMAIL;

	//   var user = new User(invalidDisplayEmailInfo);
	//   user.save(function (err) {
	//     expect(err).to.exist;
	//     expect(err).to.have.property('name', 'ValidationError');
	//     expect(err).to.have.property('errors');
	//     expect(err.errors).to.have.property('displayEmail');
	//     done();
	//   });
	// });

	it('should fail when the primaryEmail is missing', done => {
		const noPrimaryEmailInfo = _.cloneDeep(VALID_INFO1);
		delete noPrimaryEmailInfo.primaryEmail;

		const user = new User(noPrimaryEmailInfo);
		user.save(err => {
			expect(err).to.exist;
			expect(err).to.have.property('name', 'ValidationError');
			expect(err).to.have.property('errors');
			expect(err.errors).to.have.property('primaryEmail');
			done();
		});
	});

	it('should fail when the primaryEmail is not in List', done => {
		const orphanPrimaryEmailInfo = _.cloneDeep(VALID_INFO1);
		orphanPrimaryEmailInfo.primaryEmail = ORPHAN_EMAIL;

		const user = new User(orphanPrimaryEmailInfo);
		user.save(err => {
			expect(err).to.exist;
			expect(err).to.have.property('name', 'ValidationError');
			expect(err).to.have.property('errors');
			expect(err.errors).to.have.property('primaryEmail');
			done();
		});
	});

	it('should fail when the emailList is empty', done => {
		const emptyEmailListInfo = _.cloneDeep(VALID_INFO1);
		emptyEmailListInfo.emailList = [];

		const user = new User(emptyEmailListInfo);
		user.save(err => {
			expect(err).to.exist;
			expect(err).to.have.property('name', 'ValidationError');
			expect(err).to.have.property('errors');
			expect(err.errors).to.have.property('emailList');
			done();
		});
	});

	// it('should fail when the emailList have invalid email', function(done) {
	//   var invalidEmailListInfo = _.cloneDeep(VALID_INFO1);
	//   invalidEmailListInfo.emailList.push(INVALID_EMAIL);

	//   var user = new User (invalidEmailListInfo);
	//   user.save(function (err) {
	//     expect(err).to.exist;
	//     expect(err).to.have.property('name', 'ValidationError');
	//     expect(err).to.have.property('errors');
	//     expect(err.errors).to.have.property('emailList');
	//     done();
	//   });
	// });

	it('should fail when the emailList have duplicate emails', done => {
		const dupEmailListInfo = _.cloneDeep(VALID_INFO1);
		dupEmailListInfo.emailList.push(ORPHAN_EMAIL);
		dupEmailListInfo.emailList.push(ORPHAN_EMAIL.toUpperCase());

		const user = new User(dupEmailListInfo);
		user.save(err => {
			expect(err).to.exist;
			expect(err).to.have.property('name', 'ValidationError');
			expect(err).to.have.property('errors');
			expect(err.errors).to.have.property('emailList');
			done();
		});
	});

	it('should fail when the groups have duplicate members', done => {
		const dupGroupsInfo = _.cloneDeep(VALID_INFO1);
		dupGroupsInfo.groups = [GROUP_NAME1, GROUP_NAME1];

		const user = new User(dupGroupsInfo);
		user.save(err => {
			expect(err).to.exist;
			expect(err).to.have.property('name', 'ValidationError');
			expect(err).to.have.property('errors');
			expect(err.errors).to.have.property('groups');
			done();
		});
	});

	// it('should fail when the password is missing', function(done) {
	//   var noPasswordInfo = _.cloneDeep(VALID_INFO1);
	//   delete noPasswordInfo.password;

	//   var user = new User (noPasswordInfo);
	//   user.save(function (err) {
	//     expect(err).to.exist;
	//     expect(err).to.have.property('name', 'ValidationError');
	//     expect(err).to.have.property('errors');
	//     expect(err.errors).to.have.property('password');
	//     done();
	//   });
	// });

	it('should fail when the locked status is missing', done => {
		const noLocked = _.cloneDeep(VALID_INFO1);
		delete noLocked.locked;

		const user = new User(noLocked);
		user.save(err => {
			expect(err).to.exist;
			expect(err).to.have.property('name', 'ValidationError');
			expect(err).to.have.property('errors');
			expect(err.errors).to.have.property('locked');
			done();
		});
	});

	it('should omit sensitive and internal attributes when transformed to JSON', done => {
		const user = new User(VALID_INFO1);
		user.save(err => {
			const json = user.toJSON();
			expect(json).to.not.have.property('password');
			expect(json).to.not.have.property('locked');
			expect(json).to.not.have.property('inLDAP');
			expect(json).to.not.have.property('skipLDAP');
			expect(json).to.not.have.property('createdAt');
			expect(json).to.not.have.property('__v');
			done();
		});
	});

	/// Some API tests
	describe('finders', () => {
		let userx;
		beforeEach(done => {
			userx = new User(VALID_INFO1);
			userx.save(done);
		});

		describe('User.findByUsername', () => {
			it('should find the record case-insensitively', done => {
				const name = userx.username;
				async.each([
						name,
						name.toLowerCase(),
						name.toUpperCase()
					],
					(username, callback) => {
						User.findByUsername(username, (err, user) => {
							if (err) {
								return callback(err);
							}
							expect(user.username).to.be.equal(userx.username);
							return callback();
						});
					}, done);
			});
		});

		describe('User.findByEmail', () => {
			it('should find the record case-insensitively', done => {
				const email = userx.primaryEmail;
				async.each([
						email,
						email.toLowerCase(),
						email.toUpperCase()
					],
					(email, callback) => {
						User.findByEmail(email, (err, user) => {
							if (err) {
								return callback(err);
							}
							expect(user.username).to.be.equal(userx.username);
							return callback();
						});
					}, done);
			});
		});

	});

	describe('hook with groups', () => {
		let groupx;
		before(done => {
			groupx = new Group(GROUP1);
			groupx.save(done);
		});

		after(done => {
			Group.remove(done);
		});

		beforeEach(done => {
			Group.findOneAndUpdate({
				groupName: groupx.groupName
			}, {
				member: []
			}, done);
		});

		it('should save the user reference as well in groups', done => {
			const userInfo = _.cloneDeep(VALID_INFO1);
			const user = new User(userInfo);
			user.groups.push(groupx.groupName);

			user.save(err => {
				expect(err).to.be.null;
				Group.findOne({
					groupName: groupx.groupName
				}, (err, group) => {
					expect(err).to.be.null;
					expect(group.indexOfUser(user.username)).not.to.equal(-1);
					expect(group.member).to.have.length(1);
					done();
				});
			});
		});

		it('should fail when the group does not exist', done => {
			const userInfo = _.cloneDeep(VALID_INFO1);
			const user = new User(userInfo);
			user.groups.push(ORPHAN_GROUP_NAME);

			user.save(err => {
				expect(err).to.exist;
				done();
			});
		});

		it('should update groups relation on both side', done => {
			const userInfo = _.cloneDeep(VALID_INFO1);
			const user = new User(userInfo);
			user.groups.push(groupx.groupName);

			async.series([
				function initSave(callback) {
					user.save(callback);
				},

				function deleteGroup(callback) {
					user.groups = [];
					user.save(callback);
				},

				function check(callback) {
					Group.findOne({
						groupName: groupx.groupName
					}, (err, group) => {
						expect(err).to.be.null;
						expect(group.indexOfUser(user.username)).to.equal(-1);
						expect(group.member).to.have.length(0);
						return callback();
					});
				},

				function addGroup(callback) {
					user.groups = [groupx.groupName];
					user.save(callback);
				},

				function checkAgain(callback) {
					Group.findOne({
						groupName: groupx.groupName
					}, (err, group) => {
						expect(err).to.be.null;
						expect(group.indexOfUser(user.username)).not.to.equal(-1);
						expect(group.member).to.have.length(1);
						return callback();
					});
				},

				function deleteUser(callback) {
					user.remove(callback);
				},

				function checkMore(callback) {
					Group.findOne({
						groupName: groupx.groupName
					}, (err, group) => {
						expect(err).to.be.null;
						expect(group.member).to.be.empty;
						return callback();
					});
				},

			], done);
		});
	});

	// TODO test with LDAP

});

describe('sync with LDAP', () => {
	let userx;
	before(done => {
		userx = new User(VALID_INFO1);
		userx.username = 'uniqueuniquelonglong';
		userx.skipLDAP = undefined;
		userx.save(done);
	});

	it('should find the record in LDAP when sync is on', done => {
		ldap.getUser(userx.username, (err, userobj) => {
			if (err) {
				return done(err);
			}
			expect(userobj.username).to.be.equal(userx.username);
			expect(userobj.primaryEmail).to.be.equal(userx.primaryEmail);
			expect(userobj.firstName).to.be.equal(userx.firstName);
			expect(userobj.lastName).to.be.equal(userx.lastName);
			expect(utils.checkSSHA(VALID_INFO1.password, userobj.password)).to.be.true;
			return done();
		});
	});

	it('should sync the modifications as well', done => {
		userx.primaryEmail = VALID_INFO2.primaryEmail;
		userx.emailList = VALID_INFO2.emailList;
		userx.firstName = VALID_INFO2.firstName;
		userx.lastName = VALID_INFO2.lastName;
		userx.password = VALID_INFO2.password;
		userx.skipLDAP = undefined;
		userx.save((err, umongo) => {
			if (err) {
				return done(err);
			}
			ldap.getUser(userx.username, (err, userobj) => {
				if (err) {
					return done(err);
				}

				expect(userobj.username).to.be.equal(userx.username);
				expect(userobj.primaryEmail).to.be.equal(userx.primaryEmail);
				expect(userobj.firstName).to.be.equal(userx.firstName);
				expect(userobj.lastName).to.be.equal(userx.lastName);
				expect(utils.checkSSHA(VALID_INFO2.password, userobj.password)).to.be.true;
				return done();
			});
		});
	});

	after(done => {
		userx.remove(err => {
			if (err) {
				return done(err);
			}
			ldap.getUser(userx.username, (err, userobj) => {
				expect(userobj).to.be.null;
				return done();
			});
		});
	});
});
