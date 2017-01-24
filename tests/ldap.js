'use strict';
/*jshint expr: true*/
const _ = require('lodash');
const expect = require('chai').expect;
const async = require('async');
const ldapjs = require('ldapjs');

const ldap = require('../app/ldap');
const conf = require('../app/conf');
const utils = require('../app/utils');

const serverAttr = conf.ldap.server;
const userAttr = conf.ldap.user;
const groupAttr = conf.ldap.group;

const url = serverAttr.uri;

const systemDN = `${serverAttr.rdn}=${serverAttr.loginUser},${serverAttr.baseDn}`;
const bindCredentials = serverAttr.password;

const client = ldapjs.createClient({
	url: url,
	maxConnections: 10,
	bindDN: systemDN,
	bindCredentials: bindCredentials,
});

const USERNAME = 'uniqueuniquelonglong';
const PASSWORD = 'longlongpassword';
const EMAIL = 'foo@bar.com';
const NAME = 'name';

const INVALID_USERNAME = 'Ply_py'; // contain one underscore
const INVALID_EMAIL = "bad@bad";

const VALID_USER = {
	username: USERNAME,
	password: PASSWORD,
	firstName: NAME,
	lastName: NAME,
	displayName: NAME,
	primaryEmail: EMAIL,
	groups: userAttr.defaultGroups,
};

// constants used for directly LDAP operations
const DN = `${userAttr.rdn}=${USERNAME},${userAttr.baseDn}`;
const USER_ENTRY = {};
USER_ENTRY[userAttr.username] = USERNAME;
USER_ENTRY[userAttr.password] = PASSWORD;
USER_ENTRY[userAttr.firstname] = NAME;
USER_ENTRY[userAttr.lastname] = NAME;
USER_ENTRY[userAttr.email] = EMAIL;
USER_ENTRY[userAttr.displayname] = NAME;
USER_ENTRY.objectClass = userAttr.defaultObjectClass;

