/*jshint expr: true*/
var mongoose = require('mongoose');
var _ = require('lodash');
var expect = require('chai').expect;
var async = require('async');

var conf = require('./conf');
var User = require('../app/user');

// data for testing purposes
var VALIDEMAIL1 = 'foo@bar.com';
var VALIDEMAIL2 = 'no@mistake.com';
var VALIDEMAIL3 = 'hello@world.com';

var ORPHANEMAIL = 'im@lonely.com';

var INVALIDEMAIL = 'badatgoogle.com';


var VALIDUSERNAME1 = 'plypy';
var VALIDUSERNAME2 = 'plypx';

var INVALIDUSERNAME = 'Ply_py'; // contain one underscore

var SIMPLESTRING = 'string';

var VALIDINFO1 = {
  username: VALIDUSERNAME1,
  firstName: SIMPLESTRING,
  lastName: SIMPLESTRING,
  displayName: SIMPLESTRING,
  primaryEmail: VALIDEMAIL1,
  displayEmail: VALIDEMAIL2,
  emailList: [VALIDEMAIL1, VALIDEMAIL3],
  password: SIMPLESTRING,
};

var VALIDINFO2 = {
  username: VALIDUSERNAME2,
  primaryEmail: VALIDEMAIL2,
  displayEmail: VALIDEMAIL2,
  emailList: [VALIDEMAIL2],
  password: SIMPLESTRING,
};



describe('User', function() {
  before(function (done) {
    async.series([
      function (callback) {
        mongoose.connect(conf.mongoURI, callback);
      },
      function (callback) {
        User.remove(callback);
      }
    ],
    function (err) {
      done(err);
    });
  });

  beforeEach(function (done){
    User.remove(done);
  });

  after(function (done) {
    async.series([
      function (callback) {
        User.remove(callback);
      },
      function (callback) {
        mongoose.disconnect(callback);
      }
    ],
    function (err) {
      done(err);
    });
  });

  it('should store the valid users well', function(done) {
    var user1 = new User(VALIDINFO1);
    var user2 = new User(VALIDINFO2);

    async.parallel([
      function (callback) {
        user1.save(callback);
      },
      function (callback) {
        user2.save(callback);
      },
    ],
    function (err) {
      expect(err).to.be.null;

      User.find({}, function (err, users) {
        expect(err).to.be.null;
        expect(users).to.have.length(2);
        done();
      });
    });

  });

  it('should fail when two user have same username', function(done) {
    var dupUsernameInfo = _.cloneDeep(VALIDINFO2);
    dupUsernameInfo.username = VALIDINFO1.username;

    var user1 = new User(VALIDINFO1);
    var user2 = new User(dupUsernameInfo);
    async.parallel([
      function (callback) {
        user1.save(callback);
      },
      function (callback) {
        user2.save(callback);
      }
    ],
    function (err) {
      expect(err).not.to.be.null;
      done();
    });

  });

  it('should fail when the username is invalid', function(done) {
    var invalidUsernameInfo = _.cloneDeep(VALIDINFO1);
    invalidUsernameInfo.username = INVALIDUSERNAME;

    var user = new User(invalidUsernameInfo);
    user.save(function(err) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('should fail when the username is missing', function(done) {
    var noUsernameInfo = _.cloneDeep(VALIDINFO1);
    delete noUsernameInfo.username;

    var user = new User(noUsernameInfo);
    user.save(function (err) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it ('should fail when the displayEmail is invalid', function(done) {
    var invalidDisplayEmailInfo = _.cloneDeep(VALIDINFO1);
    invalidDisplayEmailInfo.displayEmail = INVALIDEMAIL;

    var user = new User(invalidDisplayEmailInfo);
    user.save(function (err) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('should fail when the primaryEmail is missing', function(done) {
    var noPrimaryEmailInfo = _.cloneDeep(VALIDINFO1);
    delete noPrimaryEmailInfo.primaryEmail;

    var user = new User(noPrimaryEmailInfo);
    user.save(function (err) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('should fail when the primaryEmail is not in List', function(done) {
    var orphanPrimaryEmailInfo = _.cloneDeep(VALIDINFO1);
    orphanPrimaryEmailInfo.primaryEmail = ORPHANEMAIL;

    var user = new User(orphanPrimaryEmailInfo);
    user.save(function (err) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('should fail when the emailList is empty', function(done) {
    var emptyEmailListInfo = _.cloneDeep(VALIDINFO1);
    emptyEmailListInfo.emailList = [];

    var user = new User(emptyEmailListInfo);
    user.save(function (err) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('should fail when the emailList have invalid email', function(done) {
    var invalidEmailListInfo = _.cloneDeep(VALIDINFO1);
    invalidEmailListInfo.emailList.push(INVALIDEMAIL);

    var user = new User (invalidEmailListInfo);
    user.save(function (err) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('should fail when the emailList have duplicate emails', function(done) {
    var dupEmailListInfo = _.cloneDeep(VALIDINFO1);
    dupEmailListInfo.emailList.push(ORPHANEMAIL);
    dupEmailListInfo.emailList.push(ORPHANEMAIL.toUpperCase());

    var user = new User (dupEmailListInfo);
    user.save(function (err) {
      expect(err).not.to.be.null;
      done();
    });
  });

  it('should fail when the password is missing', function(done) {
    var noPasswordInfo = _.cloneDeep(VALIDINFO1);
    delete noPasswordInfo.password;

    var user = new User (noPasswordInfo);
    user.save(function (err) {
      expect(err).not.to.be.null;
      done();
    });
  });

});
