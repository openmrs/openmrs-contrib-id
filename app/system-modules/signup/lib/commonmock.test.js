var _ = require('underscore')

module.exports = {
  app: {
    helpers: function(obj) {
      _.extend(this.helpers, obj)
    }
  },
  logger: {
    add: function() {
      return {
        trace: function() {},
        debug: function() {},
        info: function() {},
        warn: function() {},
        error: _.partial(console.log, '[error] ')
      }
    }
  }
}