var sso = require('./sso');
var Atlas = require('./atlas-multipass');
var conf = sso.conf.strategies.atlas;
var duration = conf.maxMinute*60*1000;
var atlas = Atlas.createAtlas(conf.siteKey, conf.apiKey);

sso.register({
  name: 'Atlas',
  serviceName: 'OpenMRS Atlas',
  id: 'atlas',

  validator: function(req, user) {
    var expires = new Date();
    expires.setTime(expires.getTime()+duration);

    var ret;
    atlas.uid(user.username)
      .expires(expires)
      .user_email(user.primaryEmail)
      .user_name(user.displayName)
      .end(function (err, multipass, signature) {
        if (err) {
          return ;
        }
        ret = conf.returnURL.replace('{{MULTIPASS}}',multipass).replace('{{SIGNATURE}}',signature);
      });
    return ret || false;
  }
})
