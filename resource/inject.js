/* Client-side navbar injection */

// using basic jQuery (should be built in to every page already)
jQuery(document).ready(function(){
	// load the globalnav stylesheet
	var link = document.createElement('link');
	link.setAttribute('rel', 'stylesheet');
	link.href = 'http://localhost:3000/globalnav/style.css';
	document.body.appendChild(link);
	
	// will be called once navbar request has returned
	var ajaxLoaded = function(){
		var data = req.responseText;
		var container = document.createElement('div');
		container.id = 'globalnav-container';
		container.innerHTML = data; // causing MobileWebKit problems?
		
		document.body.insertBefore(container, document.body.firstChild)
	}
	
	// load navbar HTML via AJAX (server-side)
	var req = new XMLHttpRequest()
	req.open("GET", "http://localhost:3000/globalnav", true);
	req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	req.addEventListener("load", ajaxLoaded, false);
	req.send();
});
