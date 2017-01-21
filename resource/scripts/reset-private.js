'use strict';

$(document).ready(function () {
  if ($('#uname').html() !== 'reset-private') {
    return ;
  }

  $('#cpassword').data({
    validate: function () {
      var pass = $('#password').val();
      var cpass = $('#cpassword').val();
      if (pass !== cpass) {
        return 'Mismatched';
      }
    }
  });
});
