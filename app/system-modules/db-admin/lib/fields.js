var formage = require('formage');
var widgets = require('./widgets');

var JsonField = module.exports.JsonField = formage.fields.StringField.extend({
  init: function (options) {
    options = options || {};
    options.widget = widgets.JsonWidget;
    this._super(options);
  },
  clean_value: function (req, callback) {
    this.value = JSON.parse(this.value);
    this.value = JSON.stringify(this.value);
    this._super(req, callback);
  }
});

