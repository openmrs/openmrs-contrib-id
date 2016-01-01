'use strict';

$(document).ready(function() {
  var SPINNER = $('input[name=spinner]').val();
  var disguise = function scrambleFields(name, spin) {
      var text = name + SPINNER;
      var hash = CryptoJS.MD5(text);
      return hash.toString(CryptoJS.enc.hex);
  };

  $('input#country').closest('.form-group').hide();

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
    }) ();



    /* LOGIN FORM REDIRECT-TO */
    $('#redirect-to').attr('value', getParameterByName('destination'));

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
