var should = require('should'),
  _ = require('underscore'),
  request = require('supertest'),
  express = require('express');

var middleware = require('./middleware')

describe('includeEmpties', function() {

  it('should add missing form fields', function(done) {
    var app = express.createServer()

    app.use(express.bodyParser())
    app.use(middleware.includeEmpties)

    app.use(function(req, res) {
      try {
        req.body.lastname.should.equal('')
        req.body.recaptcha_response_field.should.equal('')
        done()
      } catch (e) {
        done(d)
      }
    })

    request(app)
      .post('/')
      .send({
        username: 'srmn',
        firstname: 'Saruman',
        email: 'swhite@isenguard.biz',
        password: 'secret',
        timestamp: '1234567890'
      })
      .end(function() {})
  })
})
