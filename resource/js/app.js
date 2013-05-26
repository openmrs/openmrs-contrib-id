requirejs.config({
    paths: {
        "app": "./app",
        "lib": "../lib",
        "jquery": "//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min",
        "jquery.hoverIntent": "lib/jquery.hoverIntent.minified",
        "underscore": "lib/underscore-min"
    },
    shim: {
        "jquery": {
            exports: "jQuery"
        },
        "jquery.hoverIntent": ["jquery"],
        "underscore": {
            exports: "_"
        }
    }
});


requirejs(["app/resources", "app/model", "app/view"], function(resources, model, view) {
    resources.loadAll();
    model.initialize(function() {
        console.log(model.linksHTML);
        view.initialize();
    });
});