define(["jquery", "app/resources", "app/cookie"], function($, Resources, Cookie) {
    return {
        linksHTML: null,

        initialize: function(callback) {
            // Get the links HTML data at start
            this.refreshLinksHTML(function() {
                if (callback) callback();
            });
        },

        refreshLinksHTML: function(callback) {
            $.get(Resources.resolvePath("/globalnav"), function(data) {
                console.log(this);
                this.linksHTML = data;
                return callback(data);
            });
        },

        // hiddenness
        isHidden: function() {
            if (Cookie.read("globalnav-hidden") === "true")
                return true;
            else
                return false;
        },

        setHidden: function(state) {
            Cookie.create("globalnav-hidden", state.toString());
        },

        toggleHidden: function() {
            if (this.isHidden())
                this.setHidden(false);
            else
                this.setHidden(true);
            return this.isHidden();
        }
    };
});