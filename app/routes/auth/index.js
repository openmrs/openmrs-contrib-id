'use strict';
exports = module.exports = app => {
  require('./login')(app);
  require('./logout')(app);
};