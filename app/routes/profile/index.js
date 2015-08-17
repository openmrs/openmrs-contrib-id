'use strict';
exports = module.exports = function (app) {
  require('./email')(app);
  require('./password')(app);
  require('./profile')(app);
};