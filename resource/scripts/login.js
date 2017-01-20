'use strict';

$(document).ready(() => {
	if ($('#uname').html() !== 'login') {
		return;
	}

	/* LOGIN FORM REDIRECT-TO */
	$('#redirect-to').attr('value', getParameterByName('destination'));

});