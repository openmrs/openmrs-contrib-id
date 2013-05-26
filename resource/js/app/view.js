define(["jquery", "underscore", "app/model"], function($, _, Model) {
    return {
        $element: null,

        initialize: function() {

            // Sets the context ("this") of all methods to reference the module itself.
            // This allows callback functions, etc. to still be able to reference this
            // module and its properties.
            _.bindAll(this);

            this.render();
            this.bindEvents();
        },

        render: function() {
            if ($("#globalnav").length > 0) {
                $("#globalnav").remove();
            }

            // Parse links HTML and insert it to the document.
            this.$element = $.parseHTML(Model.linksHTML);
            // console.log()
            $("body").prepend(this.$element);
            console.log(this);
        },

        // Establishes browser events with the navbar
        bindEvents: function() {
            this.$element.children("#globalnav-hide").click(this.clickHide);
        },

        clickHide: function(event) {
            console.log("HIDE");
            var hidden = Model.toggleHide();

            // Change the navbar's class (a state class) and the text of the hidden-
            // ness button.
            if (hidden) {
                this.$element.addClass("navbar-hidden");
                this.$element.children("#globalnav-hide").html("[show]");
            }
            else {
                this.$element.removeClass("navbar-hidden");
                this.$element.children("#globalnav-hide").html("[hide]");
            }
        }
    };
});