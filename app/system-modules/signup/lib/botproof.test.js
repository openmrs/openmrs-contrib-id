var should = require('should')
,   _ = require('underscore')
,   request = require('supertest')
,   express = require('express')
,   crypto = require('crypto')
,   fs = require('fs')
;

global.__commonModule = fs.realpathSync('./commonmock.test.js')

require(global.__commonModule).db = require('../../../db')

var botproof = require('./botproof');

describe('generateTimestamp', function() {

  it('should set an accurate timestamp', function(done) {
    var app = express.createServer();

    app.use(botproof.generateTimestamp)

    app.use(function(req, res) {
      var enc = res.local('timestamp')
      ,   decph = crypto.createDecipher('aes192', botproof.SECRET)

      decph.update(enc, 'hex')
      var dec = decph.final('utf8')

      dec.should.be.approximately(Date.now(), 5000)
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

  it.skip('should delay forms submitted under 5s', function(done) {
    this.timeout(6000);

    var app = express.createServer()

    app.use(express.bodyParser())
    app.use(botproof.generateTimestamp)
    app.use(function(req, res, next) {
      req.body.timestamp = res.local('timestamp')
      next()
    })
    app.use(botproof.checkTimestamp)
    app.use(function(req, res) {
      res.end()
    })

    app.error(function(err) {
      return done(err);
    })

    var start = Date.now();

    request(app)
    .post('/')
    .send({username: 'bilbo'})
    .end(function(res) {
      var stop = Date.now()
      try {
        (stop - start).should.be.above(4999)
        done()
      } catch (e) {
        done(e)
      }
    })
  })
})

describe('checkHoneypot', function() {
  function form(obj) {
    obj = obj || {}
    return _.extend({
      username: 'goody',
      firstname: 'A Good',
      lastname: 'Person',
      email: 'goody@example.com',
      password: 'secret123',
      recaptcha_response_field: 'egg freckles',
      timestamp: '1389032606862'
    }, obj);
  }

  it('should send a Bad Request when honeypot is filled', function(done) {
    var app = express.createServer();

    app.use(express.bodyParser())
    app.use(botproof.checkHoneypot)

    app.error(function(err, req, res, next) {
      res.statusCode = err.statusCode || 500;
      res.end();
    })

    request(app)
    .post('/')
    .send(form({country: 'Canada'}))
    .expect(400, done)
  })

  it('should do nothing otherwise', function(done) {
    var app = express.createServer();

    app.use(express.bodyParser())
    app.use(botproof.checkHoneypot)
    app.use(function(req, res) {
      res.end();
    });

    request(app)
    .post('/')
    .send(form())
    .expect(200, done)
  })
})

describe('spamListLookup', function() {
  it('should block a known bad address', function(done) {
    var app = express.createServer()
    app.enable('trust proxy') // so we can fake ip addresses

    app.use(botproof.spamListLookup);
    app.use(function(req, res) {
      res.end()
    })

    app.error(function(error, req, res) {
      try {
        error.statusCode.should.equal(400)
        done()
      } catch (e) {
        done(e)
      }
    })

    request(app)
    .get('/')
    .set('X-Forwarded-For', '194.158.204.250') // known bad address
    .end(function(err, res){
      if (res.statusCode === 200)
        done(new Error('known bad address passed'))
    })

  })

  it('should allow a known good address', function(done) {
    var app = express.createServer()
    app.enable('trust proxy') // so we can fake ip addresses

    app.use(botproof.spamListLookup);
    app.use(function(req, res) {
      res.end()
    })

    request(app)
    .get('/')
    .set('X-Forwarded-For', '74.125.225.1') // google.com's address
    .expect(200, done)
  })

  it('should not be triggered by a ZEN PBL address', function(done) {
    var app = express.createServer()
    app.enable('trust proxy') // so we can fake ip addresses

    app.use(botproof.spamListLookup);
    app.use(function(req, res) {
      res.end()
    })

    request(app)
    .get('/')
    .set('X-Forwarded-For', '64.134.160.4')
    .expect(200, done)
  })
})

describe('generators', function() {
  it('should be an array of all generator functions', function() {
    botproof.generators.should.contain(botproof.generateTimestamp)
                       .and.contain(botproof.generateSpinner)
  })
})

describe('parsers', function() {
  it('should be an array of all parser functions', function() {
    botproof.parsers.should.contain(botproof.unscrambleFields)
                    .and.contain(botproof.checkTimestamp)
                    .and.contain(botproof.checkHoneypot)
                    .and.contain(botproof.spamListLookup)
  })
})