var mongoose = require('mongoose');

var Common = require(global.__commonModule);
var conf = Common.conf;
var uri = conf.mongo.uri;
var dbUser = conf.mongo.user;
var pwd = conf.mongo.password;


var options = {
  user : dbUser,
  pass : pwd,
};

mongoose.connect(uri, options);
