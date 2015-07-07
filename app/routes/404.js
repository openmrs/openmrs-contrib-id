var app = require(global.__commonModule).app;
// 404's
app.use(function(req, res, next) {
  res.statusCode = 404;
  if (req.header('Accept') && req.header('Accept').indexOf('text/html') > -1) {
    // send an HTML error page
    res.render('views/404');
  } else {
    res.end('The requested resource was not found.');
  }
});
