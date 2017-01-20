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

describe('botproof', () => {

  describe('generateTimestamp', () => {

    it('should set an accurate timestamp', done => {
      var app = express();

      app.use(botproof.generateTimestamp);

      app.use((req, res) => {
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

  describe('checkTimestamp', () => {
    it('should fail without a timestamp', done => {
      var app = express();

      app.use(bodyParser.urlencoded({extended: false}));
      app.use(botproof.checkTimestamp);

      app.use((err, req, res, next) => {
        expect(err.statusCode).to.equal(400);
        done();
      });

      request(app)
        .post('/')
        .end(() => {});
    });

    it.skip('should delay forms submitted under 5s', function(done) {
      this.timeout(6000);

      var app = express();

      app.use(bodyParser.urlencoded({extended: false}));
      app.use(botproof.generateTimestamp);
      app.use((req, res, next) => {
        req.body.timestamp = res.locals.timestamp;
        next();
      });
      app.use(botproof.checkTimestamp);
      app.use((req, res) => {
        res.end();
      });

      app.use(err => done(err));

      var start = Date.now();

      request(app)
        .post('/')
        .send({
          username: 'bilbo'
        })
        .end(res => {
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

  describe('checkHoneypot', () => {
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

    it('should send a Bad Request when honeypot is filled', done => {
      var app = express();

      app.use(bodyParser.urlencoded({extended: false}));
      app.use(bodyParser.json());
      app.use(botproof.checkHoneypot);
      app.use((err, req, res, next) => {
        expect(err.statusCode).to.equal(400);
        done();
      });
      request(app)
        .post('/')
        .send(form({country: 'Canada'}))
        .end(() => {});
    });

    it('should do nothing otherwise', done => {
      var app = express();

      app.use(bodyParser.urlencoded({extended: false}));
      app.use(botproof.checkHoneypot);
      app.use((req, res) => {
        res.end();
      });

      request(app)
        .post('/')
        .send(form())
        .expect(200, done);
    });
  });

  describe('spamListLookup', function() {
    this.timeout(10000); // this query may take a while
    it('should block a known bad address', done => {
      var app = express();
      app.enable('trust proxy'); // so we can fake ip addresses

      app.use(botproof.spamListLookup);
      app.use((req, res) => {
        res.end();
      });

      app.use((err, req, res, next) => {
        expect(err.statusCode).to.equal(400);
        done();
      });

      request(app)
      .get('/')
      .set('X-Forwarded-For', '127.0.0.2') // testing address
      .end(res => {
        if (res.status === 200) {
          done(new Error('known bad address passed'));
        }
      });

    });

    it('should allow a known good address', done => {
      var app = express();
      app.enable('trust proxy'); // so we can fake ip addresses

      app.use(botproof.spamListLookup);
      app.use((req, res) => {
        res.end();
      });

      request(app)
        .get('/')
        .set('X-Forwarded-For', '127.0.0.1') // testing address
      .expect(200, done);
    });
  });

  describe('generators', () => {
    it('should be an array of all generator functions', () => {
      expect(botproof.generators).contain(botproof.generateTimestamp)
        .and.contain(botproof.generateSpinner);
    });
  });

  describe('parsers', () => {
    it('should be an array of all parser functions', () => {
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
