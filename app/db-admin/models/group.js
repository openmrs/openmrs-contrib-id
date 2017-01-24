'use strict';
const path = require('path');
const Group = require('../../models/group');

Group.formage = {
	label: 'Groups',

	list: [
		'groupName',
		'description',
	],

	search: [
		'groupName',
	],

	exclude: [
		'inLDAP',
	],
};

exports = module.exports = Group;