describe('ldap', () => {
	// First test the getUser independently,
	// as it will be used constantly later
	describe('#getUser()', () => {

		before(done => {
			client.add(DN, USER_ENTRY, done);
		});
		after(done => {
			client.del(DN, done);
		});
		it('should get the user correctly', done => {
			ldap.getUser(USERNAME, (err, user) => {
				expect(err).to.not.exist;
				expect(user).to.exist;

				expect(user.username).to.equal(USERNAME);
				expect(user.firstName).to.equal(NAME);
				expect(user.lastName).to.equal(NAME);
				expect(user.displayName).to.equal(NAME);
				expect(user.primaryEmail).to.equal(EMAIL);
				expect(_.startsWith(user.password, '{SSHA}')).to.be.true;
				expect(utils.checkSSHA(VALID_USER.password, user.password)).to.be.true;
				expect(user.groups).to.be.empty;
				return done();
			});
		});

		it('should report an error when the username is invalid', done => {
			ldap.getUser(INVALID_USERNAME, (err, user) => {
				expect(err).to.exist;
				expect(err.message).to.equal('Illegal username specified');
				return done();
			});
		});

		it('should return nothing when the user doesn\'t exist', done => {
			ldap.getUser('HowShouldSomeoneNameNuchaLongName', (err, user) => {
				expect(err).to.not.exist;
				expect(user).to.not.exist;
				return done();
			});
		});
	});

	describe('#authenticate()', () => {
		const username = USER_ENTRY[userAttr.username];
		const pass = USER_ENTRY[userAttr.password];

		before(done => {
			client.add(DN, USER_ENTRY, done);
		});

		after(done => {
			client.del(DN, done);
		});

		it('should return an error when the password is wrong', done => {
			ldap.authenticate(username, 'nonsense', err => {
				expect(err).to.exist;
				expect(err.message).to.equal('Invalid Credentials');
				return done();
			});
		});

		it('should correctly authenticate the user', done => {
			ldap.authenticate(username, pass, err => {
				expect(err).to.not.exist;
				return done();
			});
		});
	});

	describe('#deleteUser', () => {
		beforeEach(done => {
			client.add(DN, USER_ENTRY, done);
		});

		afterEach(done => {
			client.del(DN, err => // clean the entry, in case it fails
				// ignore possible 'no such entry' error
				done());
		});

		it('should remove the user from LDAP', done => {
			const username = USER_ENTRY[userAttr.username];
			async.series([
				next => {
					ldap.deleteUser(username, next);
				},
				next => {
					ldap.getUser(username, (err, user) => {
						expect(err).to.not.exist;
						expect(user).to.not.exist;
						return next();
					});
				},
			], done);
		});
	});

	describe('#addUser', () => {
		afterEach(done => {
			ldap.deleteUser(VALID_USER.username, err => done());
		});

		it('should add the user correctly', done => {
			async.waterfall([
				ldap.addUser.bind(null, VALID_USER),
				(usera, next) => {
					ldap.getUser(usera.username, (err, userb) => {
						expect(err).to.not.exist;

						expect(userb).to.deep.equal(usera);

						expect(userb.username).to.equal(VALID_USER.username);
						expect(userb.firstName).to.equal(VALID_USER.firstName);
						expect(userb.lastName).to.equal(VALID_USER.lastName);
						expect(userb.displayName).to.equal(VALID_USER.displayName);
						expect(userb.primaryEmail).to.equal(VALID_USER.primaryEmail);
						expect(_.startsWith(userb.password, '{SSHA}')).to.be.true;
						expect(utils.checkSSHA(VALID_USER.password, userb.password)).to.be.true;
						expect(userb.groups).to.exist;

						// check groups
						let dif = _.difference(userb.groups, VALID_USER.groups);
						expect(dif).to.be.empty;
						dif = _.difference(VALID_USER.groups, userb.groups);
						expect(dif).to.be.empty;
						return done();
					});
				}
			], done);
		});

		it('should report an error when the username is invalid', done => {
			const tmp = _.cloneDeep(VALID_USER);
			tmp.username = INVALID_USERNAME;
			ldap.addUser(tmp, (err, user) => {
				expect(err).to.exist;
				expect(err.message).to.equal('Illegal username specified');
				return done();
			});
		});

		it('should report an error when the email is invalid', done => {
			const tmp = _.cloneDeep(VALID_USER);
			tmp.primaryEmail = INVALID_EMAIL;
			ldap.addUser(tmp, (err, user) => {
				expect(err).to.exist;
				expect(err.message).to.equal('Illegal email specified');
				return done();
			});
		});
	});

	describe('#updateUser', () => {
		beforeEach(done => {
			ldap.addUser(VALID_USER, done);
		});
		afterEach(done => {
			ldap.deleteUser(VALID_USER.username, done);
		});

		it('should correctly update the normal user attributes', done => {
			const tmp = _.cloneDeep(VALID_USER);
			tmp.firstName = 'Legolas';
			tmp.lastName = 'Greenleaf';
			tmp.displayName = 'Elf';
			tmp.primaryEmail = 'legolas@middleearth.com';
			async.waterfall([
				ldap.updateUser.bind(null, tmp),
				(usera, next) => {
					ldap.getUser(tmp.username, (err, userb) => {
						expect(err).to.not.exist;
						expect(usera).to.deep.equal(userb);

						expect(userb.username).to.equal(tmp.username);
						expect(userb.firstName).to.equal(tmp.firstName);
						expect(userb.lastName).to.equal(tmp.lastName);
						expect(userb.displayName).to.equal(tmp.displayName);
						expect(userb.primaryEmail).to.equal(tmp.primaryEmail);
						expect(_.startsWith(userb.password, '{SSHA}')).to.be.true;
						expect(utils.checkSSHA(VALID_USER.password, userb.password)).to.be.true;
						return next();
					});
				},
			], done);
		});

		it('should correctly update the membership', done => {
			const tmp = _.cloneDeep(VALID_USER);
			tmp.groups = [];
			async.series([
				ldap.updateUser.bind(null, tmp), // delete all
				next => {
					ldap.getUser(tmp.username, (err, user) => {
						expect(err).to.not.exist;
						expect(user.groups).to.be.empty;
						return next();
					});
				},
				next => {
					tmp.groups = userAttr.defaultGroups; // add all
					ldap.updateUser(tmp, next);
				},
				next => {
					ldap.getUser(tmp.username, (err, user) => {
						expect(err).to.not.exist;
						expect(user).to.exist;
						let dif = _.difference(user.groups, userAttr.defaultGroups);
						expect(dif).to.be.empty;
						dif = _.difference(userAttr.defaultGroups, user.groups);
						expect(dif).to.be.empty;
						return next();
					});
				},
			], done);
		});
	});

	describe('#resetPassword', () => {
		const newPass = 'new-password';
		before(done => {
			ldap.addUser(VALID_USER, done);
		});
		after(done => {
			ldap.deleteUser(VALID_USER.username, done);
		});

		it('should report an error when the username is invalid', done => {
			ldap.resetPassword(INVALID_USERNAME, newPass, err => {
				expect(err).to.exist;
				expect(err.message).to.equal('Illegal username specified');
				return done();
			});
		});

		it('should correctly change the password', done => {
			ldap.resetPassword(VALID_USER.username, newPass, err => {
				expect(err).to.not.exist;
				ldap.authenticate(VALID_USER.username, newPass, done);
			});
		});
	});

	describe('#lockoutUser', () => {
		before(done => {
			ldap.addUser(VALID_USER, done);
		});
		after(done => {
			ldap.deleteUser(VALID_USER.username, done);
		});

		it('should lock the user', done => {
			const base = userAttr.baseDn;
			const options = {
				scope: 'sub',
				filter: `(${userAttr.rdn}=${VALID_USER.username})`,
				attributes: ['pwdAccountLockedTime', ],
			};
			ldap.lockoutUser(VALID_USER.username, err => {
				client.search(base, options, (err, res) => {
					expect(err).to.not.exist;
					let obj = {};
					res.on('searchEntry', entry => {
						obj = entry.object;
					});
					res.on('end', result => {
						expect(obj.pwdAccountLockedTime).to.exist;
						return done();
					});
				});
			});
		});
	});

	describe('#enableUser', () => {
		before(done => {
			ldap.addUser(VALID_USER, err => {
				if (err) {
					return done(err);
				}
				ldap.lockoutUser(VALID_USER.username, done);
			});
		});
		after(done => {
			ldap.deleteUser(VALID_USER.username, done);
		});
		it('should unlock the user', done => {
			const base = userAttr.baseDn;
			const options = {
				scope: 'sub',
				filter: `(${userAttr.rdn}=${VALID_USER.username})`,
				attributes: ['pwdAccountLockedTime', ],
			};
			ldap.enableUser(VALID_USER.username, err => {
				expect(err).to.not.exist;
				client.search(base, options, (err, res) => {
					expect(err).to.not.exist;
					let obj = {};
					res.on('searchEntry', entry => {
						obj = entry.object;
					});
					res.on('end', result => {
						expect(obj.pwdAccountLockedTime).to.not.exist;
						return done();
					});
				});
			});
		});
	});

	describe('#usersList', () => {
		before(done => {
			ldap.addUser(VALID_USER, err => {
				if (err) {
					return done(err);
				} else {
					return done();
				}
			})
		});
		after(done => {
			ldap.deleteUser(VALID_USER.username, done);
		});
		it('should return a list of users', done => {
			ldap.getAllUsers((err, users) => {
				expect(err).to.not.exist;
				expect(users).to.exist;
				expect(users.length).to.to.be.at.least(1);
				async.map(users, (user, callback) => {
					expect(user.groups).to.exist;
				});

				return done();
			});
		});
	});
});