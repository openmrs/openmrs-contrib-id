'use strict';

$(document).ready(function() {
	if ($('#uname').html() !== 'profile') {
		return;
	}

	// deal with the welcome-message
	if (Cookies.get('welcome-later')) {
		$('#welcome-message').hide();
	}

	$('#done').click(function() {
		$.ajax('/profile/welcome').done(function() {
			$('#welcome-message').hide();
		});
	});

	$('#later').click(function() {
		Cookies.set('welcome-later', true, {
			expires: 1,
			path: ''
		});
		$('#welcome-message').hide();
	});

	/* toggle Add Email form */
	$('#addEmail').hide();
	$('#addEmailToggle').on('click', function(e) {
		e.preventDefault();
		$('#addEmail').slideToggle();
		$('input#email').focus();
	});

	/* toggle Edit Password form */
	$('#editPassword').hide();
	$('#editPasswordToggle').on('click', function(e) {
		e.preventDefault();
		$('#editPassword').slideToggle();
		$('#input#currentpassword').focus();
	});


	// validations

	$('input#newpassword').data({
		validate: function() {
			var pass = $('#editPassword input#newpassword').val();
			if (pass.length < 8) {
				return 'Too short';
			}
		}
	});

	$('input#confirmpassword').data({
		validate: function() {
			var pass = $('#editPassword input#newpassword').val();
			var cpass = $('#editPassword input#confirmpassword').val();
			if (pass !== cpass) {
				return 'Mismatched';
			}
		}
	});

	$('#editPassword.validate').data({
		vns: function(callback) {
			$.post('/password', $('#editPassword').serialize())
				.done(function(data) {
					if (data.success) {
						return window.location.reload();
					}
					if (data.fail) {
						return callback(data.fail);
					}
				})
				.fail(function() {
					//body
				});
		}
	});

	$('#addEmail.validate').data({
		vns: function(callback) {
			$.post('/profile/email', $('#addEmail').serialize())
				.done(function(data) {
					if (data.success) {
						return window.location.reload();
					}
					if (data.fail) {
						return callback(data.fail);
					}
				})
				.fail(function() {
					// body...
				});
		}
	});

});
