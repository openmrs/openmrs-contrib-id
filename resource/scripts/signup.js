'use strict';


$(document).ready(function() {
	if ($('#uname').html() !== 'signup') {
		return;
	}

	var SPINNER = $('input[name=spinner]').val();
	var disguise = function scrambleFields(name, spin) {
		var text = name + SPINNER;
		var hash = CryptoJS.MD5(text);
		return hash.toString(CryptoJS.enc.hex);
	};

	$('input#country').closest('.form-group').hide();

	// form level validation
	$('form#form-signup').data({
		vns: function(callback) {
			// check recaptcha first
			if (grecaptcha.getResponse() === "") {
				setTimeout(function() {
					$('form#form-signup').find('input#submit')
						.closest('.form-group').find('label.error')
						.removeClass('show');
				}, 2000);

				return callback({
					submit: 'Please complete Captcha!'
				});
			}
			$.ajax({
					url: '/signup',
					headers: {
						Accept: 'application/json'
					},
					data: $('form#form-signup').serialize(),
					dataType: 'json',
					method: 'POST'
				})
				.done(function(data) {
					if (data.success) {
						window.location.href = '/signup/verify';
						return;
					}
					if (data.fail) {
						if (data.fail.primaryEmail) {
							data.fail.email = data.fail.primaryEmail;
							delete data.fail.primaryEmail;
						}
						return callback(data.fail);
					}
				})
				.fail(function(error) {
					var trackId = error.responseJSON.trackId;
					$('#err').modal();
					var html = '<h2>Oops...something went wrong.<br><br>Tracking Code: ' + trackId + '</h2>';
					html += '<br>Please <a href="https://help.openmrs.org/customer/portal/emails/new">contact the Help Desk</a> and include the above code, the e-mail address used and your OpenMRS ID.';
					$('#errText').html(html);
				});
		}
	});

	//focus
	if ($('#uname').val() === 'signup') {
		alert('find signup');
		$('#country').parent().hide();
		(function setFocus() {
			var field = $('#username');
			if (field.val() === '') {
				return field.focus();
			}
			field = $('#firstName');
			if (field.val() === '') {
				return field.focus();
			}
			field = $('#lastName');
			if (field.val() === '') {
				return field.focus();
			}
			field = $('#primaryEmail');
			if (field.val() === '') {
				return field.focus();
			}
			field = $('#password');
			if (field.val() === '') {
				return field.focus();
			}
		})();




		// var searchTimeout = {}, origUserText = $('.field input[placeholder=Username]').siblings('span').html();
		// $('.field input[placeholder=Username]').keyup(function(){
		//     var userInput = this, userVal = $(this).val();
		//     clearTimeout(searchTimeout);
		//     if (userVal) {
		//         searchTimeout = setTimeout(function(){
		//             $.ajax({
		//                 url: '/checkuser/'+userVal,
		//                 error: function(){},
		//                 success: function(data) {
		//                     data = $.parseJSON(data);
		//                     if (data.illegal) {
		//                         $(userInput).parent().addClass('fail').children('span.description').html('Illegal username specified. Usernames can contain numbers and letters.');
		//                     }
		//                     else {
		//                         if (!data.exists) {
		//                             if ($(userInput).parent().hasClass('fail')) $(userInput).parent().removeClass('fail');
		//                             $(userInput).parent().addClass('valid').children('span.description').html('<span class="validtext">"'+userVal+'" is available!</span>');
		//                         }
		//                         if (data.exists) {
		//                             $(userInput).parent().addClass('fail').children('span.description').html('<span class="failtext">"'+userVal+'" is already taken.</span>');
		//                         }
		//                     }
		//                 }
		//             });
		//         }, 1000);
		//     }
		//     else $(this).siblings('span').html(origUserText);
		// });
	}
});