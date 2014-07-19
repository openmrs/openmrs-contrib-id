/**
 * Programmtically execute mocha tests
 * @type {[type]}
 */
var fs = require('fs');
var path = require('path');
var async = require('async');
var Mocha = require('mocha');
var mongoose = require('mongoose');

var conf = require('./conf');


var mocha = new Mocha({
  ui: 'bdd',
  reporter: 'list',
});

// add testing files
fs.readdirSync('test').filter(function (file) {
  return file !== 'runner.js';
}).forEach(function (file) {
  var fpath = path.join('test', file);
  mocha.addFile(fpath);
});

// some preparation
async.series([
  function (callback) {
    mongoose.connect(conf.mongoURI, callback);
  },
],
// tun tests
function (err) {
  if (err) {
    console.error(err);
    process.exit();
  }
  mocha.run(function (failures) {
    process.exit(failures);
  });
});

