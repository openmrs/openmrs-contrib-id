/**
 * This is the router for /profile. It displays a users profile,
 * and hanldes its editing.
 */

var Common = require(global.__commonModule);
var conf = Common.conf;
var ldap = Common.ldap;
var mid = Common.mid;
var log = Common.logger.add('express');
var validate = Common.validate;
var verification = Common.verification;

var app = Common.app;

app.get('/profile', mid.forceLogin, validate.receive(),
  function(req, res, next) {

  // check if any emails being verified

  var user = req.session.user;
  var username = user[conf.user.username];
  // var secondary = user[conf.user.secondaryemail] || [];
  // var emails = secondary.concat(user[conf.user.email]);

  verification.search(username, 'profile-email',
    function(err, instances) {

    if (err) {
      return next(err);
    }

    // loop through instances to set up each address under verification
    var fieldsInProgress = {};
    var newSecondary = {};
    instances.forEach(function(inst) {
      var thisProgress = {}; // contains data for this address

      // get email address pending change and the current address
      var newEmail = inst.email;
      var oldEmail = inst.locals.newToOld[newEmail];

      newSecondary = inst.locals.secondary;

//       if (oldEmail == '') oldEmail = ''; ?

      thisProgress.oldAddress = oldEmail;
      thisProgress.newAddress = newEmail;

      // set up links to cancel and resend verification
      thisProgress.id = inst.actionId;

      // push this verification data to the render variable
      fieldsInProgress[thisProgress.newAddress] = thisProgress;
    });

    var inProgress = (Object.keys(fieldsInProgress).length > 0);


    // render the page
    res.render('edit-profile', {
      progress: fieldsInProgress,
      inProgress: inProgress,
      newSecondary: newSecondary,
    });
  });
});

app.post('/profile', mid.forceLogin, mid.secToArray, validate(),
  function(req, res, next) {

  var updUser = req.session.user,
    body = req.body;

  // corresponds a new email address to the original value
  var newToOld = {};

  newToOld[body.email] = updUser[conf.user.email];
  for (var i = 0; i < body.secondaryemail.length; i++) {
    // add each new secondary address to the object
    newToOld[body.secondaryemail[i]] = (updUser[conf.user.secondaryemail][i]) ?
      updUser[conf.user.secondaryemail][i] : '';
  }

  // combine all email addresses & get the addresses that have changed
  var newSecondary = body.secondaryemail || [],
    oldSecondary = updUser[conf.user.secondaryemail] || [],
    newEmails = newSecondary.concat(body.email),
    oldEmails = oldSecondary.concat(updUser[conf.user.email]),
    emailsChanged = newEmails.filter(function(i) {
      return oldEmails.indexOf(i) === -1;
      // return !(oldEmails.indexOf(i) > -1);
    });

  if (emailsChanged.length > 0) {
    // begin verificaiton for each changed address
    emailsChanged.forEach(function(mail) {
      // verify these adresses
      log.debug(updUser[conf.user.username] + ': email address ' +
        mail + ' will be verified');

      // create verification instance
      verification.begin({
        urlBase: 'profile-email',
        email: mail,
        associatedId: updUser[conf.user.username],
        subject: '[OpenMRS] Email address verification',
        template: '../views/email/email-verify.ejs',
        locals: {
          displayName: updUser[conf.user.displayname],
          username: updUser[conf.user.username],
          mail: mail,
          newToOld: newToOld,
          secondary: body.secondaryemail
        }
      }, function(err) {
        if (err) {
          log.error(err);
        }
      });

    });
    // set flash messages
    if (emailsChanged.length === 1) {
      req.flash('info', 'The email address "' + emailsChanged.join(', ') +
        '" needs to be verified. ' +
        'Verification instructons have been sent to the address.');
    } else if (emailsChanged.length > 1) {
      req.flash('info', 'The email addresses "' + emailsChanged.join(', ') +
        '" need to be verified. ' +
        'Verification instructons have been sent to these addresses.');
    }

    // don't push new email addresses into session
    // updUser[conf.user.email] = updUser[conf.user.email]; ?
    // updUser[conf.user.secondaryemail] = updUser[conf.user.secondaryemail]; ?
  } else { // copy email addresses into session
    updUser[conf.user.email] = body.email;

    // force secondary email to be stored an array
    if (body.secondaryemail) {
      updUser[conf.user.secondaryemail] =
      (typeof body.secondaryemail === 'object') ? body.secondaryemail :
        [body.secondaryemail];
    } else {
      updUser[conf.user.secondaryemail] = [];
    }
  }

  // copy other changes into user session
  var isOtherUpdted = ((updUser[conf.user.firstname] !== body.firstname) ||
    (updUser[conf.user.lastname] !== body.lastname));
  if (isOtherUpdted) {
    updUser[conf.user.displayname] = body.firstname + ' ' + body.lastname;
    updUser[conf.user.firstname] = body.firstname;
    updUser[conf.user.lastname] = body.lastname;
  }

  // add any extra objectclasses
  // for secondaryMail support
  if (updUser.objectClass.indexOf('extensibleObject') < 0) {
    if (typeof updUser.objectClass === 'string') {
      updUser.objectClass = [updUser.objectClass];
    }
    updUser.objectClass.push('extensibleObject');
  }

  // push updates to LDAP
  ldap.updateUser(updUser, function(e, returnedUser) {
    log.trace('user update returned');
    if (e) {
      log.trace(e);
      return next(e);
    } else {
      log.trace('user update no errors');
    }
    log.info(returnedUser.uid + ': profile updated');
    req.session.user = returnedUser;

    if (emailsChanged.length === 0) {
      // only show message if verification is NOT happening
      req.flash('success', 'Profile updated.');
    }
    res.redirect('/');
  });

});
