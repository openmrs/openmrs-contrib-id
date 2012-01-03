/* recaptcha settings */
var RecaptchaOptions = {
	theme : 'custom',
	custom_theme_widget: 'recaptcha_widget'
};

/* login redirect-to */
function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.href);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

$().ready(function(){

	/* initiate Placeholder.js */
	Placeholder.init({wait: true});
	
	/* focus on a failed input field */
	if ($('.field.fail')) $('.field.fail:first').children('input').focus();
	
	/* "MORE" BANNER */	
	var moreExpanded = $('#header ul#more').outerHeight(true),
		moreOriginal = $('#header li#moreContainer').outerHeight(true),
		moreOpened = false, 
	
	$('#header li#moreContainer').click(function(event){
		event.stopPropagation();
		if (moreOpened==false) {
			$(this).css('height', moreExpanded).addClass('on');
			moreOpened = true;
		}
		else if (moreOpened==true) {
			$(this).attr('style', '').removeClass('on');
			moreOpened = false;
		}
	});
	$('#header ul#more a').click(function(event){
		event.stopPropagation();
		document.location = $(this).attr('href');
	});
	
	
	
	/* LOGIN POPOVER */
	var button = $('#login-menu'),
		popover = $('#login-menu .popover'),
		arrow = $('#login-menu .popover-direction'),
		buttonLink = $('#login-menu > a'),
		popoverLink = $('#login-menu .popover a');
		
	buttonLink.click(function(event){
		event.preventDefault();
		event.stopPropagation();
		$(this).siblings('.popover').toggleClass('visible').children('input')[0].focus();
	});
		
	popoverLink.click(function(event){
		
	});
	popover.click(function(event){
		event.stopPropagation();
	})
	$('body').click(function(event) {
		if (popover.hasClass('visible'))
			popover.removeClass('visible');
	});
		
	var setLoginPopoverMargins = function() {
		
		var buttonWidth = button.outerWidth(),
			buttonXOffset = button.position().left,
			popoverWidth = popover.outerWidth(),
			popoverXOffset = button.position().left,
			arrowWidth = arrow.outerWidth(),
			bodyWidth = $('body').innerWidth();
		
		// Center the popover over the button
		popover.css('right', (buttonWidth - popoverWidth) / 2);
		arrow.css('right', (buttonWidth - arrowWidth) / 2);
		
		// Correct if the popover goes outside the window
		if ((popoverXOffset + popoverWidth) > bodyWidth) {
			var overshot = (popoverXOffset + popoverWidth) - bodyWidth,
				currentMargin = parseInt(popover.css('right')),
				toMove = currentMargin + overshot;
			if (toMove >= 0) toMove = 0;
			popover.css('right', toMove);
		}
	}
	setLoginPopoverMargins();
	window.onresize = setLoginPopoverMargins;
	
	
	
	/* FIELD DESCRIPTIONS */
	$('.field input').focusin(function(){
		$('.description').css('visibility', 'hidden');
		$(this).siblings('.description').css('visibility', 'visible');
	});
	
	$('.field.noedit p').click(function(){
		$(this).siblings('.description').css('visibility', 'visible');
	}).mouseout(function(){
		$(this).siblings('.description').css('visibility', 'hidden');
	});
	
	// Show description of page draws with an input focused (autofocused)
	if ($('.field input:focus').siblings('.description').css('visibility') != 'visible')
		$('.field input:focus').siblings('.description').css('visibility', 'visible');
	
	$('.field input[name=username]').keyup(function(){
		var userInput = this, userVal = $(this).val(), searchTimeout = {}, origUserText = $('.field input[name=username]').siblings('span').html();
		clearTimeout(searchTimeout);
		if (userVal) {
			searchTimeout = setTimeout(function(){
				$.ajax({
					url: '/checkuser/'+userVal,
					error: function(){},
					success: function(data) {
						data = $.parseJSON(data);
						if (data.illegal) {
							$(userInput).parent().addClass('fail').children('span.description').html('Illegal username specified. Usernames can contain numbers and letters.');
						}
						else {
							if (!data.exists) {
								if ($(userInput).parent().hasClass('fail')) $(userInput).parent().removeClass('fail');
								$(userInput).parent().addClass('valid').children('span.description').html('<span class="validtext">"'+userVal+'" is available!</span>');
							}
							if (data.exists) {
								$(userInput).parent().addClass('fail').children('span.description').html('<span class="failtext">"'+userVal+'" is already taken.</span>');
							}
						}
					}
				});
			}, 500);
		}
		else $(this).siblings('span').html(origUserText);
	});
	
	/* LOGIN FORM REDIRECT-TO */
	$('#redirect-to').attr('value', getParameterByName('destination'));
	
	/* NEXT... FIELD */
	var duplicate = function(){
		var toClone = $(this).prev().clone(true);
		if (toClone.children('label')) toClone.children('label').detach();
		if (toClone.hasClass('fail')) toClone.removeClass('fail');
		toClone.children('input').attr('value', '');
		toClone.insertBefore(this).children('input').focus();
	}
	$('.multi-field .field.next').focusin(duplicate); 
	$('.multi-field .field input').focusout(function(){
		numberOfFields = $('.multi-field .field').not('.next').length;
		if (numberOfFields > 1 && !$(this).attr('value')) {
			if ($(this).parent().has('label').length > 0) var fieldLabel = $(this).parent().children('label')
			$(this).parent().detach();
			if (fieldLabel) {
				fieldLabel.prependTo('.multi-field .field:first-child');
			}
		}
		else if (numberOfFields == 1 && !$(this).attr('value')) $('.multi-field .field.next').detach();
	});
	$('.multi-field .field:first-child').keydown(function(){
		if ($(this).children('input').attr('value') && $('.multi-field .field').length == 1) {
			var toClone = $(this).clone(true);
			if (toClone.children('label')) toClone.children('label').detach();
			toClone.addClass('next').children('input').attr('value', 'Next…').attr('name', '').siblings('.description').css('visibility', 'hidden');
			toClone.focusin(duplicate);
			toClone.insertAfter(this);
		}
	});	
	
	
	
	/* close any opened item when clicked outside (such as banner, popover, etc) */
	$('html').click(function(){
		if (moreOpened==true) {
			$('#header li#moreContainer').attr('style', '').removeClass('on');
			moreOpened = false;
		}
		if ($('body').hasClass('inline-login')) $('body').removeClass('inline-login');
		if ($('body').hasClass('highlight-banners')) $('body').removeClass('highlight-banners');
	});
});