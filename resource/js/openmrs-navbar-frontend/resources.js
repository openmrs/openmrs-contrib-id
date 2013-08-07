!(function ($) {
    var reqwest = require('reqwest')
    , lazyload = require('lazyload')

    module.exports.hostname = function(path) {
        var a = document.createElement("a");
        a.href = document.getElementById("globalnav-script").src;
        path = path || "";
        return a.protocol + "//" + a.host + path;
    };

    module.exports.loadStylesheet = function(callback) {
        $.domReady(function() {
            var url = this.hostname("/globalnav/css/style.css");
            lazyload.css(url, callback);
        }.bind(this));
    };
})(ender)