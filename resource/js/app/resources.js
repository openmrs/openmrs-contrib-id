define(function() {
    return {
        relativePath: null,

        loadStylesheet: function() {
            var link = document.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.href = this.resolvePath("/globalnav/style.css");
            return $("head").append(link);
        },

        // all IE compatability hacks etc.
        compatability: function() {
            // build indexOf code for IE
            if (!Array.prototype.indexOf) {
                Array.prototype.indexOf = function(obj, start) {
                    for (var i = (start || 0), j = this.length; i < j; i++) {
                        if (this[i] === obj) { return i; }
                    }
                    return -1;
                };
            }
        },

        resolvePath: function(path) {
            if (!path)
                path = "";
            if (!this.relativePath) {
                // get script tag of this code (used to get relative path)
                var scripts = document.getElementsByTagName("script"), s = null;
                for (var i = 0; i < scripts.length; i++) {
                    if (/\/globalnav\/js\/require.js(?:\?.+)?$/.test(scripts[i].src)) s = scripts[i];
                }
                var a = document.createElement("a");
                a.href = s.src;
                this.relativePath = a.protocol+"//"+a.host;
            }

            return this.relativePath + path;
        },

        loadAll: function() {
            this.loadStylesheet();
            this.compatability();
        }
    };
});