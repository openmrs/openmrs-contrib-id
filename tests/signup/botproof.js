'use strict';
/*jshint expr: true*/
var _ = require('lodash');
var request = require('supertest');
var express = require('express');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var expect = require('chai').expect;

var signupConf = require('../../app/conf').signup;

var botproof = require('../../app/routes/signup/botproof');

describe('botproof', function () {

  describe('generateTimestamp', function() {

    it('should set an accurate timestamp', function(done) {
      var app = express();

      app.use(botproof.generateTimestamp);

      app.use(function(req, res) {
        var enc = res.locals.timestamp;
        var decph = crypto.createDecipher('aes192', botproof.SECRET);

        decph.update(enc, 'hex');
        var dec = decph.final('utf8');
        dec = parseInt(dec);

        expect(dec).closeTo(Date.now(), 5000);

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

      app.use(bodyParser.urlencoded({extended: false}));
      app.use(botproof.checkTimestamp);

      app.use(function(err, req, res, next) {
        expect(err.statusCode).to.equal(400);
        done();
      });

      request(app)
        .post('/')
        .end(function() {});
    });

    it.skip('should delay forms submitted under 5s', function(done) {
      this.timeout(6000);

      var app = express();

      app.use(bodyParser.urlencoded({extended: false}));
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
            expect(stop - start).to.be.least(5000);
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
      var app = express();

      app.use(bodyParser.urlencoded({extended: false}));
      app.use(bodyParser.json());
      app.use(botproof.checkHoneypot);
      app.use(function(err, req, res, next) {
        expect(err.statusCode).to.equal(400);
        done();
      });
      request(app)
        .post('/')
        .send(form({country: 'Canada'}))
        .end(function () {});
    });

    it('should do nothing otherwise', function(done) {
      var app = express();

      app.use(bodyParser.urlencoded({extended: false}));
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
        expect(err.statusCode).to.equal(400);
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
      expect(botproof.generators).contain(botproof.generateTimestamp)
        .and.contain(botproof.generateSpinner);
    });
  });

  describe('parsers', function() {
    it('should be an array of all parser functions', function() {
      if (!signupConf.disableHoneypot) {
        expect(botproof.parsers).contain(botproof.checkHoneypot);
      }
      if (!signupConf.disableBlacklist) {
        expect(botproof.parsers).contain(botproof.spamListLookup);
      }
      expect(botproof.parsers).contain(botproof.unscrambleFields)
        .and.contain(botproof.checkTimestamp);
    });
  });

});
