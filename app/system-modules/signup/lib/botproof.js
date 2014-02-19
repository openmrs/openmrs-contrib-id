var crypto = require('crypto')
,   Common = require(global.__commonModule)
,   app = Common.app
,   log = Common.logger.add('botproof')
,   signupConf = require('../conf.signup.json')
,   async = require('async')
,   _ = require('underscore')
,   dns = require('dns')
,   db = Common.db
;

db.define('IPWhitelist', {
    id: {type: db.INTEGER, primaryKey: true, autoIncrement: true},
    address: db.STRING
})

var SECRET = crypto.createHash('sha1').update(Math.random().toString())
             .digest('hex');

function ip(req) {
    var xf = req.header('X-Forwarded-For') || '';
    return xf
        ? xf.split(/ *, */)[0]
        : req.connection.remoteAddress;
}

function reverseIp(req) {
  var a = ip(req).split('.')
  a.reverse();
  return a.join('.')
}

function badRequest(next, optionalMessage) {
    var err = new Error(optionalMessage ||'Submitted form failed '+
        'anti-bot checking.');
    err.statusCode = 400;
    next(err);
}

function hashField(name, spin) {
    // Disguise a legitimate field name (like "firstname") with an
    // obfuscated hash name based on this request's spinner.

    var hash = crypto.createHash('md5');
    hash.update(name).update(spin).update(SECRET);
    log.trace('diguised field with name "'+name+'", spinner "'+spin+'"');
    return hash.digest('hex');
}

// Expose stuff.
app.helpers({
    disguise: hashField
})

module.exports = {
    // Every method in here is Connect middleware, and is used by chaining it to
    // the Express router. `botproof.generators` and `botproof.parsers` can also
    // be used to invoke all methods, as defined below.

    generateTimestamp: function generateTimestamp(req, res, next) {
        var timestamp = Date.now(),
            cipher = crypto.createCipher('aes192', SECRET)

        cipher.update(timestamp.toString())

        res.local('timestamp', cipher.final('hex'))
        next();
    },

    checkTimestamp: function checkTimestamp(req, res, next) {
        if (!req.body.timestamp) return badRequest(next);

        // Decipher
        var decipher = crypto.createDecipher('aes192', SECRET)

        decipher.update(req.body.timestamp, 'hex')
        var timestamp = decipher.final('utf8');


        var then = new Date(parseInt(timestamp, 10))
        ,   now = new Date(Date.now());

        // Throw out malformed timestamps
        if (isNaN(then.valueOf())) return badRequest(next);

        var diff = now - then
        ,   minimumTime = signupConf.requiredSubmitTimeSec * 1000;
        log.trace('submission time difference: '+diff);

        // Throw out a time in the future or too far in the past.
        if (diff < 0) {
            return badRequest(next, 'Submitted form received from a time in the'+
                ' future');
        } else if (diff > signupConf.signupFormMaxAgeHours *60*60*1000) {
            return badRequest(next, '')
        }

        // Delay the submission if it was completed too soon
        if (diff < minimumTime) {
            log.info('deferring submission received in '+diff+' ms from '+
                ip(req));
            return setTimeout(next, minimumTime - diff);
        }

        next();
    },

    generateSpinner: function generateSpinner(req, res, next) {
        // The spinner is a hash of the current time, the client's IP, and the
        // secret. It's a hidden field within the page.

        // Generate the spinner and attach it to the request.
        var timestamp = res.local('timestamp')
        ,   hash = crypto.createHash('md5')
        ;

        log.trace('generating spinner with timestamp "'+timestamp+'" for '+
            'ip address "'+ip(req)+'"');

        hash.update(timestamp.toString())
            .update(ip(req).toString())
            .update(SECRET);
        var spin = hash.digest('hex');

        res.local('spinner', spin);
        next();
    },

    unscrambleFields: function unscrambleFields(req, res, next) {
        // Parse through the body and unscramble any fields.

        // Fail the request if no spinner was passed
        if (!req.body.spinner) return badRequest(next);

        var expected = signupConf.signupFieldNames;
        expected.push(signupConf.honeypotFieldName); // also look for honeypot

        var spin = req.body.spinner
        ,   result = {}
        ;

        for (var i in expected) {
            // Determine the field's hash, and set its value on the unscrambled
            // side.
            var f = expected[i]
            ,   hashed = hashField(f, spin);

            if (req.body[hashed]) {
                result[f] = req.body[hashed] || '';
                log.trace('unscrambled field "'+f+'"='+req.body[hashed])
            }
        }

        // Patch the captcha challenge field over to our results. The field
        // "recaptcha_challenge_field" is inserted by JavaScript as Recaptcha
        // is loaded, so we are unable to hash it. Since this field is inserted
        // dynamically, it is still relatively bot-proof.
        var rcf = 'recaptcha_challenge_field';
        if (req.body[rcf]) result[rcf] = req.body[rcf];

        // Replace the body with the un-hashed results.
        req.body = result;

        next();
    },

    // Invalidate the request if the honeypot has been filled (presumably by a
    // bot). Honeypot field name is configured in conf.signup.js
    checkHoneypot: function checkHoneypot(req, res, next) {
        if (req.body[signupConf.honeypotFieldName])
            return badRequest(next);

        next();
    },

    spamListLookup: function spamListLookup(req, res, next) {
      var rev = reverseIp(req)
      ,   spams = signupConf.dnsSpamLists

      // check the address with each list
      async.map(Object.keys(spams), function (list, cb) {
        dns.lookup(rev + '.' + list, function(err, address) {
          if (err) {
            if (err.code === 'ENOTFOUND') cb(null, false) // address not on list
            else cb(err)

          } else if (_.contains(spams[list].returnCodes, address)) {
          // address IS on list and proper return code specified

            db.find('IPWhitelist', {address: ip(req)}, function(err, insts) {
                if (insts.length) // address is whitelisted
                    cb(null, false)
                else
                    cb(null, true)
            })

          } else {
            cb(null, false)
          }
        })

      }, function callback(err, results) {
        if (err) return next(err);

        if (_.contains(results, true)) { // if this address was indicated as spam
          log.info('IP address ' + ip(req) + ' flagged as spam')
          return badRequest(next, "Your IP address, "+ip(req)+", was "+
          "flagged as a spam address by our spam-blocking lists. Please open an "+
          "issue if you believe this is in error.");
        }

        next(); // not spam!
      })
    }
}

module.exports.SECRET = SECRET // used by testing


module.exports.generators = [
    module.exports.generateTimestamp,
    module.exports.generateSpinner
];

module.exports.parsers = [
    module.exports.unscrambleFields,
    module.exports.checkTimestamp,
    module.exports.checkHoneypot,
    module.exports.spamListLookup
];