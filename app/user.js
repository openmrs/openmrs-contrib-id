var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var conf = require('./conf');

var uidRegex = conf.user.usernameRegex;
var emailRegex = conf.email.validation.emailRegex;

// Just a placeholder
function uidValidator(argument) {
  return true; // do something else, maybe check the length.
}

// Ensure the email list is not empty and no duplicate
// Because mongo won't ensure all the members to be unique in one array
function emailsValidator(emailList) {
  if (!emailList.length) {
    return false;
  }

  var tmp = emailList.slice(); // make a copy, so we won't affect the original
  tmp.sort();

  var i;
  for (i = 1; i < tmp.length; i++) {
    if (!emailRegex.test(tmp[i])) {
      return false;
    }
  }
  for (i = 1; i < tmp.length; i++) {
    if (tmp[i] === tmp[i - 1]) {
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
  },

  lastName: {
    type: String,
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
