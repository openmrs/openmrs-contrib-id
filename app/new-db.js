'use strict';
var mongoose = require('mongoose');

var conf = require('./conf');
var uri = conf.mongo.uri;

mongoose.connect(uri);
