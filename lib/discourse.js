var sso = require('./sso')
var discourse_sso = require('discourse-sso')
var discourse = new discourse_sso(sso.conf.strategies.discourse.secret)
var Common = require(global.__commonModule)
var u = Common.conf.user

process.setMaxListeners(0);

sso.register({
  name: 'Discourse',
  serviceName: 'OpenMRS Talk',
  id: 'discourse',

  validator: function(req, user) {

    var payload = req.param('sso')
    ,   sig = req.param('sig')

    if (discourse.validate(payload, sig)) {
      var nonce = discourse.getNonce(payload)

      var userparams = {
        "nonce": nonce,
        "external_id": user.username,
        "email": user.primaryEmail,
        "username": user.username,
        "name": user.displayName,
      }

      var queryString = discourse.buildLoginString(userparams)

      return sso.conf.strategies.discourse.returnURL.replace('{{QUERY}}',
        queryString)


    } else {
      return false
    }


  }
})
