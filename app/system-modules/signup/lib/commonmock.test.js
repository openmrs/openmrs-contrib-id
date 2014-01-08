var _ = require('underscore')

module.exports = {
  app: {
    helpers: function(obj) {
      _.extend(this.helpers, obj)
    }
  },
  conf: require('../../../conf'),
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