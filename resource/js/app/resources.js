define(["app/jquery-loader"], function($) {
    return {
        hostname: function(path) {
            var a = document.createElement("a");
            a.href = document.getElementById("globalnav-script").src;
            path = path || "";
            return a.protocol + "//" + a.host + path;
        },

        loadStylesheet: function() {
            var link = document.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.href = this.hostname("/globalnav/css/style.css");
            return $("head").append(link);
        },

        loadAll: function() {
            this.loadStylesheet();
        }
    };
});