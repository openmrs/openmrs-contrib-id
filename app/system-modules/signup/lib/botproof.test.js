var should = require('should')
,   _ = require('underscore')
,   request = require('supertest')
,   express = require('express')
;

global.__commonModule = './commonmock.test'

var botproof = require('./botproof');

describe('generateTimestamp', function() {

  it('should set an accurate timestamp', function(done) {
    var app = express.createServer();

    app.use(botproof.generateTimestamp)

    app.use(function(req, res) {
      res.local('timestamp').should.be.approximately(Date.now(), 5000)
      res.end()
    })

    request(app)
    .get('/')
    .expect(200, done)
  })

})

describe('checkTimestamp', function() {
  it('should fail without a timestamp', function(done) {
    var app = express.createServer();

    app.use(express.bodyParser())
    app.use(botproof.checkTimestamp)

    app.error(function(err, req, res) {
      var test = null;
      try {
        err.statusCode.should.equal(400)
        done()
      } catch (e) {
        done(e)
      }
    })

    request(app)
    .post('/')
    .end(function(){})

  })
})