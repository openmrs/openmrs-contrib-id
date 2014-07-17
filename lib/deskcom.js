var sso = require('./sso'),
    Desk = require('./desk-multipass'),
    Common = require(global.__commonModule),
    conf = sso.conf.strategies.deskcom,
    duration = conf.maxMinute*60*1000,
    desk = Desk.createDesk(conf.siteKey, conf.apiKey);

sso.register({
  name: 'Deskcom',
  serviceName: 'OpenMRS Help Desk',
  id: 'deskcom',

  validator: function(req, user) {
    var expires = new Date();
    expires.setTime(expires.getTime()+duration);

    var ret;
    desk.uid(user.username)
      .expires(expires)
      .customer_email(user.primaryEmail)
      .customer_name(user.displayName)
      .end(function (err, multipass, signature) {
        if (err) {
          return ;
        }
        ret = conf.returnURL.replace('{{MULTIPASS}}',multipass).replace('{{SIGNATURE}}',signature);
      });
    return ret || false;
  }
})
