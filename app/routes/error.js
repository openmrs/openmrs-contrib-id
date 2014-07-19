var Common = require(global.__commonModule);
var app = Common.app;
var log = Common.logger.add('express');
// Errors
app.use(function(err, req, res, next) {
  log.error('Caught error: ' + err.name);
  if (!res.headersSent) {
    // ONLY try to send an error response if the response is still being
    // formed. Otherwise, we'd be stuck in an infinite loop.
    res.statusCode = err.statusCode || 500;
    if (req.accepts('text/html')) {
      res.render('error', {
        e: err
      });
    } else if (req.accepts('application/json')) {
      res.json({
        statusCode: res.statusCode,
        error: err
      }, {
        'Content-Type': 'application/json'
      });
    } else {
      res.send("Error: " + err.message + "\n\n" + err.stack, {
        'Content-Type': 'text/plain'
      });
    }
  } else {
    // Silently fail and write to log
    log.warn('^^ Headers sent before error encountered');
  }


});
