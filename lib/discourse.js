var discourse_sso = require('discourse-sso');
var path = require('path');
var url = require('url');
var request = require('request');
var sso = require('./sso');
var User = require(path.join(global.__apppath, 'model/user'));
var log = require(path.join(global.__apppath, 'logger')).add('discourse-sso');

var conf = sso.conf.strategies.discourse;
var discourse = new discourse_sso(conf.secret);


var buildURL = function (payload, sig, user) {
  if (!discourse.validate(payload, sig)) {
    return false;
  }
  var nonce = discourse.getNonce(payload);

  var userparams = {
    'nonce': nonce,
    'external_id': user.username,
    'email': user.primaryEmail,
    'username': user.username,
    'name': user.displayName,
  };

  var ret = discourse.buildLoginString(userparams);
  ret = conf.returnURL.replace('{{QUERY}}', ret);
  return ret;
};

sso.register({
  name: 'Discourse',
  serviceName: 'OpenMRS Talk',
  id: 'discourse',

  validator: function(req, user) {

    var payload = req.param('sso');
    var sig = req.param('sig');

    return buildURL(payload, sig, user);
  }
});

var syncUser = function (user, callback) {
  request({
    uri: conf.nonceURL,
    method: 'HEAD',
    followRedirect: false,
  }, function (err, res) {
    if (err) {
      return callback(err);
    }
    var obj = url.parse(res.headers.location, true);
    var query = obj.query;

    var payload = query.sso;
    var sig = query.sig;
    var ssoURL = buildURL(payload, sig, user);

    request.head(ssoURL, function (err, res) {
      if (err) {
        return callback(err);
      }
      return callback(null, res.statusCode === 200);
    }).setMaxListeners(0)
  }).setMaxListeners(0);
};

// add post-save hook for synchronizing
User.schema.post('save', function (user) {
  if (user.locked) {
    return;
  }
  log.info('start sync with Discourse');
  syncUser(user, function (err, isOK) {
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

exports.buildURL = buildURL;