'use strict';
/*jshint expr: true*/
var request = require('supertest');
var express = require('express');
var bodyParser = require('body-parser');
var expect = require('chai').expect;

var middleware = require('../../app/routes/signup/middleware');

describe('includeEmpties', function() {

  it('should add missing form fields', function(done) {
    var app = express();

    app.use(bodyParser.urlencoded({extended: true}));
    app.use(middleware.includeEmpties);

    app.use(function(req, res) {
      expect(req.body.lastName).to.be.equal('');
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
