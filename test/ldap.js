var fs = require('fs');
var expect = require('chai').expect;
var util = require('util');
var path = require('path');
var ldap = require('../app/ldap');

describe('LDAP', function() {
  // clean module cache before each test
  var cleanCache = function(filePath){
    delete require.cache[path.resolve(filePath)];
  };

  var originalConf;
  // test config
  var testConf = 'module.exports = {' +
    '"ldap": {' +
      '"enabled": %s' +
    '}' +
  '}';
  // LDAP config placed here
  var configPath = 'app/conf.js';
  before(function(done) {
    // if file exists, save config data
    if (fs.existsSync(configPath)) originalConf = fs.readFileSync(configPath, 'utf8');
    done();
  });
  after(function(done) {
    // restore data
    if (originalConf) fs.writeFileSync(configPath, originalConf, 'utf8');
    done();
  });
  it('ldap should be enabled when missing "ldap.enabled" param (by default)', function(done) {
    var textVal = 'undefined';
    fs.writeFileSync(configPath, util.format(testConf, textVal), 'utf8');
    cleanCache(configPath);
    expect(ldap.isDisabled()).to.be.false;
    done()
  });

  it('ldap should be enabled when "ldap.enabled" equal true', function(done) {
    var textVal = 'true';
    fs.writeFileSync(configPath, util.format(testConf, textVal), 'utf8');
    cleanCache(configPath);
    expect(ldap.isDisabled()).to.be.false;
    done();
  });
  it('ldap should be disabled when "ldap.enabled" equal false' , function (done) {
    var textVal = 'false';
    fs.writeFileSync(configPath, util.format(testConf, textVal), 'utf8');
    cleanCache(configPath);
    expect(ldap.isDisabled()).to.be.true;
    done();
  });
});