'use strict';
exports = module.exports = app => {
	require('./email')(app);
	require('./password')(app);
	require('./profile')(app);
};