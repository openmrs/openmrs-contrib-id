var sso = require('./sso')
,   discourse_sso = require('discourse-sso')
,   discourse = new discourse_sso(sso.conf.strategies.discourse.secret)
,   Common = require(global.__commonModule)
,   u = Common.conf.user

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
        "external_id": user[u.username],
        "email": user[u.email],
        "username": user[u.username],
        "name": user[u.displayname],
      }

      var queryString = discourse.buildLoginString(userparams)

      return sso.conf.strategies.discourse.returnURL.replace('{{QUERY}}',
        queryString)


    } else {
      return false
    }


  }
})