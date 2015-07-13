/**
 * homopage for logged-in users
 */

// LOGIN-LOGOUT
exports = module.exports = function (req, res, next) {
  console.log('in main');
  if (!req.session.user) { // only shown to users logged in
    return next();
  }

  res.render('root');
};
