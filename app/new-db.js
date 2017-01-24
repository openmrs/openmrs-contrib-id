'use strict';
const mongoose = require('mongoose');

const conf = require('./conf');
const uri = conf.mongo.uri;

mongoose.connect(uri);