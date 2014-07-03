module.exports = function(app) {
  var mongoose = require('mongoose');
  var formage = require('formage');
  var express = require('express');
  var models = require('./model');

  var conf = require('./conf');
  var uri = conf.mongo.uri;
  var dbUser = conf.mongo.username;
  var pwd = conf.mongo.password;


  var options = {
    user : dbUser,
    pass : pwd,
  };

  mongoose.connect(uri, options);

  formage.init(app, express, models);
};