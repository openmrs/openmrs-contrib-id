/*jshint expr: true*/
var _ = require('lodash');
var expect = require('chai').expect;
var async = require('async');
var ldapjs = require('ldapjs');

var ldap = require('../app/ldap');
var conf = require('../app/conf');
var utils = require('../app/utils');

var serverAttr = conf.ldap.server;
var userAttr = conf.ldap.user;
var groupAttr = conf.ldap.group;

var url = serverAttr.uri;

var systemDN = serverAttr.rdn + '=' + serverAttr.loginUser + ',' +
  serverAttr.baseDn;
var bindCredentials = serverAttr.password;

var client = ldapjs.createClient({
  url: url,
  maxConnections: 10,
  bindDN: systemDN,
  bindCredentials: bindCredentials,
});

var USERNAME = 'uniqueuniquelonglong';
var PASSWORD = 'longlongpassword';
var EMAIL = 'foo@bar.com';
var NAME = 'name';

var INVALID_USERNAME = 'Ply_py'; // contain one underscore
var INVALID_EMAIL = "bad@bad";

var VALID_USER = {
  username: USERNAME,
  password: PASSWORD,
  firstName: NAME,
  lastName: NAME,
  displayName: NAME,
  primaryEmail: EMAIL,
  groups: userAttr.defaultGroups,
};

// constants used for directly LDAP operations
var DN = userAttr.rdn + '=' + USERNAME + ',' + userAttr.baseDn;
var USER_ENTRY = {};
USER_ENTRY[userAttr.username] = USERNAME;
USER_ENTRY[userAttr.password] = PASSWORD;
USER_ENTRY[userAttr.firstname] = NAME;
USER_ENTRY[userAttr.lastname] = NAME;
USER_ENTRY[userAttr.email] = EMAIL;
USER_ENTRY[userAttr.displayname] = NAME;
USER_ENTRY.objectClass = userAttr.defaultObjectClass;

