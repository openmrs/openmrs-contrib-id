'use strict';
/**
 * Programmtically execute mocha tests
 */
const fs = require('fs');
const path = require('path');
const async = require('async');
const Mocha = require('mocha');
const mongoose = require('mongoose');
const _ = require('lodash');

const conf = require('./conf');

// patch log4js
require('../app/logger');


const mocha = new Mocha({
  ui: 'bdd',
  reporter: 'list',
});

// recursivly add a folder for testing
const addFolder = folder => {
  fs.readdirSync(folder).forEach(file => {
    const p = path.join(folder, file);
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