!(function ($) {
    var Backbone = require('backbone')
    , _ = require('underscore')

    Backbone.$ = $;

    module.exports.View = Backbone.View.extend({
        // Container properties are represented by this view and are defined here.
        tagName: "div",
        id: "globalnav-container",
        className: "cleanslate",

        initialize: function() {

            // Sets the context ("this") of all methods to reference the module itself.
            // This allows callback functions, etc. to still be able to reference this
            // module and its properties.
            _.bindAll(this, 'render', 'updateHiddenness', 'updateReveal');

            // Bind module events to the view's update functions.
            this.model.on({
                "change:linksHTML"      : this.render,
                "change:hidden"         : this.updateHiddenness,
                "change:revealed"       : this.updateReveal
            });

            // If our model is already populated, go ahead and render.
            if (this.model.getLinksHTML())
                this.render();
        },

        /* BEGIN Bound Events */

        // Parse the navbar and draw it to the document.
        render: function() {
            // Remove navbar from the document if re-rendering.
            if ($("#globalnav").length > 0) {
                $("#globalnav").detach();
            }

            // Parse HTML and insert it to the document.
            var linksHTML = this.model.getLinksHTML();
            this.el.innerHTML = linksHTML;

            // Hide the element. This prevents a flash of unstyled content until
            // being overridden by CSS.
            this.el.style.display = "none";

            this.updateHiddenness();
            this.updateReveal();

            $("body").prepend(this.el);
        },

        // Change the navbar's class (a state class) and the text of the hidden-
        // ness button when we hide or unhide.
        updateHiddenness: function() {
            if (this.model.isHidden()) {
                this.$("#globalnav-state-button").html("[show]");
                $("body").removeClass("navbar-visible").addClass("navbar-hidden");

                // Apply hoover to the navbar container.
                $(this.el).hoover({"in": 1000, "out": 250})
                    .on("hooverIn", this.model.reveal)
                    .on("hooverOut", this.model.conceal);

            } else {
                this.$("#globalnav-state-button").html("[hide]");
                $("body").removeClass("navbar-hidden").addClass("navbar-visible");

                // Remove hoover's event bindings.
                this.$el.unbind("hooverIn").unbind("hooverOut");
            }
        },

        updateReveal: function() {
            if (this.model.isRevealed()) {
                this.$el.removeClass("navbar-hidden");
            } else {
                this.$el.addClass("navbar-hidden");
            }
        },

        /* END Bound Events */


        /* BEGIN Interaction Events */

        // Establishes browser events on the navbar
        events: {
            "click #globalnav-state-button"             : "toggleHiddenState"
        },

        toggleHiddenState: function() {
            if (this.model.isHidden())
                this.model.show();
            else
                this.model.hide();
        }

        /* END Interaction Events */
    });
})(ender);