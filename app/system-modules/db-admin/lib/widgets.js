var formage = require('formage');

var JsonWidget = module.exports.JsonWidget = formage.widgets.Widget.extend({
  init: function (options) {
    this._super(options);
    this.attrs.class.push('ace-editor');
  },
  render: function (res) {
    res.write('<div class="ace-editor">\n');
    this._super(res);
    res.write('</div>\n');
  }
});