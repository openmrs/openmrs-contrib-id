'use strict';
/**
 *
 * This file describes the behaviors of forms and its related validations*
 * along with form.less.
 * It's designed to be general-purposed.
 *
 * Typical form shall have such structures below.
 * form
 *   div.form-group
 *     input
 *     *.description
 * The description would only be shown when input that belongs
 * to the same .form-group is focused.
 * The input and .description doesn't needs to be siblins necessarily.
 *
 *
 * As for form with validations, they are like this way,
 * form.validation
 *   div.form-group
 *     div.input-wrapper
 *       input#name
 *       label.error
 *     *.description
 *
 * label.error shall be shown only when certain invalid fields
 * are found after validation, and they'll contain the error messages.
 * You can bind validators with certain inputs by
 *   $('input#name').data({
 *     validate: function () { }
 *   });
 * All such validators shall be sync and returns the error message
 * or nothing if correct.
 *
 * You can also bind a validate & submit function to the form itself,
 * it could be async and should be defined this way,
 *   $('form.validate#name').data({
 *     vns: function(callback) { }
 *   });
 * The callback accepts callback(err) and err shall be an object contains
 * all the error messages.
 * E.G.
 *   err = {
 *     username: 'Too short.',
 *     lastName: 'Forgot?',
 *   };
 * And the corresponding label.error of input#username and input#lastname
 * would be set accordingly.
 * The vns function would be used to replace the default submit() behaviors,
 * and if no vns provided submit would be called after validation is passed.
 *
 *
 *       Ply_py     me@plypy.com
 *
 */



$(document).ready(function() {
	// only show descriptions when focus on input
	$('form input').focusin(function() {
		$(this).closest('.form-group').find('.description').addClass('show');
	}).focusout(function() {
		$(this).closest('.form-group').find('.description').removeClass('show');
	});

	// autofocused
	$('form input:focus').closest('.form-group')
		.find('.description').addClass('show');


	// make error label invisible when focus on input
	$('form.validate input').focusin(function() {
		$(this).closest('.input-wrapper')
			.find('label.error.show').removeClass('show');
	});
	// or focus on the label
	$('form.validate label.error').click(function() {
		$(this).removeClass('show')
			.closest('.input-wrapper').find('input').focus();
	});


	// common sync field validations
	// bind all kinds of sync validation with
	// $(element).data({validate: function})
	$('form.validate input#username').data({
		validate: function() {
			var user = $('form.validate input#username').val();
			if (user.length < 3) {
				return 'Too short';
			}
			if (user.length > 19) {
				return 'Too long';
			}
			if (/[0-9]/.test(user[0])) {
				return 'Must Start with letter';
			}
			if (!usernameRegex.test(user)) {
				return 'must start lowercase letters and/or numbers. (a-z, 0-9 only)';
			}
		}
	});

	$('form.validate input#password').data({
		validate: function() {
			var pass = $('form.validate input#password').val();
			if (pass.length < 8) {
				return 'Too short (length must be between 8 to 100 characters)';
			}
			if (pass.length > 100) {
				return 'Too long (length must be between 8 to 100 characters)';
			}
		}
	});

	$('form.validate input#email').data({
		validate: function() {
			var email = $('form.validate input#email').val();
			if (email.length > 64) {
				return 'Too long';
			}
			if (!emailRegex.test(email)) {
				return 'Invalid email';
			}
		}
	});


	$('form#form-login').data({
		vns: function(callback) {
			//TODO
		}
	});


	// perform validations
	$('form.validate')
		.submit(function(event) {

			var valid = true;
			var form = $(this);

			function showError(jElement, msg) {
				var label = jElement.closest('.input-wrapper').find('label.error');
				if (!msg || 'string' !== typeof msg) {
					msg = '×';
				}
				label.html(msg);
				label.addClass('show');
			}

			// perform all sync validation
			form.find('input').each(function(idx, input) {
				input = $(input);

				if (input.hasClass('required') && input.val() === '') {
					valid = false;
					showError(input, 'Required');
					return;
				}

				var validate = input.data('validate');
				if (!validate) {
					return;
				}
				var err = validate();
				if (err) {
					valid = false;
					showError(input, err);
				}
			});


			if (!valid) {
				event.preventDefault();
				return;
			}

			// perform async form validation and submit
			var vns = form.data('vns');
			if (!vns) {
				form.submit();
				return;
			}
			event.preventDefault();
			vns(function(err, data) {
				if (!err) {
					return;
				}
				for (var name in err) {
					showError($('#' + name), err[name]);
				}
			});
		});
});
