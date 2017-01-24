// adapted from cookie library at quirksmode.org

!(function($) {
	module.exports.Cookie = {
		domain: "openmrs.org",

		create: function(name, value, days) {
			if (!days)
				days = 365;
			var expires = "";
			if (days) {
				var date = new Date();
				date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
				expires = "; expires=" + date.toGMTString();
			}
			document.cookie = name + "=" + value + expires + "; path=/; domain=" + this.domain;
		},

		read: function(name) {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			for (var i = 0; i < ca.length; i++) {
				var c = ca[i];
				while (c.charAt(0) == ' ') c = c.substring(1, c.length);
				if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
			}
			return null;
		},

		erase: function(name) {
			this.create(name, "", -1);
		}
	};
})(ender);