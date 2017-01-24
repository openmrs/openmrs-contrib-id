'use strict';
const log = require('log4js').addLogger('express');
const uuid = require('node-uuid');

// Errors
exports = module.exports = (err, req, res, next) => {
	const trackId = uuid.v4();
	log.error(`ID: ${trackId}`);
	log.error(`Caught error: ${err.name}`);
	log.error(err.message);
	log.error(err.stack);
	if (!res.headersSent) {
		// ONLY try to send an error response if the response is still being
		// formed. Otherwise, we'd be stuck in an infinite loop.
		res.statusCode = 500;
		if (req.accepts('text/html')) {
			const locals = {
				trackId: trackId,
			};
			if ('development' === process.env.NODE_ENV) {
				locals.e = err;
			}
			res.render('views/500', locals);
		} else if (req.accepts('application/json')) {
			res.status(res.statusCode).json({
				trackId: trackId,
				error: err
			});
		} else {
			res.status(res.statusCode).send(`Error: ${err.message}\n\n${err.stack}`);
		}
	} else {
		// Silently fail and write to log
		log.warn('^^ Headers sent before error encountered');
	}
};