'use strict';

$(document).ready(() => {
	if ($('#uname').html() !== 'reset-private') {
		return;
	}

	$('#cpassword').data({
		validate: function() {
			var pass = $('#password').val();
			var cpass = $('#cpassword').val();
			if (pass !== cpass) {
				return 'Mismatched';
			}
		}
	});
});