'use strict';

$(document).ready(function () {
  if ($('#uname').html() !== 'login') {
    return;
  }

  /* LOGIN FORM REDIRECT-TO */
  $('#redirect-to').attr('value', getParameterByName('destination'));

});
