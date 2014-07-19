
var Common = require(global.__commonModule);
var validate = Common.validate;

exports.validator = function (req, res, next) {
  // aliases
  var body = req.body;
  var newPwd = body.newPassword;
  var confirmPwd = body.confirmPassword;
  var validators = {
    newPassword: validate.chkLength.bind(null, newPwd, 8),
    confirmPassword: validate.chkDiff.bind(null, newPwd, confirmPwd),
  };
  validate.perform(validators, req, res, next);
};
