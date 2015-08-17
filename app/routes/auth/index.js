'use strict';
exports = module.exports = function (app) {
  require('./login')(app);
  require('./logout')(app);
};