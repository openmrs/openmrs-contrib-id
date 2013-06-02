// Determine the server this script lives on, by looking for a script on the
// page with and id `globalnav-script`. Needed to set baseUrl.
var hostname = function(path) {
    var a = document.createElement("a");
    a.href = document.getElementById("globalnav-script").src;
    return a.protocol + "//" + a.host + (path) ? path : "";
};

requirejs.config({
    baseUrl: hostname("/globalnav/js"),
    paths: {
        "app": "./app",
        "lib": "./lib",
        "jquery": "lib/jquery.min",
        "hoover": "lib/hoover-amd",
        "underscore": "lib/underscore-min",
        "backbone": "lib/backbone-min"
    }
});

// First, load library dependencies for the app.
requirejs(["app/jquery-loader", "underscore"], function() {

    // Now, load application code and create the navbar object.
    requirejs(["app/resources", "app/model"], function(resources, Model) {
        resources.loadAll();

        // The model (which is parent of the view) is accessible globally, so
        // the page is free to invoke any navbar functionality externally. For
        // example, a button on the page might reveal a hidden navbar.
        if (window.globalnav)
            window.globalnav.model = new Model();
        else
            window.globalnav = new Model();
    });
});