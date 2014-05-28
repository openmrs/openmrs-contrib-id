var app = require(global.__commonModule).app;
// 404's
app.use(function(req, res, next) {
  if (req.header('Accept') && req.header('Accept').indexOf('text/html') > -1) {
    // send an HTML error page
    res.statusCode = 404;
    res.render('404');
  } else {
    res.statusCode = 404;
    res.end('The requested resource was not found.');
  }
});
