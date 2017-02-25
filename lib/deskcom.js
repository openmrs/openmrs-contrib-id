'use strict';
const sso = require('./sso');
const Desk = require('./desk-multipass');
const conf = sso.conf.strategies.deskcom;
const duration = conf.expiry * 60 * 1000;
const desk = Desk.createDesk(conf.siteKey, conf.apiKey);

exports = module.exports = app => {


    sso.register(app, {
        name: 'Deskcom',
        serviceName: 'OpenMRS Help Desk',
        id: 'deskcom',

        validator: function(req, user) {
            const expires = new Date();
            expires.setTime(expires.getTime() + duration);

            let ret;
            desk.uid(user.username)
                .expires(expires)
                .customer_email(user.primaryEmail)
                .customer_name(user.displayName)
                .end((err, multipass, signature) => {
                    if (err) {
                        return;
                    }
                    ret = conf.returnURL.replace('{{MULTIPASS}}', multipass)
                        .replace('{{SIGNATURE}}', signature);
                });
            return ret || false;
        }
    });


};