'use strict';

$(document).ready(function() {
	if ($('#uname').html() !== 'reset-public') {
		return;
	}

	$('#reset').data({
		validate: function() {
			var input = $('#reset').val();
			if (emailRegex.test(input)) {
				return;
			}
			if (usernameRegex.test(input)) {
				return;
			}
			return 'Invalid';
		}
	});
});