'use strict';
// handle all the validations


$(document).ready(function () {
  // only show descriptions when focus on input
  $('form input').focusin(function () {
    $(this).closest('.form-group').find('.description').addClass('show');
  }).focusout(function () {
    $(this).closest('.form-group').find('.description').removeClass('show');
  });

  // autofocused
  $('form input:focus').closest('.form-group')
    .find('.description').addClass('show');


  // make error label invisible when focus on input
  $('form.validate input').focusin(function () {
    $(this).closest('.input-wrapper')
      .find('label.error.show').removeClass('show');
  });
  // or focus on the label
  $('form.validate label.error').click(function () {
    $(this).removeClass('show')
      .closest('.input-wrapper').find('input').focus();
  });

  // bind all kinds of sync validation with
  // $(element).data({validate: function})
  $('form.validate input#username').data({
    validate: function () {
      var user = $('form.validate input#username').val();
      if (user.length < 3) {
        return 'Too short';
      }
      if (user.length > 19) {
        return 'Too long';
      }
      if (/[0-9]/.test(user[0]) ) {
        return 'Start with letter';
      }
      if (!usernameRegex.test(user)) {
        return 'Only (a-z, 0-9) are allowed';
      }
    }
  });

  $('form.validate input#password').data({
    validate: function () {
      var pass = $('form.validate input#password').val();
      if (pass.length < 8) {
        return 'Too short';
      }
      if (pass.length > 19) {
        return 'Too long';
      }
    }
  });

  $('form.validate input#email').data({
    validate: function  () {
      var email = $('form.validate input#email').val();
      if (email.length > 19) {
        return 'Too long';
      }
      if (!emailRegex.test(email)) {
        return 'Invalid email';
      }
    }
  });

  // async validation and submit
  $('form#form-signup').data({
    vns: function (callback) {
      //TODO
    }
  });

  $('form#form-login').data({
    vns: function (callback) {
      //TODO
    }
  });


  // perform validations
  $('form.validate')
    .submit( function(event) {
      event.preventDefault();

      var valid = true;
      function showError(jElement, msg) {
        valid = false;
        var label = jElement.closest('.form-group').find('label.error');
        if (!msg) {
          msg = '×';
        }
        label.html(msg);
        label.addClass('show');
      }

      // perform all sync validation
      $(this).find('input').each(function (idx, element) {
        element = $(element);

        var validate = element.data('validate');
        if (!validate) {
          return ;
        }
        var err = validate();
        if (err) {
          showError(element, err);
        }
      });

      if (!valid) {
        return;
      }

      // perform async form validation and submit
      var vns = $(this).data('vns');
      if (!vns) {
        $(this).submit();
      }




    });
});
