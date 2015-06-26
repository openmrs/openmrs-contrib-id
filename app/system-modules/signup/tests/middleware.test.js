var path = require('path');
global.__commonModule = path.join(__dirname, './commonmock.test.js');
var should = require('should');
var _ = require('lodash');
var request = require('supertest');
var express = require('express');

var middleware = require('../lib/middleware');

describe('includeEmpties', function() {

  it('should add missing form fields', function(done) {
    var app = express();

    app.use(express.bodyParser());
    app.use(middleware.includeEmpties);

    app.use(function(req, res) {
      req.body.lastName.should.equal('');
      done();
    });

    request(app)
      .post('/')
      .send({
        username: 'srmn',
        firstName: 'Saruman',
        primaryEmail: 'swhite@isenguard.biz',
        password: 'secret',
        timestamp: '1234567890'
      })
      .end(function() {});
  });
});
