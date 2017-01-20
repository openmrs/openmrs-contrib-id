'use strict';
/**
 * Programmtically execute mocha tests
 */
var fs = require('fs');
var path = require('path');
var async = require('async');
var Mocha = require('mocha');
var mongoose = require('mongoose');
var _ = require('lodash');

var conf = require('./conf');

// patch log4js
require('../app/logger');


var mocha = new Mocha({
  ui: 'bdd',
  reporter: 'list',
});

// recursivly add a folder for testing
var addFolder = folder => {
  fs.readdirSync(folder).forEach(file => {
    var p = path.join(folder, file);
    if (fs.statSync(p).isDirectory()) {
      return addFolder(p);
    }
    if (p === 'tests/runner.js' || !_.endsWith(file, '.js')) {
      return;
    }
    mocha.addFile(p);
  });
};


addFolder('tests');

// some preparation
async.series([
  callback => {
    mongoose.connect(conf.mongoURI, callback);
  },
],
err => {
  if (err) {
    console.error(err);
    process.exit();
  }
  mocha.run(failures => {
    process.exit(failures);
  });
});

