// r.js optimization script. Minifies and concatenates the app into one
// file, and bundles Almond (a super-simple module loader) along with it.
//
// To build:
//
//     $ r.js -o app.build.js

({
    // Configuration options for the optimizer.
    baseUrl: "./",
    findNestedDependencies: true,
    wrap: true,

    // Should always copy paths in app.js.
    paths: {
        "app": "./app",
        "lib": "./lib",
        "jquery": "lib/jquery.min",
        "hoover": "lib/hoover-amd",
        "underscore": "lib/underscore-min",
        "backbone": "lib/backbone-min"
    },

    // Define what script to optimize. Almond is optimized, and our app
    // is included along with it. `insertRequire` auto-requires our app
    // once Almond loads.
    name: "lib/almond",
    include: ["app"],
    insertRequire: ["app"],

    // Where this optimized file is saved.
    out: "./app-optimized.js"
})