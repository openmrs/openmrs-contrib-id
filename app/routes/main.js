'use strict';
/**
 * homopage for logged-in users
 */

// LOGIN-LOGOUT
exports = module.exports = (req, res, next) => {
  if (!req.session.user) { // only shown to users logged in
    return next();
  }

  res.render('views/root');
};
