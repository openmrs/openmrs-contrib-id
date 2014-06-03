var mongoose = require('mongoose');
var dbUser = 'omrisd';
var pwd = 'secret';

var uri = 'mongodb://localhost/test';

var options = {
  user : dbUser,
  pass : pwd,
};

mongoose.connect(uri, options);
