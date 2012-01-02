var hist = new Object;

window.tabberOptions = {
	onClick: function(event){ // push state change to location bar
		var dest = event.event.target.name;
		history.pushState(hist, dest, contextPath+dest);
	},
	onLoad: function(tabRef){ // allow direct linking to tab
		var path = window.location.pathname, path = (/\/.+/.test(path)) ? path : '/'+path, // IE compatibility
			tabPath = path.split(contextPath)[1],
			tabController = tabRef.tabber;
			
		for (var i=0; i<tabController.tabs.length; i++) {
			var tabAnchor = tabController.tabs[i].anchorText;
			if (tabAnchor == tabPath) tabController.tabShow(i);
		}
	}
};

var cssref=document.createElement("link");
cssref.setAttribute("rel", "stylesheet");
cssref.setAttribute("href", '/resource/tabber.css');

var jsref=document.createElement('script');
jsref.setAttribute("type","text/javascript");
jsref.setAttribute("src", '/resource/tabber.js');

document.getElementsByTagName("head")[0].appendChild(cssref);
document.getElementsByTagName("head")[0].appendChild(jsref);