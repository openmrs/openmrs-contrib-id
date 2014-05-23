var Common = require(global.__commonModule);
var conf = Common.conf;
var ldap = Common.ldap;
var mid = Common.mid;
var log = Common.logger.add('express');
var verification = Common.verification;

var app = Common.app;

app.get('/profile-email/:id', function(req, res, next) {
  // check for valid profile-email verification ID
  verification.check(req.params.id, function(err, valid, locals) {
    if (valid) {
      req.flash('success', 'Email address verified. Thanks!');
    } else {
      req.flash('error', 'Profile email address verification not found.');
    }

    // push updates to LDAP
    ldap.getUser(locals.username, function(err, userobj) {
      if (err) {
        return next(err);
      }

      // get new address and the address it's replacing
      var newMail = locals.mail;
      var corrMail = locals.newToOld[newMail];

      // determine what kind of address (primary or sec.) it is & set it
      if (userobj[conf.user.email] === corrMail) {
        userobj[conf.user.email] = newMail; // prim. address
      } else { // address is secondary
        // user has some sec. addresses
        if (userobj[conf.user.secondaryemail].length > 0) {
          userobj[conf.user.secondaryemail].forEach(function(addr, i) {
            if (addr === corrMail) {
              userobj[conf.user.secondaryemail][i] = newMail;
            // replace an existing sec. email
            }
          });
          if (corrMail === '') {
            // add a new sec. email
            userobj[conf.user.secondaryemail].push(newMail);
          }
        } else {
          // no current sec. mails, create the first one
          userobj[conf.user.secondaryemail] = [newMail];
        }
      }

      ldap.updateUser(userobj, function(e, returnedUser) {
        if (e) {
          return next(e);
        }

        verification.clear(req.params.id);

        log.info(returnedUser.uid + ': profile-email validated & updated');
        req.session.user = returnedUser;

        // pass the updated email to renderer
        res.local('emailUpdated', locals.email);

        // redirect to profile page or homepage
        if (req.session.user) {
          res.redirect('/profile');
        } else {
          res.redirect('/');
        }
      });
    });
  });
});

app.get('/profile-email/resend/:actionId', mid.forceLogin,
  function(req, res, next) {

  // check for valid id
  verification.resend(req.params.actionId, function(err, email) {
    if (err) {
      return next(err);
    }
    req.flash('success', 'Email verification has been re-sent to "' +
      email + '".');
    res.redirect('/profile');
  });
});

app.get('/profile-email/cancel/:actionId', function(req, res, next) {
  verification.getByActionId(req.params.actionId, function(err, inst) {
    if (err) {
      return next(err);
    }

    var verifyId = inst.verifyId; // get verification ID
    verification.clear(verifyId, function(err) {
      if (err) {
        return next(err);
      }
      req.flash('success', 'Email verification for "' + inst.email +
        '" cancelled.');
      res.redirect('/profile');
    });
  });
});
