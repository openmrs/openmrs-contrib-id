var should = require('should');
var _ = require('lodash');
var request = require('supertest');
var express = require('express');
var crypto = require('crypto');
var path = require('path');

global.__commonModule = path.join(__dirname, './commonmock.test.js');

var signupConf = require('../conf.signup.json');
var botproof = require('../lib/botproof');
var mongoose = require('mongoose');
var mongoURI = require('../../../../test/conf').mongoURI;
mongoose.connect(mongoURI);

describe('generateTimestamp', function() {

  it('should set an accurate timestamp', function(done) {
    var app = express();

    app.use(botproof.generateTimestamp);

    app.use(function(req, res) {
      var enc = res.locals.timestamp;
      var decph = crypto.createDecipher('aes192', botproof.SECRET);

      decph.update(enc, 'hex');
      var dec = decph.final('utf8');

      dec.should.be.approximately(Date.now(), 5000);
      res.end();
    });

    request(app)
      .get('/')
      .expect(200, done);
  });

});

describe('checkTimestamp', function() {
  it('should fail without a timestamp', function(done) {
    var app = express();

    app.use(express.bodyParser());
    app.use(botproof.checkTimestamp);

    app.use(function(err, req, res, next) {
      err.statusCode.should.equal(400);
      done();
    });

    request(app)
      .post('/')
      .end(function() {});
  });

  it.skip('should delay forms submitted under 5s', function(done) {
    this.timeout(6000);

    var app = express();

    app.use(express.bodyParser());
    app.use(botproof.generateTimestamp);
    app.use(function(req, res, next) {
      req.body.timestamp = res.locals.timestamp;
      next();
    });
    app.use(botproof.checkTimestamp);
    app.use(function(req, res) {
      res.end();
    });

    app.use(function(err) {
      return done(err);
    });

    var start = Date.now();

    request(app)
      .post('/')
      .send({
        username: 'bilbo'
      })
      .end(function(res) {
        var stop = Date.now();
        try {
          (stop - start).should.be.above(4999);
          done();
        } catch (e) {
          done(e);
        }
      });
  });
});

describe('checkHoneypot', function() {
  function form(obj) {
    obj = obj || {};
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

    app.use(express.bodyParser());
    app.use(botproof.checkHoneypot);

    app.use(function(err, req, res, next) {
      res.statusCode = err.statusCode || 500;
      res.end();
    });

    request(app)
      .post('/')
      .send(form({
        country: 'Canada'
      }))
      .expect(400, done);
  });

  it('should do nothing otherwise', function(done) {
    var app = express();

    app.use(express.bodyParser());
    app.use(botproof.checkHoneypot);
    app.use(function(req, res) {
      res.end();
    });

    request(app)
      .post('/')
      .send(form())
      .expect(200, done);
  });
});

describe('spamListLookup', function() {
  it('should block a known bad address', function(done) {
    var app = express();
    app.enable('trust proxy'); // so we can fake ip addresses

    app.use(botproof.spamListLookup);
    app.use(function(req, res) {
      res.end();
    });

    app.use(function(err, req, res, next) {
      err.statusCode.should.equal(400);
      done();
    });

    request(app)
    .get('/')
    .set('X-Forwarded-For', '127.0.0.2') // testing address
    .end(function(res) {
      if (res.status === 200) {
        done(new Error('known bad address passed'));
      }
    });

  });

  it('should allow a known good address', function(done) {
    var app = express();
    app.enable('trust proxy'); // so we can fake ip addresses

    app.use(botproof.spamListLookup);
    app.use(function(req, res) {
      res.end();
    });

    request(app)
      .get('/')
      .set('X-Forwarded-For', '127.0.0.1') // testing address
    .expect(200, done);
  });
});

describe('generators', function() {
  it('should be an array of all generator functions', function() {
    botproof.generators.should.contain(botproof.generateTimestamp)
      .and.contain(botproof.generateSpinner);
  });
});

describe('parsers', function() {
  it('should be an array of all parser functions', function() {
    if (!signupConf.disableHoneypot) {
      botproof.parsers.should.contain(botproof.checkHoneypot);
    }
    if (!signupConf.disableBlacklist) {
      botproof.parsers.should.contain(botproof.spamListLookup);
    }
    botproof.parsers.should.contain(botproof.unscrambleFields)
      .and.contain(botproof.checkTimestamp);
  });
});