describe('ldap', function() {
  // First test the getUser independently,
  // as it will be used constantly later
  describe('#getUser()', function() {

    before(function (done) {
      client.add(DN, USER_ENTRY, done);
    });
    after(function (done) {
      client.del(DN, done);
    });
    it('should get the user correctly', function (done) {
      ldap.getUser(USERNAME, function (err, user) {
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

    it('should report an error when the username is invalid', function (done) {
      ldap.getUser(INVALID_USERNAME, function (err, user) {
        expect(err).to.exist;
        expect(err.message).to.equal('Illegal username specified');
        return done();
      });
    });

    it('should return nothing when the user doesn\'t exist', function (done) {
      ldap.getUser('HowShouldSomeoneNameNuchaLongName', function (err, user) {
        expect(err).to.not.exist;
        expect(user).to.not.exist;
        return done();
      });
    });
  });

  describe('#authenticate()', function() {
    var username = USER_ENTRY[userAttr.username];
    var pass = USER_ENTRY[userAttr.password];

    before(function (done) {
      client.add(DN, USER_ENTRY, done);
    });

    after(function (done) {
      client.del(DN, done);
    });

    it('should return an error when the password is wrong', function (done) {
      ldap.authenticate(username, 'nonsense', function (err) {
        expect(err).to.exist;
        expect(err.message).to.equal('Invalid Credentials');
        return done();
      });
    });

    it('should correctly authenticate the user', function (done) {
      ldap.authenticate(username, pass, function (err) {
        expect(err).to.not.exist;
        return done();
      });
    });
  });

  describe('#deleteUser', function() {
    beforeEach(function (done) {
      client.add(DN, USER_ENTRY, done);
    });

    afterEach(function (done) {
      client.del(DN, function (err) { // clean the entry, in case it fails
        return done();                // ignore possible 'no such entry' error
      });
    });

    it('should remove the user from LDAP', function (done) {
      var username = USER_ENTRY[userAttr.username];
      async.series([
        function (next) {
          ldap.deleteUser(username, next);
        },
        function (next) {
          ldap.getUser(username, function (err, user) {
            expect(err).to.not.exist;
            expect(user).to.not.exist;
            return next();
          });
        },
      ], done);
    });
  });

  describe('#addUser', function() {
    afterEach(function (done) {
      ldap.deleteUser(VALID_USER.username, function (err) {
        return done();
      });
    });

    it('should add the user correctly', function (done) {
      async.waterfall([
        ldap.addUser.bind(null, VALID_USER),
        function (usera, next) {
          ldap.getUser(usera.username, function (err, userb) {
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
            var dif = _.difference(userb.groups, VALID_USER.groups);
            expect(dif).to.be.empty;
            dif = _.difference(VALID_USER.groups, userb.groups);
            expect(dif).to.be.empty;
            return done();
          });
        }
      ], done);
    });

    it('should report an error when the username is invalid', function (done) {
      var tmp = _.cloneDeep(VALID_USER);
      tmp.username = INVALID_USERNAME;
      ldap.addUser(tmp, function (err, user) {
        expect(err).to.exist;
        expect(err.message).to.equal('Illegal username specified');
        return done();
      });
    });

    it('should report an error when the email is invalid', function (done) {
      var tmp = _.cloneDeep(VALID_USER);
      tmp.primaryEmail = INVALID_EMAIL;
      ldap.addUser(tmp, function (err, user) {
        expect(err).to.exist;
        expect(err.message).to.equal('Illegal email specified');
        return done();
      });
    });
  });

  describe('#updateUser', function() {
    beforeEach(function (done) {
      ldap.addUser(VALID_USER, done);
    });
    afterEach(function (done) {
      ldap.deleteUser(VALID_USER.username, done);
    });

    it('should correctly update the normal user attributes', function (done) {
      var tmp = _.cloneDeep(VALID_USER);
      tmp.firstName = 'Legolas';
      tmp.lastName = 'Greenleaf';
      tmp.displayName = 'Elf';
      tmp.primaryEmail = 'legolas@middleearth.com';
      async.waterfall([
        ldap.updateUser.bind(null, tmp),
        function (usera, next) {
          ldap.getUser(tmp.username, function (err, userb) {
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

    it('should correctly update the membership', function (done) {
      var tmp = _.cloneDeep(VALID_USER);
      tmp.groups = [];
      async.series([
        ldap.updateUser.bind(null, tmp), // delete all
        function (next) {
          ldap.getUser(tmp.username, function (err, user) {
            expect(err).to.not.exist;
            expect(user.groups).to.be.empty;
            return next();
          });
        },
        function (next) {
          tmp.groups = userAttr.defaultGroups; // add all
          ldap.updateUser(tmp, next);
        },
        function (next) {
          ldap.getUser(tmp.username, function (err, user) {
            expect(err).to.not.exist;
            expect(user).to.exist;
            var dif = _.difference(user.groups, userAttr.defaultGroups);
            expect(dif).to.be.empty;
            dif = _.difference(userAttr.defaultGroups, user.groups);
            expect(dif).to.be.empty;
            return next();
          });
        },
      ], done);
    });
  });

  describe('#resetPassword', function() {
    var newPass = 'new-password';
    before(function (done) {
      ldap.addUser(VALID_USER, done);
    });
    after(function (done) {
      ldap.deleteUser(VALID_USER.username, done);
    });

    it('should report an error when the username is invalid', function (done) {
      ldap.resetPassword(INVALID_USERNAME, newPass, function (err) {
        expect(err).to.exist;
        expect(err.message).to.equal('Illegal username specified');
        return done();
      });
    });

    it('should correctly change the password', function (done) {
      ldap.resetPassword(VALID_USER.username, newPass, function (err) {
        expect(err).to.not.exist;
        ldap.authenticate(VALID_USER.username, newPass, done);
      });
    });
  });

  describe('#lockoutUser', function() {
    before(function (done) {
      ldap.addUser(VALID_USER, done);
    });
    after(function (done) {
      ldap.deleteUser(VALID_USER.username, done);
    });

    it('should lock the user', function (done) {
      var base = userAttr.baseDn;
      var options = {
        scope: 'sub',
        filter: '(' + userAttr.rdn + '=' + VALID_USER.username + ')',
        attributes: ['pwdAccountLockedTime', ],
      };
      ldap.lockoutUser(VALID_USER.username, function (err) {
        client.search(base, options, function (err, res) {
          expect(err).to.not.exist;
          var obj = {};
          res.on('searchEntry', function (entry) {
            obj = entry.object;
          });
          res.on('end', function (result) {
            expect(obj.pwdAccountLockedTime).to.exist;
            return done();
          });
        });
      });
    });
  });

  describe('#enableUser', function() {
    before(function (done) {
      ldap.addUser(VALID_USER, function (err) {
        if (err) {
          return done(err);
        }
        ldap.lockoutUser(VALID_USER.username, done);
      });
    });
    after(function (done) {
      ldap.deleteUser(VALID_USER.username, done);
    });
    it('should unlock the user', function (done) {
      var base = userAttr.baseDn;
      var options = {
        scope: 'sub',
        filter: '(' + userAttr.rdn + '=' + VALID_USER.username + ')',
        attributes: ['pwdAccountLockedTime', ],
      };
      ldap.enableUser(VALID_USER.username, function (err) {
        expect(err).to.not.exist;
        client.search(base, options, function (err, res) {
          expect(err).to.not.exist;
          var obj = {};
          res.on('searchEntry', function (entry) {
            obj = entry.object;
          });
          res.on('end', function (result) {
            expect(obj.pwdAccountLockedTime).to.not.exist;
            return done();
          });
        });
      });
    });
  });
});

