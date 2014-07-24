var async = require('async');
var q = require('q');
var Common = require(global.__commonModule);
var log = Common.logger.add('db-admin');
var formage = require('formage');
var utils = Common.utils;
var _ = require('lodash');

var FormageUser;
var User;

function syncFormageUser(user, callback) {

  return FormageUser.findOne({username: user.username}).exec()
  .then(function(formageUser) {

    return (formageUser)
      ? updatePassword(formageUser, user)
      : createFormageUser(user);

  })
  .then(function(formageUser) {

    var deferred = q.defer();

    if (formageUser.isModified()) {
      return formageUser.save(function(err, fu) {
        if (err) deferred.reject(err);
        else deferred.resolve(fu);
      });

    } else {
      deferred.resolve(formageUser);
    }

    return deferred.promise;

  })
  .then(function(formageUser) {

    log.debug('formage user ' + formageUser.username + ' saved');

    return (callback)
      ? callback(null, formageUser)
      : formageUser;

  }, onError);
}

function createFormageUser(user) {

  var fu = new FormageUser({
    username: user.username,
    passwordHash: user.password,
    is_superuser: true
  });

  updatePassword(fu, user);

  return fu;

}

function updatePassword(fu, user) {
  fu.passwordHash = user.password;
  return fu;
}

function onSave(user) {

  syncFormageUser(user);
}

function onError(err) {
  log.error(err);
  return err;
}

module.exports = function init(_FormageUser_, _User_) {

  FormageUser = _FormageUser_;
  User = _User_;

  User.schema.post('save', onSave);

  User.find({groups: 'dashboard-administrators'}).exec()
  .then(function(users) {

    log.debug('found', users.length, 'dashboard administrators');

    async.each(users, syncFormageUser, function() {
      log.info('Synced all dashboard admin users to Formage user models.');
    });

  }, onError);

};


// Override UserForm methods with our own
var salt = 'wherestheninja'; // same salt formage uses internally
formage.UserForm.encryptSync = _.partialRight(utils.getSSHA, salt);
formage.UserForm.compareSync = utils.checkSSHA;