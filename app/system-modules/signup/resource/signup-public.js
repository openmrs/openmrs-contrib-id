(function() {
this.disguise = function scrambleFields(name, spin) {
var text = name + SPINNER;
var hash = CryptoJS.MD5(text);
return hash.toString(CryptoJS.enc.hex);
}
$(document).ready(function() {
$('.field input[placeholder=Country]').parent().css('display', 'none')
})
})()