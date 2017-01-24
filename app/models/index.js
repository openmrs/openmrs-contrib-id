'use strict';
const fs = require('fs');

fs.readdirSync(__dirname).forEach(file => {
	const regex = /^(.*).js$/.exec(file);
	if (!regex[1]) {
		return;
	}

	const name = regex[1];
	if (name === 'index') {
		return;
	}

	module.exports[name] = require(`./${name}`);
});