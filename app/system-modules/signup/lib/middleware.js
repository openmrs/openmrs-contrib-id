var signupConf = require('../conf.signup.json')

module.exports = {

  // If an expected field isn't submitted, give it a value of an empty string.
  // This is useful because with the empty string, the submission error will
  // be caught by validation middleware.
  includeEmpties: function includeEmpties(req, res, next) {
    signupConf.signupFieldNames.forEach(function(n) {
      req.body[n] = req.body[n] || ''
    })


    next()
  }

}