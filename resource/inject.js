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
	document.cookie = name+"="+value+expires+"; path=/; domain=openmrs.org";
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

// build indexOf code for IE
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(obj, start) {
	     for (var i = (start || 0), j = this.length; i < j; i++) {
	         if (this[i] === obj) { return i; }
	     }
	     return -1;
	}
}

// once DOM can be manipulated
DOMReady.add(function(){
	var hideEnabled = false;
	
	// get script tag of this file (used to get relative path)
	var scripts = document.getElementsByTagName('script'), s = undefined;
	for (var i = 0; i < scripts.length; i++) {
		if (/\/globalnav\/inject.js(?:\?.+)?$/.test(scripts[i].src)) s = scripts[i];
	}
	var a = document.createElement('a');
	a.href = s.src;
	var relPath = a.protocol+'//'+a.host;

	// load the globalnav stylesheet
	var link = document.createElement('link');
	link.setAttribute('rel', 'stylesheet');
	link.href = relPath+'/globalnav/style.css';
	document.body.appendChild(link);
	
	// will be called once navbar request has returned
	var ajaxLoaded = function(req){
		var data = req.responseText;
		console.log(data);
		
		var container = document.createElement('div');
		container.id = 'globalnav-container';
		container.innerHTML = data; // causing MobileWebKit problems?
		
		// get hidden status from cookies
		var hidden = readCookie('globalnav-hidden');
		if (hidden == 'true') {
			hideEnabled = true;
			container.className = 'navbar-hidden';
			
			// re-set cookie
			createCookie('globalnav-hidden', 'true', 90);
		}
		else createCookie('globalnav-hidden', 'false', 90);
		
		document.body.insertBefore(container, document.body.firstChild);
		
		
		// configure hiddenness
	
		var hide = document.getElementById('globalnav-hide'),
			cont = document.getElementById('globalnav-container');
			
		if (hideEnabled) hide.innerHTML = '[show]';

		// set hidden class and cookie on click
		hide.onclick = function(){
			if (!hideEnabled) { // will be hidden
				cont.className += 'navbar-hidden';
				
				// set cookie to true	
				createCookie('globalnav-hidden', 'true', 90);
					
				hide.innerHTML = '[show]';
				
				setTimeout(function(){hideEnabled = true;}, 500);
			}
			else { // will be shown
				cont.className = cont.className.replace('navbar-hidden', '');
				hideEnabled = false;
				hide.innerHTML = '[hide]';
				
				// set cookie to false	
				createCookie('globalnav-hidden', 'false', 90);
			}
		}
		
		setTimeout(function(){ // prevents WebKit from executing on page load
			// expand on hover
			cont.onmouseover = function(event){
				if (hideEnabled) cont.className = cont.className.replace('navbar-hidden', '');
			}
			
			// hide on mouseout
			cont.onmouseout = function(){
				if (hideEnabled && cont.className.indexOf('navbar-hidden') < 0) cont.className += 'navbar-hidden'; 
			}
		}, 100);
	}
	
	// load navbar HTML via AJAX (server-side)
	var usedXHR = false, usedXDR = false,
		urlString = relPath+"/globalnav/?time="+new Date().getTime(); // time string prefents IE from caching
	if (XMLHttpRequest) {
		if ("withCredentials" in new XMLHttpRequest()) { // modern browsers
			usedXHR = true;
			var req = new XMLHttpRequest()
			req.open("GET", urlString, true);
			req.addEventListener("load", function(){ajaxLoaded(req);});
			req.send();
		}
		else if (XDomainRequest) { // internet explorer
			usedXDR = true;
			var xdr = new XDomainRequest();
			xdr.open("get", urlString, true);
			xdr.onload = function(){ajaxLoaded(xdr);}
			xdr.send();
		}
		
	}
});