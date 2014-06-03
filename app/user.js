var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Common = require(global.__commonModule);
var conf = Common.conf;

var uidRegex = conf.user.usernameRegex;
var emailRegex = conf.email.validation.emailRegex;


function uidValidator(argument) {
  return true; // do something else maybe check the length.
}

function emailsValidator(emailList) {
  emailList.sort();
  for (var i = 1; i < emailList.length; i++) {
    if (emailList[i] === emailList[i - 1]) {
      return false;
    }
  }
  return true;
}

var userSchema = new Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    match: [uidRegex, 'Illegal username'],
    validate: uidValidator,
  }, // unique username

  firstName: {
    type: String,
    required: true,
  },

  lastName: {
    type: String,
    required: true,
  },

  displayName: {
    type: String,
  },

  primaryEmail: {
    type: String, // Used for notifications
    match: [emailRegex, 'Illegal Email address'],
    required: true,
  },

  displayEmail: {
    type: String, // Used for displaying
    match: [emailRegex, 'Illegal Email address'],
  },

  emailList: {
    type: [String], // All the users' Emails
    required: true,
    unique: true,
    // match: [emailRegex, 'Illegal Email address'],
    validate: emailsValidator,
  },

  password: {
    type: String, //hashed password
    required: true,
  },
  // something else
});

var User = mongoose.model('User', userSchema);

exports = module.exports = User;
