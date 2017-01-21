'use strict';

exports = module.exports = app => {
	// Load strategies
	require('./lib/discourse')(app);
	require('./lib/deskcom')(app);
	require('./lib/atlas')(app);
};