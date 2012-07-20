/* Client-side navbar injection */

/** DOMReady v2.0.1 - MIT license - https://github.com/freelancephp/DOMReady */
(function(a){a.DOMReady=function(){var b=[],c=false,d=null,e=function(a,b){try{a.apply(this,b||[])}catch(c){if(d)d.call(this,c)}},f=function(){c=true;for(var a=0;a<b.length;a++)e(b[a].fn,b[a].args||[]);b=[]};this.setOnError=function(a){d=a;return this};this.add=function(a,d){if(c){e(a,d)}else{b[b.length]={fn:a,args:d}}return this};if(a.addEventListener){a.document.addEventListener("DOMContentLoaded",function(){f()},false)}else{(function(){if(!a.document.uniqueID&&a.document.expando)return;var b=a.document.createElement("document:ready");try{b.doScroll("left");f()}catch(c){setTimeout(arguments.callee,0)}})()}return this}()})(window);

// cookie library - quirksmode.org
function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}

// once DOM can be manipulated
DOMReady.add(function(){
	var hideEnabled = false;

	// load the globalnav stylesheet
	var link = document.createElement('link');
	link.setAttribute('rel', 'stylesheet');
	link.href = '/globalnav/style.css';
	document.body.appendChild(link);
	
	// will be called once navbar request has returned
	var ajaxLoaded = function(){
		var data = req.responseText;
		var container = document.createElement('div');
		container.id = 'globalnav-container';
		container.innerHTML = data; // causing MobileWebKit problems?
		
		// get hidden status from cookies
		var hidden = readCookie('globalnav-hidden');
		if (hidden == 'true') {
			hideEnabled = true;
			container.className = 'hidden';
		}
		
		document.body.insertBefore(container, document.body.firstChild);
		setHidden();
	}
	
	// load navbar HTML via AJAX (server-side)
	var req = new XMLHttpRequest()
	req.open("GET", "/globalnav", true);
	req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	req.addEventListener("load", ajaxLoaded, false);
	req.send();
	
	
	
	var setHidden = function(){
		var hide = document.getElementById('globalnav-hide'),
			cont = document.getElementById('globalnav-container');
			
		if (hideEnabled) hide.innerHTML = 'show';

		// set hidden class and cookie on click
		hide.onclick = function(){
			if (!hideEnabled) { // will be hidden
				cont.className += 'hidden';
				createCookie('globalnav-hidden', 'true');
				hide.innerHTML = 'show';
				
				setTimeout(function(){hideEnabled = true;}, 500);
			}
			else { // will be shown
				cont.className = cont.className.replace('hidden', '');
				hideEnabled = false;
				hide.innerHTML = 'hide';
				eraseCookie('globalnav-hidden');
			}
		}
		
		setTimeout(function(){ // prevents WebKit from executing on page load
			// expand on hover
			cont.onmouseover = function(event){
				if (hideEnabled) cont.className = cont.className.replace('hidden', '');
			}
			
			// hide on mouseout
			cont.onmouseout = function(){
				if (hideEnabled && cont.className.indexOf('hidden') < 0) cont.className += 'hidden'; 
			}
		}, 100);
	}
	
});
