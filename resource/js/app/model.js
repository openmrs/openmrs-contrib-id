define(["app/jquery-loader", "backbone", "app/view", "app/resources", "app/cookie"], function($, Backbone, View, resources, cookie) {
    return Backbone.Model.extend({
        defaults: {
            linksHTML       : undefined,
            hidden          : undefined,
            revealed        : undefined
        },

        initialize: function() {
            _.bindAll(this);

            // Attempt to get previous "hidden" setting from cookies.
            this.set("hidden", cookie.read("globalnav-hidden") == "true");

            // **When the DOM is ready**, Create our view and attack it to this model.
            if ($.isReady)
                this.attachView();
            else
                $().ready(this.attachView);

            // Bind property changes to actions.
            this.on({
                "change:hidden"             : this.updateCookie,
                "change:revealed"           : this.verifyRevealed,
                "all"                       : this.debug
            });

            // Get the links HTML data at start. fetch() calls sync() internally.
            this.fetch();
        },

        // Logs all occurred events if property `debug` = `true`.
        debug: function(event, model, newProp) {
            if (this.get("debug") === true && event !== "change")
                console.log("Model: " + event + ": \n\t" + newProp.toString().replace("\n", "").substring(0, 30));
        },

        attachView: function() {
            this.view = new View({model: this});
        },

        /* BEGIN Getters */
        getLinksHTML: function() {
            return this.get("linksHTML");
        },

        isHidden: function() {
            return this.get("hidden");
        },
        isRevealed: function() {
            if (this.isHidden())
                return this.get("revealed");
            else
                return true;
        },

        /* END Getters */


        /* BEGIN Setters */

        hide: function() {
            this.set("hidden", true);
            this.conceal();
        },

        show: function() {
            this.set("hidden", false);
            this.reveal();
        },

        reveal: function() {
            this.set("revealed", true);
        },

        conceal: function() {
            this.set("revealed", false);
        },
        /* END Setters */


        /* BEGIN Bound Events */

        // Called when `verify` changes. We want to confirm that the navbar is
        // currently hidden, the only time when the `revealed` property can
        // change. If navbar is visible, `revealed` is always true.
        verifyRevealed: function(model, revealState) {
            if (!this.isHidden())
                this.set("revealed", true);
        },

        // Store the hiddenness state (true or false) in a cookie. Returns the
        // cookie's updated content as a string.
        updateCookie: function(model, newState) {
            cookie.create("globalnav-hidden", newState.toString());
            return cookie.read("globalnav-hidden");
        },
        /* END Bound Events */


        /* BEGIN Utilities */

        // Override Backbone's syncing function with one that communicates with
        // OpenMRS ID's navbar module.
        sync: function(method) {
            if (method === "read") {
                $.get(resources.hostname("/globalnav"), this.syncComplete);
            }
        },
        syncComplete: function(data) {
            this.set("linksHTML", data);
        }

        /* END Utilities */
    });
});