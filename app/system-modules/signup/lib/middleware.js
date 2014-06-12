var signupConf = require('../conf.signup.json');
var async = require('async');
var _ = require('lodash');

module.exports = {

  // If an expected field isn't submitted, give it a value of an empty string.
  // This is useful because with the empty string, the submission error will
  // be caught by validation middleware.
  includeEmpties: function includeEmpties(req, res, next) {
    signupConf.signupFieldNames.forEach(function(n) {
      req.body[n] = req.body[n] || '';
    });


    next();
  },

  function chkUsername() {
    // body...
  }
  validator: function validator(req, res, next) {
    var body = req.body;
    var failed = false;
    var values = {};
    var failures = {};
    var failreasons = {};

  },

};
