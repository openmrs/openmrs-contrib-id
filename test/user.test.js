var mongoose = require('mongoose');
var assert = require('assert');

require('../app/newDb');

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
  displayName: validEmail3,
  emailList: [validEmail1, validEmail2],
  password: simpleString,
}


describe('User', function() {
  describe('#save()', function() {
    it('should store the user well', function(done) {
      var user = new User(validinfo);
      user.save(done);
    });
  });
});
