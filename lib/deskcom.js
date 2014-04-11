var sso = require('./sso'),
    Desk = require('./desk-multipass'),
    Common = require(global.__commonModule),
    u = Common.conf.user,
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
    desk.uid(user[u.username])
      .expires(expires)
      .customer_email(user[u.email])
      .customer_name(user[u.displayname])
      .end(function (err, multipass, signature) {
        if (err) {
          return ;
        }
        ret = conf.returnURL.replace('{{MULTIPASS}}',multipass).replace('{{SIGNATURE}}',signature);
      });
    return ret || false;
  }
})