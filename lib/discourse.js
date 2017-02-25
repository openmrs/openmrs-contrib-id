'use strict';
const discourse_sso = require('discourse-sso');
const path = require('path');
const url = require('url');
const request = require('request');
const sso = require('./sso');
const User = require('../../../models/user');
const log = require('log4js').addLogger('discourse-sso');

const conf = sso.conf.strategies.discourse;
const discourse = new discourse_sso(conf.secret);

exports = module.exports = app => {


    const buildURL = (payload, sig, user) => {
        if (!discourse.validate(payload, sig)) {
            return false;
        }
        const nonce = discourse.getNonce(payload);

        const userparams = {
            'nonce': nonce,
            'external_id': user.username,
            'email': user.primaryEmail,
            'username': user.username,
            'name': user.displayName,
        };

        let ret = discourse.buildLoginString(userparams);
        ret = conf.returnURL.replace('{{QUERY}}', ret);
        return ret;
    };

    sso.register(app, {
        name: 'Discourse',
        serviceName: 'OpenMRS Talk',
        id: 'discourse',

        validator: function(req, user) {

            const payload = req.param('sso');
            const sig = req.param('sig');

            return buildURL(payload, sig, user);
        }
    });

    const syncUser = (user, callback) => {
        request({
            uri: conf.nonceURL,
            method: 'HEAD',
            followRedirect: false,
        }, (err, res) => {
            if (err) {
                return callback(err);
            }
            const obj = url.parse(res.headers.location, true);
            const query = obj.query;

            const payload = query.sso;
            const sig = query.sig;
            const ssoURL = buildURL(payload, sig, user);

            request.head(ssoURL, (err, res) => {
                if (err) {
                    return callback(err);
                }
                return callback(null, res.statusCode === 200);
            }).setMaxListeners(0);
        }).setMaxListeners(0);
    };

    // add post-save hook for synchronizing
    User.schema.post('save', user => {
        if (user.locked) {
            return;
        }
        log.info('start sync with Discourse');
        syncUser(user, (err, isOK) => {
            if (err) {
                return log.error(err);
            }
            if (isOK) {
                log.info('Successfully synced user', user.username);
            } else {
                log.error('Failed to sync user', user.username);
            }
        });
    });


};