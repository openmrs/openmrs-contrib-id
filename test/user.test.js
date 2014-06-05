var mongoose = require('mongoose');
var _ = require('lodash');
var expect = require('chai').expect;

var conf = require('./conf');

var User = require('../app/user');

var validEmail1 = 'foo@bar.com';
var validEmail2 = 'no@mistake.com';
var validEmail3 = 'hello@world.com';

var emptyEmail = '';
var nullEmail = null;
var undefEmail = undefined;

var validEmailList = [validEmail1, validEmail2];
var dupEmailList = [validEmail1, validEmail2];

var validUsername = 'plypy';
var invalidUsername = 'Ply_py'; // contain one underscore

var simpleString = 'string';

var validinfo = {
  username: validUsername,
  firstName: simpleString,
  lastName: simpleString,
  displayName: simpleString,
  primaryEmail: validEmail1,
  displayEmail: validEmail3,
  emailList: [validEmail1, validEmail2],
  password: simpleString,
};


describe('User', function() {
  before(function (done) {
    mongoose.connect(conf.mongoURI, done);
  });

  describe('#save()', function() {
    it('should store the valid user well', function(done) {
      var user = new User(validinfo);
      user.save(done);
    });

    it('should fail when the user name is missing', function (done) {
      var noUsername = _.clone(validinfo);
      delete noUsername.username;

      var user = new User(noUsername);
      user.save(function (err) {
        expect(err).not.to.be.null;
        done();
      });
    });
  });

  after(function (done) {
    mongoose.disconnect(done);
  });
});
