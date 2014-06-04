var mongoose = require('mongoose');

var conf = require('./conf');
var uri = conf.mongo.uri;
var dbUser = conf.mongo.user;
var pwd = conf.mongo.password;


var options = {
  user : dbUser,
  pass : pwd,
};

mongoose.connect(uri, options);
