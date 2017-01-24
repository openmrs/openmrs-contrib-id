// Thanks, IE8
if (! function() {}.bind) {
	Function.prototype.bind = function() {
		var me = this,
			shift = [].shift,
			he = shift.apply(arguments),
			ar = arguments
		return function() {
			return me.apply(he, ar);
		}
	}
}

// Inject margin as soon as possible, to prevent flash of un-navbarred content
OpenMRSNavbar.ender.domReady(function() {
	document.body.style.paddingTop = '27px'
})

OpenMRSNavbar.loadStylesheet(function() {
	OpenMRSNavbar.instance = new OpenMRSNavbar.Model();
});