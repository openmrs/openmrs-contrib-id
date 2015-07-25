'use strict';
var sso = require('./sso');
var Desk = require('./desk-multipass');
var conf = sso.conf.strategies.deskcom;
var duration = conf.maxMinute*60*1000;
var desk = Desk.createDesk(conf.siteKey, conf.apiKey);

exports = module.exports = function (app) {


sso.register(app, {
  name: 'Deskcom',
  serviceName: 'OpenMRS Help Desk',
  id: 'deskcom',

  validator: function(req, user) {
    var expires = new Date();
    expires.setTime(expires.getTime() + duration);

    var ret;
    desk.uid(user.username)
      .expires(expires)
      .customer_email(user.primaryEmail)
      .customer_name(user.displayName)
      .end(function (err, multipass, signature) {
        if (err) {
          return ;
        }
        ret = conf.returnURL.replace('{{MULTIPASS}}', multipass)
          .replace('{{SIGNATURE}}', signature);
      });
    return ret || false;
  }
});


};
