'use strict';
// 404's
exports = module.exports = (req, res, next) => {
  res.statusCode = 404;
  if (req.accepts('text/html')) {
    // send an HTML error page
    res.render('views/404');
  } else {
    res.end('The requested resource was not found.');
  }
};
