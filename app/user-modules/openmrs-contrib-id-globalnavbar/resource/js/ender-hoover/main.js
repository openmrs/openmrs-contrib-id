(function(name, context, definition) {
	if (typeof module != 'undefined' && module.exports) module.exports = definition()
	else if (typeof define == 'function' && define.amd) define(definition)
	else context[name] = definition()
})('hoover', this, function() {

	function hoover(options) {
		var el, enter, hovering, leave, reset, settings, timeout,
			_this = this;
		el = this;
		timeout = null;
		hovering = false;
		settings = {
			"in": 250,
			out: 150
		};
		if (options) {
			for (var k in options) {
				settings[k] = options[k];
			}
		}
		enter = function() {
			el.trigger("hooverIn");
			reset();
			return hovering = true;
		};
		leave = function() {
			el.trigger("hooverOut");
			reset();
			return hovering = false;
		};
		reset = function() {
			if (timeout) clearTimeout(timeout);
			return timeout = null;
		};
		el.bind("mouseover", function() {
			if (hovering) {
				return reset();
			} else {
				if (!timeout) return timeout = setTimeout(enter, settings["in"]);
			}
		});
		el.bind("mouseout", function() {
			if (hovering) {
				if (timeout) reset();
				return timeout = setTimeout(leave, settings.out);
			} else {
				return reset();
			}
		});
		return this;
	};

	return hoover

});