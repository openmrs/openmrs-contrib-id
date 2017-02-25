'use strict';
const sso = require('./sso');
const Atlas = require('./atlas-multipass');
const conf = sso.conf.strategies.atlas;
const duration = conf.expiry * 60 * 1000;
const atlas = Atlas.createAtlas(conf.siteKey, conf.apiKey);

exports = module.exports = app => {


    sso.register(app, {
        name: 'Atlas',
        serviceName: 'OpenMRS Atlas',
        id: 'atlas',

        validator: function(req, user) {
            const expires = new Date();
            expires.setTime(expires.getTime() + duration);

            let ret;
            atlas.uid(user.username)
                .expires(expires)
                .user_email(user.primaryEmail)
                .user_name(user.displayName)
                .end((err, multipass, signature) => {
                    if (err) {
                        return;
                    }
                    ret = conf.returnURL.replace('{{MULTIPASS}}', multipass).replace('{{SIGNATURE}}', signature);
                });
            return ret || false;
        }
    });


};